const jsQR = globalThis.jsQR;

import { encodeToTarget, layoutFor, minVersion } from "./codec.js";
function matrixFromCells(cells, version, ecc) {
  const size = version * 4 + 17;
  return { size, version, ecc, cells, isDark: (row, col) => cells[row * size + col] === 1 };
}
function buildMatrix(text, ecc, version = 0) {
  const bytes = new TextEncoder().encode(text);
  const v = version || minVersion(bytes.length, ecc);
  if (v === null) throw new Error("Too much data");
  const layout = layoutFor(v, ecc);
  const encoded = encodeToTarget(layout, bytes, new Uint8Array(layout.size * layout.size), 0);
  if (!encoded) throw new Error("Too much data");
  return matrixFromCells(encoded.cells, v, ecc);
}
function isFinderZone(row, col, size, reach) {
  return row < reach && col < reach || row < reach && col >= size - reach || row >= size - reach && col < reach;
}
function alignmentCenters(version) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const centers = [6];
  for (let i = 0, p = size - 7; i < count - 1; i++, p -= step) centers.splice(1, 0, p);
  const last = size - 7;
  const pairs = [];
  for (const r of centers) {
    for (const c of centers) {
      const onFinder = r === 6 && c === 6 || r === 6 && c === last || r === last && c === 6;
      if (!onFinder) pairs.push(r * size + c);
    }
  }
  return pairs;
}
function decodeMatrix(matrix) {
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
export {
  alignmentCenters,
  buildMatrix,
  decodeMatrix,
  isFinderZone,
  matrixFromCells
};
