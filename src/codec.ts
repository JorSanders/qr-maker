// Byte-mode QR encoder at level H that keeps track of which module carries which
// codeword bit. Pixel mode needs that to set the free padding bits to a target
// image and to spend the error-correction budget deliberately.

const H_BLOCKS = [
  [1, 26, 9], [1, 44, 16], [2, 35, 13], [4, 25, 9], [2, 33, 11, 2, 34, 12],
  [4, 43, 15], [4, 39, 13, 1, 40, 14], [4, 40, 14, 2, 41, 15], [4, 36, 12, 4, 37, 13],
  [6, 43, 15, 2, 44, 16], [3, 36, 12, 8, 37, 13], [7, 42, 14, 4, 43, 15],
  [12, 33, 11, 4, 34, 12], [11, 36, 12, 5, 37, 13], [11, 36, 12, 7, 37, 13],
  [3, 45, 15, 13, 46, 16], [2, 42, 14, 17, 43, 15], [2, 42, 14, 19, 43, 15],
  [9, 39, 13, 16, 40, 14], [15, 43, 15, 10, 44, 16], [19, 46, 16, 6, 47, 17],
  [34, 37, 13], [16, 45, 15, 14, 46, 16], [30, 46, 16, 2, 47, 17],
  [22, 45, 15, 13, 46, 16], [33, 46, 16, 4, 47, 17], [12, 45, 15, 28, 46, 16],
  [11, 45, 15, 31, 46, 16], [19, 45, 15, 26, 46, 16], [23, 45, 15, 25, 46, 16],
  [23, 45, 15, 28, 46, 16], [19, 45, 15, 35, 46, 16], [11, 45, 15, 46, 46, 16],
  [59, 46, 16, 1, 47, 17], [22, 45, 15, 41, 46, 16], [2, 45, 15, 64, 46, 16],
  [24, 45, 15, 46, 46, 16], [42, 45, 15, 32, 46, 16], [10, 45, 15, 67, 46, 16],
  [20, 45, 15, 61, 46, 16],
];

const FORMAT_BITS_H = 2;

export interface Layout {
  version: number;
  size: number;
  func: Uint8Array;
  base: Uint8Array;
  positions: Int32Array;
  ecLen: number;
  blockData: number[];
  dataCodewords: number;
  totalCodewords: number;
  placementOfData: number[][];
  placementOfEc: number[][];
  codewordBlock: Int32Array;
}

const layouts = new Map<number, Layout>();

export function layoutFor(version: number): Layout {
  const cached = layouts.get(version);
  if (cached) return cached;

  const size = version * 4 + 17;
  const func = new Uint8Array(size * size);
  const base = new Uint8Array(size * size);
  const set = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    func[y * size + x] = 1;
    base[y * size + x] = dark ? 1 : 0;
  };

  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
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
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
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
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit);
      set(b, a, bit);
    }
  }

  const positionList: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!func[y * size + x]) positionList.push(y * size + x);
      }
    }
  }

  const row = H_BLOCKS[version - 1];
  const blockData: number[] = [];
  for (let g = 0; g < row.length; g += 3) {
    for (let k = 0; k < row[g]; k++) blockData.push(row[g + 2]);
  }
  const ecLen = row[1] - row[2];
  const maxLen = Math.max(...blockData);
  const placementOfData = blockData.map(() => [] as number[]);
  const placementOfEc = blockData.map(() => [] as number[]);
  const blocks: number[] = [];
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

  const layout: Layout = {
    version,
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
    codewordBlock: Int32Array.from(blocks),
  };
  layouts.set(version, layout);
  return layout;
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}

function formatCells(size: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i <= 5; i++) out.push([8, i, i]);
  out.push([8, 7, 6], [8, 8, 7], [7, 8, 8]);
  for (let i = 9; i < 15; i++) out.push([14 - i, 8, i]);
  for (let i = 0; i < 8; i++) out.push([size - 1 - i, 8, i]);
  for (let i = 8; i < 15; i++) out.push([8, size - 15 + i, i]);
  return out;
}

