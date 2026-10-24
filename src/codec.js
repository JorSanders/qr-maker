const BLOCKS = [
  [1, 26, 19],
  [1, 26, 16],
  [1, 26, 13],
  [1, 26, 9],
  [1, 44, 34],
  [1, 44, 28],
  [1, 44, 22],
  [1, 44, 16],
  [1, 70, 55],
  [1, 70, 44],
  [2, 35, 17],
  [2, 35, 13],
  [1, 100, 80],
  [2, 50, 32],
  [2, 50, 24],
  [4, 25, 9],
  [1, 134, 108],
  [2, 67, 43],
  [2, 33, 15, 2, 34, 16],
  [2, 33, 11, 2, 34, 12],
  [2, 86, 68],
  [4, 43, 27],
  [4, 43, 19],
  [4, 43, 15],
  [2, 98, 78],
  [4, 49, 31],
  [2, 32, 14, 4, 33, 15],
  [4, 39, 13, 1, 40, 14],
  [2, 121, 97],
  [2, 60, 38, 2, 61, 39],
  [4, 40, 18, 2, 41, 19],
  [4, 40, 14, 2, 41, 15],
  [2, 146, 116],
  [3, 58, 36, 2, 59, 37],
  [4, 36, 16, 4, 37, 17],
  [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69],
  [4, 69, 43, 1, 70, 44],
  [6, 43, 19, 2, 44, 20],
  [6, 43, 15, 2, 44, 16],
  [4, 101, 81],
  [1, 80, 50, 4, 81, 51],
  [4, 50, 22, 4, 51, 23],
  [3, 36, 12, 8, 37, 13],
  [2, 116, 92, 2, 117, 93],
  [6, 58, 36, 2, 59, 37],
  [4, 46, 20, 6, 47, 21],
  [7, 42, 14, 4, 43, 15],
  [4, 133, 107],
  [8, 59, 37, 1, 60, 38],
  [8, 44, 20, 4, 45, 21],
  [12, 33, 11, 4, 34, 12],
  [3, 145, 115, 1, 146, 116],
  [4, 64, 40, 5, 65, 41],
  [11, 36, 16, 5, 37, 17],
  [11, 36, 12, 5, 37, 13],
  [5, 109, 87, 1, 110, 88],
  [5, 65, 41, 5, 66, 42],
  [5, 54, 24, 7, 55, 25],
  [11, 36, 12, 7, 37, 13],
  [5, 122, 98, 1, 123, 99],
  [7, 73, 45, 3, 74, 46],
  [15, 43, 19, 2, 44, 20],
  [3, 45, 15, 13, 46, 16],
  [1, 135, 107, 5, 136, 108],
  [10, 74, 46, 1, 75, 47],
  [1, 50, 22, 15, 51, 23],
  [2, 42, 14, 17, 43, 15],
  [5, 150, 120, 1, 151, 121],
  [9, 69, 43, 4, 70, 44],
  [17, 50, 22, 1, 51, 23],
  [2, 42, 14, 19, 43, 15],
  [3, 141, 113, 4, 142, 114],
  [3, 70, 44, 11, 71, 45],
  [17, 47, 21, 4, 48, 22],
  [9, 39, 13, 16, 40, 14],
  [3, 135, 107, 5, 136, 108],
  [3, 67, 41, 13, 68, 42],
  [15, 54, 24, 5, 55, 25],
  [15, 43, 15, 10, 44, 16],
  [4, 144, 116, 4, 145, 117],
  [17, 68, 42],
  [17, 50, 22, 6, 51, 23],
  [19, 46, 16, 6, 47, 17],
  [2, 139, 111, 7, 140, 112],
  [17, 74, 46],
  [7, 54, 24, 16, 55, 25],
  [34, 37, 13],
  [4, 151, 121, 5, 152, 122],
  [4, 75, 47, 14, 76, 48],
  [11, 54, 24, 14, 55, 25],
  [16, 45, 15, 14, 46, 16],
  [6, 147, 117, 4, 148, 118],
  [6, 73, 45, 14, 74, 46],
  [11, 54, 24, 16, 55, 25],
  [30, 46, 16, 2, 47, 17],
  [8, 132, 106, 4, 133, 107],
  [8, 75, 47, 13, 76, 48],
  [7, 54, 24, 22, 55, 25],
  [22, 45, 15, 13, 46, 16],
  [10, 142, 114, 2, 143, 115],
  [19, 74, 46, 4, 75, 47],
  [28, 50, 22, 6, 51, 23],
  [33, 46, 16, 4, 47, 17],
  [8, 152, 122, 4, 153, 123],
  [22, 73, 45, 3, 74, 46],
  [8, 53, 23, 26, 54, 24],
  [12, 45, 15, 28, 46, 16],
  [3, 147, 117, 10, 148, 118],
  [3, 73, 45, 23, 74, 46],
  [4, 54, 24, 31, 55, 25],
  [11, 45, 15, 31, 46, 16],
  [7, 146, 116, 7, 147, 117],
  [21, 73, 45, 7, 74, 46],
  [1, 53, 23, 37, 54, 24],
  [19, 45, 15, 26, 46, 16],
  [5, 145, 115, 10, 146, 116],
  [19, 75, 47, 10, 76, 48],
  [15, 54, 24, 25, 55, 25],
  [23, 45, 15, 25, 46, 16],
  [13, 145, 115, 3, 146, 116],
  [2, 74, 46, 29, 75, 47],
  [42, 54, 24, 1, 55, 25],
  [23, 45, 15, 28, 46, 16],
  [17, 145, 115],
  [10, 74, 46, 23, 75, 47],
  [10, 54, 24, 35, 55, 25],
  [19, 45, 15, 35, 46, 16],
  [17, 145, 115, 1, 146, 116],
  [14, 74, 46, 21, 75, 47],
  [29, 54, 24, 19, 55, 25],
  [11, 45, 15, 46, 46, 16],
  [13, 145, 115, 6, 146, 116],
  [14, 74, 46, 23, 75, 47],
  [44, 54, 24, 7, 55, 25],
  [59, 46, 16, 1, 47, 17],
  [12, 151, 121, 7, 152, 122],
  [12, 75, 47, 26, 76, 48],
  [39, 54, 24, 14, 55, 25],
  [22, 45, 15, 41, 46, 16],
  [6, 151, 121, 14, 152, 122],
  [6, 75, 47, 34, 76, 48],
  [46, 54, 24, 10, 55, 25],
  [2, 45, 15, 64, 46, 16],
  [17, 152, 122, 4, 153, 123],
  [29, 74, 46, 14, 75, 47],
  [49, 54, 24, 10, 55, 25],
  [24, 45, 15, 46, 46, 16],
  [4, 152, 122, 18, 153, 123],
  [13, 74, 46, 32, 75, 47],
  [48, 54, 24, 14, 55, 25],
  [42, 45, 15, 32, 46, 16],
  [20, 147, 117, 4, 148, 118],
  [40, 75, 47, 7, 76, 48],
  [43, 54, 24, 22, 55, 25],
  [10, 45, 15, 67, 46, 16],
  [19, 148, 118, 6, 149, 119],
  [18, 75, 47, 31, 76, 48],
  [34, 54, 24, 34, 55, 25],
  [20, 45, 15, 61, 46, 16]
];
const ECC_INDEX = { L: 0, M: 1, Q: 2, H: 3 };
const FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };
const layouts = /* @__PURE__ */ new Map();
function layoutFor(version, ecc) {
  const cached = layouts.get(version + ecc);
  if (cached) return cached;
  const size = version * 4 + 17;
  const func = new Uint8Array(size * size);
  const base = new Uint8Array(size * size);
  const set = (x, y, dark) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    func[y * size + x] = 1;
    base[y * size + x] = dark ? 1 : 0;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const align = alignmentPositions(version);
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      const last = align.length - 1;
      if (i === 0 && j === 0 || i === 0 && j === last || i === last && j === 0) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }
  for (const [x, y] of formatCells(size)) set(x, y, false);
  set(8, size - 8, true);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = rem << 1 ^ (rem >>> 11) * 7973;
    const bits = version << 12 | rem;
    for (let i = 0; i < 18; i++) {
      const bit = (bits >>> i & 1) === 1;
      const a = size - 11 + i % 3;
      const b = Math.floor(i / 3);
      set(a, b, bit);
      set(b, a, bit);
    }
  }
  const positionList = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = (right + 1 & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!func[y * size + x]) positionList.push(y * size + x);
      }
    }
  }
  const row = BLOCKS[(version - 1) * 4 + ECC_INDEX[ecc]];
  const blockData = [];
  for (let g = 0; g < row.length; g += 3) {
    for (let k = 0; k < row[g]; k++) blockData.push(row[g + 2]);
  }
  const ecLen = row[1] - row[2];
  const maxLen = Math.max(...blockData);
  const placementOfData = blockData.map(() => []);
  const placementOfEc = blockData.map(() => []);
  const blocks = [];
  let p = 0;
  for (let i = 0; i < maxLen; i++) {
    for (let b = 0; b < blockData.length; b++) {
      if (i < blockData[b]) {
        placementOfData[b][i] = p++;
        blocks.push(b);
      }
    }
  }
  for (let j = 0; j < ecLen; j++) {
    for (let b = 0; b < blockData.length; b++) {
      placementOfEc[b][j] = p++;
      blocks.push(b);
    }
  }
  const layout = {
    version,
    ecc,
    size,
    func,
    base,
    positions: Int32Array.from(positionList),
    ecLen,
    blockData,
    dataCodewords: blockData.reduce((a, b) => a + b, 0),
    totalCodewords: p,
    placementOfData,
    placementOfEc,
    codewordBlock: Int32Array.from(blocks)
  };
  layouts.set(version + ecc, layout);
  return layout;
}
function alignmentPositions(version) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}
function formatCells(size) {
  const out = [];
  for (let i = 0; i <= 5; i++) out.push([8, i, i]);
  out.push([8, 7, 6], [8, 8, 7], [7, 8, 8]);
  for (let i = 9; i < 15; i++) out.push([14 - i, 8, i]);
  for (let i = 0; i < 8; i++) out.push([size - 1 - i, 8, i]);
  for (let i = 8; i < 15; i++) out.push([8, size - 15 + i, i]);
  return out;
}
function formatBits(ecc, mask) {
  const data = FORMAT_BITS[ecc] << 3 | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = rem << 1 ^ (rem >>> 9) * 1335;
  return (data << 10 | rem) ^ 21522;
}
function maskBit(mask, x, y) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0 ? 1 : 0;
    case 1:
      return y % 2 === 0 ? 1 : 0;
    case 2:
      return x % 3 === 0 ? 1 : 0;
    case 3:
      return (x + y) % 3 === 0 ? 1 : 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0 ? 1 : 0;
    case 5:
      return x * y % 2 + x * y % 3 === 0 ? 1 : 0;
    case 6:
      return (x * y % 2 + x * y % 3) % 2 === 0 ? 1 : 0;
    default:
      return ((x + y) % 2 + x * y % 3) % 2 === 0 ? 1 : 0;
  }
}
function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = z << 1 ^ (z >>> 7) * 285;
    z ^= (y >>> i & 1) * x;
  }
  return z;
}
const divisors = /* @__PURE__ */ new Map();
function rsDivisor(degree) {
  const cached = divisors.get(degree);
  if (cached) return cached;
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  divisors.set(degree, result);
  return result;
}
function rsRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}
function charCountBits(version) {
  return version < 10 ? 8 : 16;
}
const ECI_MODE = 7;
const ECI_UTF8 = 26;
const ECI_BITS = 12;
function bitsNeeded(version, byteLength, eci = false) {
  return (eci ? ECI_BITS : 0) + 4 + charCountBits(version) + byteLength * 8;
}
function minVersion(byteLength, ecc, eci = false) {
  for (let v = 1; v <= 40; v++) {
    if (bitsNeeded(v, byteLength, eci) <= layoutFor(v, ecc).dataCodewords * 8) return v;
  }
  return null;
}
function penalty(cells, size) {
  let result = 0;
  const at = (x, y) => cells[y * size + x];
  for (let y = 0; y < size; y++) {
    let runX = 0;
    let runY = 0;
    for (let x = 0; x < size; x++) {
      runX = x > 0 && at(x, y) === at(x - 1, y) ? runX + 1 : 1;
      runY = x > 0 && at(y, x) === at(y, x - 1) ? runY + 1 : 1;
      if (runX === 5) result += 3;
      else if (runX > 5) result += 1;
      if (runY === 5) result += 3;
      else if (runY > 5) result += 1;
      if (x > 0 && y > 0) {
        const v = at(x, y);
        if (v === at(x - 1, y) && v === at(x, y - 1) && v === at(x - 1, y - 1)) result += 3;
      }
    }
  }
  const finderLike = (line) => {
    let hits = 0;
    for (let i = 0; i + 11 <= size; i++) {
      let bits = 0;
      for (let k = 0; k < 11; k++) bits = bits << 1 | line(i + k);
      if (bits === 1488 || bits === 93) hits++;
    }
    return hits;
  };
  for (let i = 0; i < size; i++) {
    result += 40 * finderLike((k) => at(k, i));
    result += 40 * finderLike((k) => at(i, k));
  }
  let dark = 0;
  for (const c of cells) dark += c;
  const total = size * size;
  result += 10 * (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1);
  return result;
}
const PAD_BYTES = [236, 17];
function encodeToTarget(layout, bytes, target, safety, { mask: fixedMask = null, padding = "zeros", eci = false } = {}) {
  const { size, func, base, positions, ecLen, blockData, dataCodewords } = layout;
  const totalBits = dataCodewords * 8;
  const used = bitsNeeded(layout.version, bytes.length, eci);
  if (used > totalBits) return null;
  const fixed = new Uint8Array(totalBits);
  let cursor = 0;
  const put = (value, count) => {
    for (let i = count - 1; i >= 0; i--) fixed[cursor++] = value >>> i & 1;
  };
  if (eci) {
    put(ECI_MODE, 4);
    put(ECI_UTF8, 8);
  }
  put(4, 4);
  put(bytes.length, charCountBits(layout.version));
  for (const b of bytes) put(b, 8);
  const freeStart = Math.min(used + 4, totalBits);
  if (padding === "spec") {
    cursor = Math.ceil(freeStart / 8) * 8;
    for (let pad = 0; cursor < totalBits; pad++) put(PAD_BYTES[pad % 2], 8);
  }
  const streamToPlacement = [];
  for (let b = 0; b < blockData.length; b++) {
    for (let i = 0; i < blockData[b]; i++) streamToPlacement.push(layout.placementOfData[b][i]);
  }
  let painted = 0;
  for (let m = 0; m < size * size; m++) if (target[m] && !func[m]) painted++;
  let best = null;
  let bestScore = Infinity;
  const capacity = Math.max(0, Math.floor(ecLen / 2) - safety);
  const hasTarget = target.some((v) => v !== 0);
  const masks = fixedMask === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [fixedMask];
  for (const mask of masks) {
    const bits = fixed.slice();
    for (let f = freeStart; f < totalBits; f++) {
      const p = streamToPlacement[f >> 3];
      const m = positions[p * 8 + (f & 7)];
      const want = target[m];
      if (!want) continue;
      bits[f] = (want === 1 ? 1 : 0) ^ maskBit(mask, m % size, Math.floor(m / size));
    }
    const codewords = new Uint8Array(layout.totalCodewords);
    let offset = 0;
    const divisor = rsDivisor(ecLen);
    for (let b = 0; b < blockData.length; b++) {
      const data = new Uint8Array(blockData[b]);
      for (let i = 0; i < blockData[b]; i++) {
        let v = 0;
        for (let k = 0; k < 8; k++) v = v << 1 | bits[offset + i * 8 + k];
        data[i] = v;
        codewords[layout.placementOfData[b][i]] = v;
      }
      offset += blockData[b] * 8;
      const ec = rsRemainder(data, divisor);
      for (let j = 0; j < ecLen; j++) codewords[layout.placementOfEc[b][j]] = ec[j];
    }
    const cells = base.slice();
    const fmt = formatBits(layout.ecc, mask);
    for (const [x, y, bit] of formatCells(size)) cells[y * size + x] = fmt >>> bit & 1;
    for (let i = 0; i < positions.length; i++) {
      const m = positions[i];
      const p = i >> 3;
      const bit = p < codewords.length ? codewords[p] >>> 7 - (i & 7) & 1 : 0;
      cells[m] = bit ^ maskBit(mask, m % size, Math.floor(m / size));
    }
    const mismatches = /* @__PURE__ */ new Map();
    for (let i = 0; i < positions.length; i++) {
      const m = positions[i];
      const want = target[m];
      if (!want) continue;
      if (cells[m] !== (want === 1 ? 1 : 0)) {
        const p = i >> 3;
        if (p >= codewords.length) continue;
        const list = mismatches.get(p) ?? [];
        list.push(m);
        mismatches.set(p, list);
      }
    }
    const perBlock = blockData.map(() => []);
    for (const [p, list] of mismatches) perBlock[layout.codewordBlock[p]].push([p, list]);
    let unmet = 0;
    const flipped = [];
    for (const entries of perBlock) {
      entries.sort((a, b) => b[1].length - a[1].length);
      entries.forEach(([, list], index) => {
        if (index < capacity) {
          for (const m of list) {
            cells[m] ^= 1;
            flipped.push(m);
          }
        } else {
          unmet += list.length;
        }
      });
    }
    const score = hasTarget ? unmet : penalty(cells, size);
    if (score < bestScore) {
      bestScore = score;
      best = { cells, mask, painted, unmet, codewords, flipped };
    }
  }
  return best;
}
export {
  alignmentPositions,
  bitsNeeded,
  charCountBits,
  encodeToTarget,
  formatBits,
  formatCells,
  layoutFor,
  maskBit,
  minVersion,
  penalty,
  rsDivisor,
  rsRemainder
};
