import { alignmentCenters, buildMatrix, decodeMatrix, isFinderZone } from "./qr.js";
const QUIET = 4;
const LOGO_MIN_FRACTION = 0.1;
const LOGO_MAX_FRACTION = 0.6;
const LOGO_MARGIN = 0.02;
function renderQr(options, prebuilt) {
  let note;
  let matrix = prebuilt;
  if (!matrix && options.mode === "logo") {
    const plan = logoPlan(options);
    matrix = buildMatrix(options.text, "H", plan.version);
    note = `logo ${Math.round(plan.fraction * 100)}% wide`;
  }
  matrix ??= buildMatrix(options.text, options.mode === "minimal" ? "L" : "H");
  const squaresOrDots = (m, o) => o.dots ? renderDots(m, o) : renderMinimal(m, o);
  const body = {
    minimal: squaresOrDots,
    logo: renderLogo,
    art: renderArt,
    pixel: squaresOrDots
  }[options.mode](matrix, options);
  return { svg: wrap(matrix.size, options.bg, body), matrix, note };
}
function wrap(size, bg, body) {
  const total = size + QUIET * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-QUIET} ${-QUIET} ${total} ${total}" width="${total * 10}" height="${total * 10}"><rect x="${-QUIET}" y="${-QUIET}" width="${total}" height="${total}" fill="${bg}"/>` + body + `</svg>`;
}
function runs(matrix, skip = () => false) {
  let d = "";
  for (let row = 0; row < matrix.size; row++) {
    let start = -1;
    for (let col = 0; col <= matrix.size; col++) {
      const dark = col < matrix.size && matrix.isDark(row, col) && !skip(row, col);
      if (dark && start < 0) start = col;
      if (!dark && start >= 0) {
        d += `M${start} ${row}h${col - start}v1h${start - col}z`;
        start = -1;
      }
    }
  }
  return d;
}
function renderMinimal(matrix, { fg }) {
  return `<path d="${runs(matrix)}" fill="${fg}" shape-rendering="crispEdges"/>`;
}
const LOGO_PAD = 0.5;
function logoBox(size, fraction, aspect) {
  const w = fraction * size;
  const h = w / aspect;
  const image = { x: (size - w) / 2, y: (size - h) / 2, w, h };
  const x0 = Math.max(0, Math.floor(image.x - LOGO_PAD));
  const y0 = Math.max(0, Math.floor(image.y - LOGO_PAD));
  const x1 = Math.min(size, Math.ceil(image.x + w + LOGO_PAD));
  const y1 = Math.min(size, Math.ceil(image.y + h + LOGO_PAD));
  return { image, clear: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}
function logoAspect({ logo }) {
  return logo ? logo.width / logo.height : 1;
}
const logoPlans = /* @__PURE__ */ new Map();
function decodesWithLogo(matrix, text, fraction, aspect) {
  const { clear } = logoBox(matrix.size, fraction, aspect);
  const cells = matrix.cells.slice();
  for (let row = clear.y; row < clear.y + clear.h; row++) {
    cells.fill(0, row * matrix.size + clear.x, row * matrix.size + clear.x + clear.w);
  }
  return decodeMatrix({ ...matrix, cells }) === text;
}
function widestLogo(matrix, text, aspect) {
  if (!decodesWithLogo(matrix, text, LOGO_MIN_FRACTION, aspect)) return 0;
  let lo = LOGO_MIN_FRACTION;
  let hi = LOGO_MAX_FRACTION;
  while (hi - lo > 5e-3) {
    const mid = (lo + hi) / 2;
    if (decodesWithLogo(matrix, text, mid, aspect)) lo = mid;
    else hi = mid;
  }
  return Math.max(0, Math.floor((lo - LOGO_MARGIN) * 100) / 100);
}
function logoPlan(options) {
  const aspect = logoAspect(options);
  const key = `${aspect.toFixed(4)}|${options.text}`;
  let plans = logoPlans.get(key);
  if (!plans) {
    const first = buildMatrix(options.text, "H");
    plans = [];
    plans = [first, buildMatrix(options.text, "H", first.version + 1)].map((matrix) => ({
      version: matrix.version,
      fraction: widestLogo(matrix, options.text, aspect)
    }));
    logoPlans.set(key, plans);
  }
  if (options.logoFit === "small" || plans[1].fraction <= plans[0].fraction) return plans[0];
  return plans[1];
}
function renderLogo(matrix, options) {
  const { fg, bg, logo } = options;
  const { image, clear } = logoBox(matrix.size, logoPlan(options).fraction, logoAspect(options));
  const inBox = (row, col) => row >= clear.y && row < clear.y + clear.h && col >= clear.x && col < clear.x + clear.w;
  let out = options.dots ? renderDots(matrix, options, inBox) : `<path d="${runs(matrix, inBox)}" fill="${fg}" shape-rendering="crispEdges"/>`;
  if (logo) {
    out += `<image href="${logo.url}" x="${image.x}" y="${image.y}" width="${image.w}" height="${image.h}" preserveAspectRatio="xMidYMid meet"/>`;
  } else {
    out += `<rect x="${image.x}" y="${image.y}" width="${image.w}" height="${image.h}" fill="${bg}"/>`;
  }
  return out;
}
function renderDots(matrix, { fg }, skip = () => false) {
  const { size } = matrix;
  let dots = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isFinderZone(row, col, size, 7) || skip(row, col) || !matrix.isDark(row, col)) continue;
      dots += `M${col + 0.5} ${row}a0.5 0.5 0 1 1 0 1a0.5 0.5 0 1 1 0 -1z`;
    }
  }
  return `<path d="${dots}" fill="${fg}"/>` + finderFrames(size, fg);
}
function finderFrames(size, fg) {
  const eye = (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="0.5" fill="none" stroke="${fg}" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.4" fill="${fg}"/>`;
  return eye(0, 0) + eye(size - 7, 0) + eye(0, size - 7);
}
function alignmentFrame(centerRow, centerCol, fg) {
  return `<rect x="${centerCol - 1.5}" y="${centerRow - 1.5}" width="4" height="4" rx="0.5" fill="none" stroke="${fg}" stroke-width="1"/><rect x="${centerCol}" y="${centerRow}" width="1" height="1" rx="0.3" fill="${fg}"/>`;
}
function renderArt(matrix, { fg, bg, art, artDot, dots, artZoom = 1, artOffset = { x: 0, y: 0 } }) {
  const { size, version } = matrix;
  const solid = /* @__PURE__ */ new Set();
  const mark = (row, col) => {
    if (row >= 0 && col >= 0 && row < size && col < size) solid.add(row * size + col);
  };
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isFinderZone(row, col, size, 9) || row === 6 || col === 6) mark(row, col);
    }
  }
  const alignmentCells = /* @__PURE__ */ new Set();
  const alignmentFrames = [];
  for (const key of alignmentCenters(version)) {
    const cr = Math.floor(key / size);
    const cc = key % size;
    alignmentFrames.push([cr, cc]);
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      mark(cr + dr, cc + dc);
      alignmentCells.add((cr + dr) * size + cc + dc);
    }
  }
  let out = "";
  if (art) {
    const sourceWidth = art.width > 0 ? art.width : size;
    const sourceHeight = art.height > 0 ? art.height : size;
    const cover = Math.max(size / sourceWidth, size / sourceHeight) * artZoom;
    const width = sourceWidth * cover;
    const height = sourceHeight * cover;
    const x = (size - width) / 2 + artOffset.x;
    const y = (size - height) / 2 + artOffset.y;
    out += `<image href="${art.url}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" preserveAspectRatio="none"/>`;
  }
  const inset = (1 - artDot) / 2;
  const dark = [];
  const light = [];
  const solidDark = [];
  const solidLight = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const isDark = matrix.isDark(row, col);
      if (solid.has(row * size + col)) {
        if (!isDark) {
          solidLight.push(`M${col} ${row}h1v1h-1z`);
        } else if (dots && (isFinderZone(row, col, size, 7) || alignmentCells.has(row * size + col))) {
          continue;
        } else if (dots) {
          solidDark.push(`M${col} ${row + 0.5}a0.5 0.5 0 1 1 1 0a0.5 0.5 0 1 1 -1 0z`);
        } else {
          solidDark.push(`M${col} ${row}h1v1h-1z`);
        }
      } else if (dots) {
        const radius = artDot / 2;
        (isDark ? dark : light).push(`M${col + inset} ${row + 0.5}a${radius} ${radius} 0 1 1 ${artDot} 0a${radius} ${radius} 0 1 1 -${artDot} 0z`);
      } else {
        const x = col + inset;
        const y = row + inset;
        (isDark ? dark : light).push(`M${x} ${y}h${artDot}v${artDot}h-${artDot}z`);
      }
    }
  }
  out += `<path d="${solidLight.join("")}" fill="${bg}" shape-rendering="crispEdges"/>`;
  out += `<path d="${light.join("")}" fill="${bg}"/>`;
  out += `<path d="${solidDark.join("")}" fill="${fg}"${dots ? "" : ' shape-rendering="crispEdges"'}/>`;
  out += `<path d="${dark.join("")}" fill="${fg}"/>`;
  if (dots) {
    out += finderFrames(size, fg);
    for (const [centerRow, centerCol] of alignmentFrames) out += alignmentFrame(centerRow, centerCol, fg);
  }
  return out;
}
async function svgToCanvas(svg, pixelsPerModule) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)[1].split(" ").map(Number);
  const side = Math.round(viewBox[2]) * pixelsPerModule;
  const sized = svg.replace(/width="\d+" height="\d+"/, `width="${side}" height="${side}"`);
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, side, side);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export {
  renderQr,
  svgToCanvas
};