function formatBits(mask: number): number {
  const data = (FORMAT_BITS_H << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function maskBit(mask: number, x: number, y: number): number {
  switch (mask) {
    case 0: return (x + y) % 2 === 0 ? 1 : 0;
    case 1: return y % 2 === 0 ? 1 : 0;
    case 2: return x % 3 === 0 ? 1 : 0;
    case 3: return (x + y) % 3 === 0 ? 1 : 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0 ? 1 : 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0 ? 1 : 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0 ? 1 : 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0 ? 1 : 0;
  }
}

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

const divisors = new Map<number, Uint8Array>();

function rsDivisor(degree: number): Uint8Array {
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

function rsRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

function charCountBits(version: number): number {
  return version < 10 ? 8 : 16;
}

export function bitsNeeded(version: number, byteLength: number): number {
  return 4 + charCountBits(version) + byteLength * 8;
}

export function minVersion(byteLength: number): number | null {
  for (let v = 1; v <= 40; v++) {
    if (bitsNeeded(v, byteLength) <= layoutFor(v).dataCodewords * 8) return v;
  }
  return null;
}

export interface Encoded {
  cells: Uint8Array;
  mask: number;
  painted: number;
  unmet: number;
}

// target: 0 = don't care, 1 = want dark, 2 = want light, indexed row * size + col.
export function encodeToTarget(
  layout: Layout,
  bytes: Uint8Array,
  target: Uint8Array,
  safety: number,
): Encoded | null {
  const { size, func, base, positions, ecLen, blockData, dataCodewords } = layout;
  const totalBits = dataCodewords * 8;
  const used = bitsNeeded(layout.version, bytes.length);
  if (used > totalBits) return null;

  const fixed = new Uint8Array(totalBits);
  let cursor = 0;
  const put = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) fixed[cursor++] = (value >>> i) & 1;
  };
  put(4, 4);
  put(bytes.length, charCountBits(layout.version));
  for (const b of bytes) put(b, 8);
  const freeStart = Math.min(used + 4, totalBits);

  const streamToPlacement: number[] = [];
  for (let b = 0; b < blockData.length; b++) {
    for (let i = 0; i < blockData[b]; i++) streamToPlacement.push(layout.placementOfData[b][i]);
  }

  let painted = 0;
  for (let m = 0; m < size * size; m++) if (target[m] && !func[m]) painted++;

  let best: Encoded | null = null;
  const capacity = Math.max(0, Math.floor(ecLen / 2) - safety);

  for (let mask = 0; mask < 8; mask++) {
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
        for (let k = 0; k < 8; k++) v = (v << 1) | bits[offset + i * 8 + k];
        data[i] = v;
        codewords[layout.placementOfData[b][i]] = v;
      }
      offset += blockData[b] * 8;
      const ec = rsRemainder(data, divisor);
      for (let j = 0; j < ecLen; j++) codewords[layout.placementOfEc[b][j]] = ec[j];
    }

    const cells = base.slice();
    const fmt = formatBits(mask);
    for (const [x, y, bit] of formatCells(size)) cells[y * size + x] = (fmt >>> bit) & 1;
    for (let i = 0; i < positions.length; i++) {
      const m = positions[i];
      const p = i >> 3;
      const bit = p < codewords.length ? (codewords[p] >>> (7 - (i & 7))) & 1 : 0;
      cells[m] = bit ^ maskBit(mask, m % size, Math.floor(m / size));
    }

    const mismatches = new Map<number, number[]>();
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

    const perBlock = blockData.map(() => [] as [number, number[]][]);
    for (const [p, list] of mismatches) perBlock[layout.codewordBlock[p]].push([p, list]);
    let unmet = 0;
    for (const entries of perBlock) {
      entries.sort((a, b) => b[1].length - a[1].length);
      entries.forEach(([, list], index) => {
        if (index < capacity) {
          for (const m of list) cells[m] ^= 1;
        } else {
          unmet += list.length;
        }
      });
    }

    if (!best || unmet < best.unmet) best = { cells, mask, painted, unmet };
  }
  return best;
}
