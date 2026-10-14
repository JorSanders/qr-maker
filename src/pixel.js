import { encodeToTarget, layoutFor, minVersion } from "./codec.js";
import { decodeMatrix, matrixFromCells } from "./qr.js";
const DARK = 1;
const LIGHT = 2;
const FINDER_ROWS = 9;
const EDGE_MARGIN = 1;
function pixelTextBox(stamp, scale, halo) {
  const chars = [...stamp.toUpperCase()].filter((ch) => ch in GLYPHS);
  if (chars.length === 0) return { width: 0, height: 0 };
  const glyphWidth = chars.reduce((sum, ch) => sum + GLYPHS[ch].split("|")[0].length, 0) + (chars.length - 1);
  const margin = halo ? scale : 0;
  return { width: glyphWidth * scale + 2 * margin, height: 7 * scale + 2 * margin };
}
function textFitsVersion(box, version) {
  const size = version * 4 + 17;
  return box.width <= size - 2 * EDGE_MARGIN && box.height <= size - 2 * FINDER_ROWS;
}
function pixelMinVersion(text, stamp = "", scale = 1, halo = false) {
  const capacity = minVersion(new TextEncoder().encode(text).length, "H");
  if (capacity === null) return null;
  const box = pixelTextBox(stamp, scale, halo);
  for (let version = capacity; version <= 40; version++) {
    if (textFitsVersion(box, version)) return version;
  }
  return null;
}
function solvePixel(text, version, target) {
  const layout = layoutFor(version, "H");
  const bytes = new TextEncoder().encode(text);
  let fallback = null;
  for (const safety of [2, 3, 4, 6, 8, 12]) {
    const encoded = encodeToTarget(layout, bytes, target, safety);
    if (!encoded) return null;
    const matrix = matrixFromCells(encoded.cells, version, "H");
    const result = { matrix, painted: encoded.painted, unmet: encoded.unmet, safety };
    if (decodeMatrix(matrix) === text) return result;
    fallback = result;
  }
  return fallback;
}
const GLYPHS = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".####|#....|#....|#....|#....|#....|.####",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".####|#....|#....|#.###|#...#|#...#|.####",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "#####|..#..|..#..|..#..|..#..|..#..|#####",
  J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#...#|#...#|#...#|#...#",
  N: "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": "#####|...#.|..#..|...#.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": "..##.|.#...|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|...#.|.##..",
  "-": ".....|.....|.....|#####|.....|.....|.....",
  ".": ".....|.....|.....|.....|.....|.##..|.##..",
  "!": "..#..|..#..|..#..|..#..|..#..|.....|..#..",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
  " ": "...|...|...|...|...|...|..."
};
function stampText(target, version, text, scale, halo) {
  const { size, func } = layoutFor(version, "H");
  const chars = [...text.toUpperCase()].filter((ch) => ch in GLYPHS);
  if (chars.length === 0) return;
  const rows = chars.map((ch) => GLYPHS[ch].split("|"));
  const width = rows.reduce((sum, glyph) => sum + glyph[0].length, 0) + (chars.length - 1);
  const height = 7;
  const x0 = Math.floor((size - width * scale) / 2);
  const y0 = Math.floor((size - height * scale) / 2);
  const paint = (x, y, value) => {
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
        if (glyph[gy][gx] !== "#") continue;
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
export {
  pixelMinVersion,
  pixelTextBox,
  solvePixel,
  stampText,
  textFitsVersion
};
