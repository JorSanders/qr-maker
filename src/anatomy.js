import {
  alignmentPositions,
  charCountBits,
  formatBits,
  formatCells,
  layoutFor,
  maskBit,
  penalty
} from "./codec.js";

const FORMAT_XOR = 0b101010000010010;
const ECC_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };
const MASK_COUNT = 8;
const TERMINATOR_BITS = 4;
const ECI_MODE_BITS = "0111";

function bitString(value, length) {
  return value.toString(2).padStart(length, "0");
}

function messageSegments(dataBits, byteCount, version) {
  const segments = [];
  let cursor = 0;
  const take = (kind, length, value) => {
    const bits = dataBits.slice(cursor, cursor + length);
    cursor += length;
    if (bits.length > 0) segments.push({ kind, bits, value });
  };
  if (dataBits.startsWith(ECI_MODE_BITS)) {
    take("eci", 4);
    take("charset", 8, parseInt(dataBits.slice(cursor, cursor + 8), 2));
  }
  take("mode", 4);
  take("count", charCountBits(version), byteCount);
  for (let i = 0; i < byteCount; i++) take("byte", 8, parseInt(dataBits.slice(cursor, cursor + 8), 2));
  const messageBits = cursor;
  take("terminator", Math.min(TERMINATOR_BITS, dataBits.length - cursor));
  take("align", (8 - (cursor % 8)) % 8);
  while (cursor < dataBits.length) take("filler", 8, parseInt(dataBits.slice(cursor, cursor + 8), 2));
  return { segments, messageBits };
}

function versionInfoBits(version) {
  let remainder = version;
  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0b1111100100101);
  return (version << 12) | remainder;
}

function alignmentCells(version, size) {
  const centers = alignmentPositions(version);
  const cells = new Set();
  const last = centers.length - 1;
  centers.forEach((centerX, i) => {
    centers.forEach((centerY, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) cells.add((centerY + dy) * size + centerX + dx);
      }
    });
  });
  return cells;
}

function moduleRoles(layout, codewordKinds) {
  const { size, version, func, positions } = layout;
  const roles = new Array(size * size);
  const bitIndex = new Int16Array(size * size).fill(-1);
  const alignment = alignmentCells(version, size);
  const inFinderCorner = (x, y) => (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      if (!func[index]) continue;
      if (inFinderCorner(x, y)) roles[index] = "finder";
      else if (alignment.has(index)) roles[index] = "alignment";
      else roles[index] = "timing";
    }
  }
  for (const [x, y, bit] of formatCells(size)) {
    roles[y * size + x] = "format";
    bitIndex[y * size + x] = bit;
  }
  roles[(size - 8) * size + 8] = "dark";
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const across = size - 11 + (i % 3);
      const down = Math.floor(i / 3);
      for (const index of [down * size + across, across * size + down]) {
        roles[index] = "version";
        bitIndex[index] = i;
      }
    }
  }
  positions.forEach((index, position) => {
    const codeword = position >> 3;
    roles[index] = codeword < codewordKinds.length ? codewordKinds[codeword] : "remainder";
    bitIndex[index] = 7 - (position & 7);
  });
  return { roles, bitIndex };
}

// Explains a matrix built by the encoder. The matrix carries the codewords as they were
// before any pixel art flips, the mask and the modules that were flipped on purpose.
function explainQr(matrix, text) {
  const { version, ecc, size, mask, codewords, cells } = matrix;
  const layout = layoutFor(version, ecc);
  const { positions, blockData, ecLen, totalCodewords } = layout;
  const bytes = new TextEncoder().encode(text);

  const codewordSource = new Array(totalCodewords);
  const blocks = blockData.map((length, blockIndex) => {
    const data = new Uint8Array(length);
    const ec = new Uint8Array(ecLen);
    for (let index = 0; index < length; index++) {
      const placement = layout.placementOfData[blockIndex][index];
      data[index] = codewords[placement];
      codewordSource[placement] = { block: blockIndex, kind: "data", index };
    }
    for (let index = 0; index < ecLen; index++) {
      const placement = layout.placementOfEc[blockIndex][index];
      ec[index] = codewords[placement];
      codewordSource[placement] = { block: blockIndex, kind: "ec", index };
    }
    return { data, ec };
  });
  const dataBits = blocks.map((block) => Array.from(block.data, (value) => bitString(value, 8)).join("")).join("");
  const { segments, messageBits } = messageSegments(dataBits, bytes.length, version);

  const unmaskedData = new Uint8Array(size * size);
  positions.forEach((index, position) => {
    const codeword = position >> 3;
    unmaskedData[index] = codeword < totalCodewords ? (codewords[codeword] >>> (7 - (position & 7))) & 1 : 0;
  });
  const withMask = (candidate) => {
    const masked = layout.base.slice();
    const format = formatBits(ecc, candidate);
    for (const [x, y, bit] of formatCells(size)) masked[y * size + x] = (format >>> bit) & 1;
    for (const index of positions) {
      masked[index] = unmaskedData[index] ^ maskBit(candidate, index % size, Math.floor(index / size));
    }
    return masked;
  };
  const penalties = [];
  for (let candidate = 0; candidate < MASK_COUNT; candidate++) penalties.push(penalty(withMask(candidate), size));

  const flippedByMask = new Uint8Array(size * size);
  const unmasked = cells.slice();
  for (const index of positions) {
    flippedByMask[index] = maskBit(mask, index % size, Math.floor(index / size));
    unmasked[index] ^= flippedByMask[index];
  }

  const codewordModules = [];
  for (let codeword = 0; codeword < totalCodewords; codeword++) {
    codewordModules.push(Array.from(positions.slice(codeword * 8, codeword * 8 + 8)));
  }
  const positionOf = new Int32Array(size * size).fill(-1);
  positions.forEach((index, position) => {
    positionOf[index] = position;
  });
  const { roles, bitIndex } = moduleRoles(
    layout,
    codewordSource.map((source) => source.kind)
  );
  const formatRaw = formatBits(ecc, mask) ^ FORMAT_XOR;

  return {
    text,
    bytes,
    version,
    ecc,
    size,
    mask,
    penalties,
    segments,
    messageBits,
    capacityBits: layout.dataCodewords * 8,
    blocks,
    ecLen,
    codewords,
    codewordSource,
    codewordModules,
    positions,
    positionOf,
    remainderBits: positions.length - totalCodewords * 8,
    cells,
    unmasked,
    flippedByMask,
    flippedOnPurpose: new Set(matrix.flipped),
    roles,
    bitIndex,
    format: {
      eccBits: bitString(ECC_BITS[ecc], 2),
      maskBits: bitString(mask, 3),
      bchBits: bitString(formatRaw & 0x3ff, 10),
      xorBits: bitString(FORMAT_XOR, 15),
      finalBits: bitString(formatBits(ecc, mask), 15)
    },
    versionInfo: version >= 7 ? { versionBits: bitString(version, 6), bchBits: bitString(versionInfoBits(version) & 0xfff, 12) } : null
  };
}

export { explainQr, MASK_COUNT };
