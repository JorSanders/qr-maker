import { encodeToTarget, layoutFor, minVersion } from './codec';
import { decodeMatrix, matrixFromCells, type Matrix } from './qr';

const DARK = 1;
const LIGHT = 2;

export interface PixelResult {
  matrix: Matrix;
  painted: number;
  unmet: number;
  safety: number;
}

export function pixelMinVersion(text: string): number | null {
  return minVersion(new TextEncoder().encode(text).length);
}

export function solvePixel(text: string, version: number, target: Uint8Array): PixelResult | null {
  const layout = layoutFor(version);
  const bytes = new TextEncoder().encode(text);
  let fallback: PixelResult | null = null;
  for (const safety of [2, 3, 4, 6, 8, 12]) {
    const encoded = encodeToTarget(layout, bytes, target, safety);
    if (!encoded) return null;
    const matrix = matrixFromCells(encoded.cells, version, 'H');
    const result = { matrix, painted: encoded.painted, unmet: encoded.unmet, safety };
    if (decodeMatrix(matrix) === text) return result;
    fallback = result;
  }
  return fallback;
}

const GLYPHS: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.####|#....|#....|#....|#....|#....|.####',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.####|#....|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '#####|..#..|..#..|..#..|..#..|..#..|#####',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#...#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '#####|...#.|..#..|...#.|....#|#...#|.###.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '-': '.....|.....|.....|#####|.....|.....|.....',
  '.': '.....|.....|.....|.....|.....|.##..|.##..',
  '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  ' ': '...|...|...|...|...|...|...',
};

export function stampText(
  target: Uint8Array,
  version: number,
  text: string,
  scale: number,
  halo: boolean,
): void {
  const { size, func } = layoutFor(version);
  const chars = [...text.toUpperCase()].filter((ch) => ch in GLYPHS);
  if (chars.length === 0) return;
  const rows = chars.map((ch) => GLYPHS[ch].split('|'));
  const width = rows.reduce((sum, glyph) => sum + glyph[0].length, 0) + (chars.length - 1);
  const height = 7;
  const x0 = Math.floor((size - width * scale) / 2);
  const y0 = Math.floor((size - height * scale) / 2);
  const paint = (x: number, y: number, value: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const index = y * size + x;
    if (!func[index]) target[index] = value;
  };

  if (halo) {
    const margin = scale;
    for (let y = y0 - margin; y < y0 + height * scale + margin; y++) {
      for (let x = x0 - margin; x < x0 + width * scale + margin; x++) paint(x, y, LIGHT);
    }
  }

  let cursor = x0;
  for (const glyph of rows) {
    for (let gy = 0; gy < height; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            paint(cursor + gx * scale + sx, y0 + gy * scale + sy, DARK);
          }
        }
      }
    }
    cursor += (glyph[0].length + 1) * scale;
  }
}
