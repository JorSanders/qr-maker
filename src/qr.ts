import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';

export type Ecc = 'L' | 'M' | 'Q' | 'H';

export interface Matrix {
  size: number;
  version: number;
  ecc: Ecc;
  cells: Uint8Array;
  isDark: (row: number, col: number) => boolean;
}

export function matrixFromCells(cells: Uint8Array, version: number, ecc: Ecc): Matrix {
  const size = version * 4 + 17;
  return { size, version, ecc, cells, isDark: (row, col) => cells[row * size + col] === 1 };
}

export function buildMatrix(text: string, ecc: Ecc): Matrix {
  const qr = qrcode(0, ecc);
  qr.addData(text, 'Byte');
  qr.make();
  const size = qr.getModuleCount();
  const cells = new Uint8Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) cells[row * size + col] = qr.isDark(row, col) ? 1 : 0;
  }
  return matrixFromCells(cells, (size - 17) / 4, ecc);
}

export function isFinderZone(row: number, col: number, size: number, reach: number): boolean {
  return (
    (row < reach && col < reach) ||
    (row < reach && col >= size - reach) ||
    (row >= size - reach && col < reach)
  );
}

export function alignmentCenters(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const centers = [6];
  for (let i = 0, p = size - 7; i < count - 1; i++, p -= step) centers.splice(1, 0, p);
  const last = size - 7;
  const pairs: number[] = [];
  for (const r of centers) {
    for (const c of centers) {
      const onFinder = (r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6);
      if (!onFinder) pairs.push(r * size + c);
    }
  }
  return pairs;
}

export function decodeMatrix(matrix: Matrix): string | null {
  const scale = 4;
  const quiet = 4;
  const { size, cells } = matrix;
  const side = (size + quiet * 2) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!cells[row * size + col]) continue;
      for (let dy = 0; dy < scale; dy++) {
        const start = (((row + quiet) * scale + dy) * side + (col + quiet) * scale) * 4;
        for (let dx = 0; dx < scale; dx++) {
          data[start + dx * 4] = 0;
          data[start + dx * 4 + 1] = 0;
          data[start + dx * 4 + 2] = 0;
        }
      }
    }
  }
  return jsQR(data, side, side)?.data ?? null;
}
