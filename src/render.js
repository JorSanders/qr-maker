import { alignmentCenters, buildMatrix, decodeMatrix, fallbackPair, isFinderZone, versionLevelPairs } from "./qr.js";
const QUIET = 2;
const LOGO_MIN_FRACTION = 0.1;
const LOGO_MAX_FRACTION = 0.75;
const LOGO_SMALL_GOAL = 0.2;
const LOGO_LARGE_SPAN = 4;
const LOGO_MARGIN = 0.02;
const SEARCH_SPAN = 6;
function renderQr(options, prebuilt) {
  let note;
  let matrix = prebuilt;
  let covered = [];
  if (!matrix && options.mode === "logo") {
    const plan = logoPlan(options);
    matrix = buildMatrix(options.text, plan.ecc, plan.version, options);
    note = plan.fraction > 0 ? `logo ${Math.round(plan.fraction * 100)}% ${logoAspect(options) >= 1 ? "wide" : "tall"}` : `no room for a logo at level ${plan.ecc}`;
    covered = coveredByLogo(matrix.size, plan.fraction, logoAspect(options));
  }
  if (!matrix && options.mode === "art") {
    const plan = artPlans.get(artPlanKey(options));
    if (!plan) throw new Error("picture plan not prepared");
    matrix = buildMatrix(options.text, plan.ecc, plan.version, options);
  }
  matrix ??= buildMatrix(options.text, options.ecc, options.version, options);
  const squaresOrDots = (m, o) => o.dots ? renderDots(m, o) : renderMinimal(m, o);
  const body = {
    minimal: squaresOrDots,
    logo: renderLogo,
    art: renderArt,
    pixel: squaresOrDots
  }[options.mode](matrix, options);
  return { svg: wrap(matrix.size, options.bg, body), matrix, note, covered };
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
// The fraction is the logo's longer side as a share of the code, so a tall logo is sized by
// its height.
function logoBox(size, fraction, aspect) {
  const w = aspect >= 1 ? fraction * size : fraction * size * aspect;
  const h = aspect >= 1 ? w / aspect : fraction * size;
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
function coveredByLogo(size, fraction, aspect) {
  if (fraction === 0) return [];
  const { clear } = logoBox(size, fraction, aspect);
  const cells = [];
  for (let row = clear.y; row < clear.y + clear.h; row++) {
    for (let col = clear.x; col < clear.x + clear.w; col++) cells.push(row * size + col);
  }
  return cells;
}
const logoPlans = /* @__PURE__ */ new Map();
function decodesWithLogo(matrix, text, fraction, aspect) {
  const { clear } = logoBox(matrix.size, fraction, aspect);
  for (const fill of [0, 1]) {
    const cells = matrix.cells.slice();
    for (let row = clear.y; row < clear.y + clear.h; row++) {
      cells.fill(fill, row * matrix.size + clear.x, row * matrix.size + clear.x + clear.w);
    }
    if (decodeMatrix({ ...matrix, cells }) !== text) return false;
  }
  return true;
}
// A candidate logo size is verified the way the badge verifies the final code: the real
// render, rasterised, read back with jsQR. Solid fill simulations miss what a dark or busy
// logo does to the reader's thresholding.
async function decodesRendered(matrix, options, fraction) {
  return scans(wrap(matrix.size, options.bg, renderLogo(matrix, options, fraction)), options.text);
}
async function scans(svg, text) {
  const canvas = await svgToCanvas(svg, 8);
  const { data, width, height } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  return globalThis.jsQR(data, width, height)?.data === text;
}
// The binary search starts from a size that is known to scan, because reading back is not
// perfectly monotonic: a bigger logo sometimes scans where a smaller one did not.
async function widestLogo(matrix, options, known = null) {
  const simulated = (fraction) => decodesWithLogo(matrix, options.text, fraction, logoAspect(options));
  if (known === null && (!simulated(LOGO_MIN_FRACTION) || !(await decodesRendered(matrix, options, LOGO_MIN_FRACTION)))) return 0;
  let lo = known ?? LOGO_MIN_FRACTION;
  let hi = LOGO_MAX_FRACTION;
  while (hi - lo > 1e-2) {
    const mid = (lo + hi) / 2;
    if (simulated(mid) && await decodesRendered(matrix, options, mid)) lo = mid;
    else hi = mid;
  }
  return Math.max(0, Math.floor((lo - LOGO_MARGIN) * 100) / 100);
}
function logoPlanKey(options) {
  const logoId = options.logo ? `${options.logo.url.length}:${options.logo.url.slice(-48)}` : "none";
  return [logoAspect(options).toFixed(4), options.text, options.dots, options.fg, options.bg, logoId, options.ecc, options.version, options.mask, options.padding, options.eci].join("|");
}
function candidatePairs(options) {
  const pairs = versionLevelPairs(options.text, options, SEARCH_SPAN);
  if (pairs.length === 0) throw new Error(options.version ? "Version too small" : "Too much data");
  return pairs;
}
async function logoFits(matrix, options, fraction) {
  return decodesWithLogo(matrix, options.text, fraction, logoAspect(options)) && (await decodesRendered(matrix, options, fraction));
}
// The widest logo a version and level allow. Pass the size that already scanned, if known.
async function logoPlanFor(pair, options, known = null) {
  const matrix = buildMatrix(options.text, pair.ecc, pair.version, options);
  return { ...pair, fraction: await widestLogo(matrix, options, known) };
}
// The smallest version, and in it the lowest level, where a logo of this size still scans.
async function smallestCodeFor(pairs, options, fraction) {
  const goal = fraction + LOGO_MARGIN;
  for (const pair of pairs) {
    const matrix = buildMatrix(options.text, pair.ecc, pair.version, options);
    if (await logoFits(matrix, options, goal)) return logoPlanFor(pair, options, goal);
  }
  return null;
}
// Fills the plan cache with all three sizes. Small is the smallest code a 20% logo scans in,
// large the biggest logo found at the highest level over the next few versions, and medium
// the smallest code a logo halfway between the two scans in. Call it before renderQr in
// logo mode.
async function prepareLogoPlan(options) {
  const key = logoPlanKey(options);
  if (logoPlans.has(key)) return;
  const pairs = candidatePairs(options);
  const small = (await smallestCodeFor(pairs, options, LOGO_SMALL_GOAL)) ?? (await logoPlanFor(fallbackPair(pairs, options.ecc), options));
  const level = options.ecc ?? "H";
  let large = small;
  for (const pair of pairs) {
    if (pair.ecc !== level || pair.version < small.version || pair.version > small.version + LOGO_LARGE_SPAN) continue;
    const plan = await logoPlanFor(pair, options);
    if (plan.fraction > large.fraction) large = plan;
  }
  const halfway = (small.fraction + large.fraction) / 2;
  const medium = large.fraction > small.fraction ? ((await smallestCodeFor(pairs, options, halfway)) ?? large) : small;
  logoPlans.set(key, { small, big: medium.fraction > large.fraction ? large : medium, biggest: medium.fraction > large.fraction ? medium : large });
}
function logoSizes(options) {
  return logoPlans.get(logoPlanKey(options)) ?? null;
}
const artPlans = /* @__PURE__ */ new Map();
// Leaves out the picture position and size, so dragging does not search again.
function artPlanKey(options) {
  const artId = options.art ? `${options.art.url.length}:${options.art.url.slice(-48)}` : "none";
  return [options.text, artId, options.artDot, options.dots, options.fg, options.bg, options.ecc, options.version, options.mask, options.padding, options.eci].join("|");
}
// Fills the plan cache with the smallest version and lowest level where the picture still
// scans. Call it before renderQr in picture mode.
async function prepareArtPlan(options) {
  const key = artPlanKey(options);
  if (artPlans.has(key)) return;
  const pairs = candidatePairs(options);
  let found = null;
  for (const pair of pairs) {
    const matrix = buildMatrix(options.text, pair.ecc, pair.version, options);
    if (await scans(wrap(matrix.size, options.bg, renderArt(matrix, options)), options.text)) {
      found = pair;
      break;
    }
  }
  artPlans.set(key, found ?? fallbackPair(pairs, options.ecc));
}
function logoPlan(options) {
  const plans = logoPlans.get(logoPlanKey(options));
  if (!plans) throw new Error("logo plan not prepared");
  return plans[options.logoFit];
}
function renderLogo(matrix, options, fraction = logoPlan(options).fraction) {
  const { fg, bg, logo } = options;
  if (fraction === 0) return options.dots ? renderDots(matrix, options) : renderMinimal(matrix, options);
  const { image, clear } = logoBox(matrix.size, fraction, logoAspect(options));
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
  QUIET,
  logoSizes,
  prepareArtPlan,
  prepareLogoPlan,
  renderQr,
  svgToCanvas,
  wrap
};
