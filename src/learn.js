import { explainQr, MASK_COUNT } from "./anatomy.js";
import { maskBit } from "./codec.js";
import { decodeMatrix, matrixFromCells } from "./qr.js";
import { QUIET, wrap } from "./render.js";

const PARTS = {
  finder: {
    label: "Finder pattern and separator",
    dark: "#141414",
    light: "#d4d7db",
    about: "The three big squares tell a scanner where the code is and which way up it is. The light ring around them keeps them apart from the data."
  },
  timing: {
    label: "Timing pattern",
    dark: "#8a6a00",
    light: "#ffe28a",
    about: "Alternating dark and light, so a scanner can count the rows and columns."
  },
  alignment: {
    label: "Alignment pattern",
    dark: "#6b3fa0",
    light: "#e2d4f5",
    about: "Helps a scanner correct for a tilted or bent code. Bigger versions get more of them."
  },
  format: {
    label: "Format information",
    dark: "#c4367a",
    light: "#fbd0e3",
    about: "Says which error correction level and mask are used. It is stored twice, so one copy may get damaged."
  },
  version: {
    label: "Version information",
    dark: "#a34700",
    light: "#ffd8b5",
    about: "Says which version this is, stored twice. Only versions 7 and up have it."
  },
  dark: {
    label: "Dark module",
    dark: "#b3261e",
    light: "#b3261e",
    about: "Always dark. It carries no information, the spec just wants it there."
  },
  data: {
    label: "Data codewords",
    dark: "#0b7a75",
    light: "#c6f1ef",
    about: "Your text, plus the header and filler."
  },
  ec: {
    label: "Error correction codewords",
    dark: "#1d4ed8",
    light: "#d4e0fb",
    about: "Reed-Solomon codewords calculated from the data, used to repair damage."
  },
  remainder: {
    label: "Remainder bits",
    dark: "#5c5c5c",
    light: "#ececec",
    about: "Leftover room after the last codeword. Always zero before masking."
  }
};
const MARKERS = {
  yours: {
    label: "Flipped by you",
    svg: '<path d="M2 2l8 8M10 2l-8 8" stroke="#e0115f" stroke-width="2.4" stroke-linecap="round"/>'
  },
  purpose: {
    label: "Flipped on purpose to draw your text",
    svg: '<circle cx="6" cy="6" r="3.6" fill="none" stroke="#9333ea" stroke-width="2"/>'
  },
  logo: {
    label: "Hidden behind your logo",
    svg: '<rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/><path d="M1 7l6-6M1 11L11 1M5 11l6-6" stroke="currentColor" stroke-width="1.2"/>'
  },
  mask: {
    label: "Flipped by the mask",
    svg: '<circle cx="6" cy="6" r="2.4" fill="currentColor"/>'
  }
};
const ECC_NAMES = { L: "low", M: "medium", Q: "quartile", H: "high" };
const MASK_RULES = [
  "(row + column) mod 2 = 0",
  "row mod 2 = 0",
  "column mod 3 = 0",
  "(row + column) mod 3 = 0",
  "(row / 2 + column / 3, rounded down) mod 2 = 0",
  "(row × column) mod 2 + (row × column) mod 3 = 0",
  "((row × column) mod 2 + (row × column) mod 3) mod 2 = 0",
  "((row + column) mod 2 + (row × column) mod 3) mod 2 = 0"
];
const SEGMENT_LABELS = {
  eci: () => "ECI",
  charset: (segment) => (segment.value === 26 ? "UTF-8" : `set ${segment.value}`),
  mode: () => "byte mode",
  count: (segment) => `${segment.value} bytes`,
  byte: (segment) => byteLabel(segment.value),
  terminator: () => "end",
  align: () => "fill byte",
  filler: (segment) => (segment.value === 0b11101100 || segment.value === 0b00010001 ? "pad" : segment.value === 0 ? "zeros" : "filler")
};
const VISIBLE_FILLER_BYTES = 6;
const THUMBNAIL_SIZE = 12;
const IDLE_HINT = "Hover over a module to see what it does. Click or tap to flip it.";

const $ = (id) => document.getElementById(id);
const preview = $("preview");
const inspector = $("learn-inspector");

let model = null;
let modelKey = "";
let mode = "minimal";
let padding = "spec";
let covered = new Set();
let damage = new Set();
let cursor = null;
let focusedCodeword = null;

function byteLabel(value) {
  if (value === 0x20) return "space";
  if (value > 0x20 && value < 0x7f) return String.fromCharCode(value);
  return "UTF-8";
}

function hex(value) {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setupLearn() {
  const legend = $("learn-legend");
  for (const [role, part] of Object.entries(PARTS)) {
    const item = element("li");
    item.dataset.role = role;
    const swatch = element("span", "swatch");
    swatch.style.setProperty("--swatch-dark", part.dark);
    swatch.style.setProperty("--swatch-light", part.light);
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, part.label);
    legend.append(item);
  }
  for (const [marker, { label, svg }] of Object.entries(MARKERS)) {
    const item = element("li");
    item.dataset.marker = marker;
    const swatch = element("span", "markerSwatch");
    swatch.innerHTML = `<svg viewBox="0 0 12 12" aria-hidden="true">${svg}</svg>`;
    item.append(swatch, label);
    legend.append(item);
  }

  const masks = $("learn-masks");
  for (let mask = 0; mask < MASK_COUNT; mask++) {
    let cells = "";
    for (let y = 0; y < THUMBNAIL_SIZE; y++) {
      for (let x = 0; x < THUMBNAIL_SIZE; x++) if (maskBit(mask, x, y)) cells += `M${x} ${y}h1v1h-1z`;
    }
    const item = element("li", "maskCard");
    item.dataset.mask = String(mask);
    item.innerHTML = `<svg viewBox="0 0 ${THUMBNAIL_SIZE} ${THUMBNAIL_SIZE}" aria-hidden="true"><path d="${cells}" shape-rendering="crispEdges"/></svg>`;
    item.append(element("strong", "", `Mask ${mask}`), element("small"));
    masks.append(item);
  }

  const blocks = $("learn-blocks");
  blocks.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-codeword]");
    if (chip) toggleCodeword(Number(chip.dataset.codeword));
  });
  for (const type of ["pointerover", "focusin"]) {
    blocks.addEventListener(type, (event) => {
      const chip = event.target.closest("[data-codeword]");
      if (!chip || !model) return;
      focusedCodeword = Number(chip.dataset.codeword);
      cursor = null;
      inspector.textContent = describeCodeword(focusedCodeword);
      drawHighlight();
    });
  }
  blocks.addEventListener("pointerleave", clearHighlight);
  blocks.addEventListener("focusout", clearHighlight);
  $("learn-reset").addEventListener("click", () => {
    damage = new Set();
    refresh();
  });

  preview.addEventListener("pointermove", (event) => {
    if (!isActive()) return;
    const index = moduleAt(event);
    if (index === null) return clearHighlight();
    if (cursor === index) return;
    cursor = index;
    focusedCodeword = null;
    inspector.textContent = describeModule(index);
    drawHighlight();
  });
  preview.addEventListener("pointerleave", () => {
    if (isActive()) clearHighlight();
  });
  preview.addEventListener("click", (event) => {
    if (!isActive()) return;
    const index = moduleAt(event);
    if (index !== null) toggleModule(index);
  });
  preview.addEventListener("keydown", (event) => {
    if (!isActive() || !model) return;
    const steps = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (event.key in steps) {
      event.preventDefault();
      const [dx, dy] = steps[event.key];
      const current = cursor ?? 0;
      const x = Math.min(model.size - 1, Math.max(0, (current % model.size) + dx));
      const y = Math.min(model.size - 1, Math.max(0, Math.floor(current / model.size) + dy));
      cursor = y * model.size + x;
      focusedCodeword = null;
      inspector.textContent = describeModule(cursor);
      drawHighlight();
    } else if ((event.key === " " || event.key === "Enter") && cursor !== null) {
      event.preventDefault();
      toggleModule(cursor);
    } else if (event.key === "Escape") {
      clearHighlight();
    }
  });
  preview.addEventListener("blur", () => {
    if (isActive()) clearHighlight();
  });
}

function isActive() {
  return preview.hasAttribute("data-learn");
}

function setLearnActive(active) {
  preview.toggleAttribute("data-learn", active);
  preview.setAttribute("role", active ? "application" : "img");
  preview.setAttribute(
    "aria-label",
    active ? "QR code broken down. Use the arrow keys to move between modules and space to flip one." : "QR code preview"
  );
  if (active) preview.tabIndex = 0;
  else preview.removeAttribute("tabindex");
}

function readViewSettings() {
  return {
    regions: $("learn-regions").checked,
    numbers: $("learn-numbers").checked,
    path: $("learn-path").checked,
    unmasked: $("learn-unmasked").checked,
    maskDots: $("learn-mask-dots").checked
  };
}

// Returns the broken down diagram of the code that was just rendered. Your flips stay as
// long as the code itself does not change.
function updateLearn(text, rendered, options) {
  const { matrix } = rendered;
  const key = [options.mode, options.padding, text, matrix.version, matrix.ecc, matrix.cells.join(""), rendered.covered.length].join("|");
  if (key !== modelKey) {
    modelKey = key;
    mode = options.mode;
    padding = options.padding;
    covered = new Set(rendered.covered);
    damage = new Set();
    cursor = null;
    focusedCodeword = null;
    model = explainQr(matrix, text);
    renderSteps();
  }
  renderDamage();
  return diagram();
}

function refresh() {
  preview.innerHTML = diagram();
  renderDamage();
  drawHighlight();
}

function diagram() {
  const settings = readViewSettings();
  const cells = flipped(settings.unmasked ? model.unmasked : model.cells);
  const markerShown = {
    yours: damage.size > 0,
    purpose: model.flippedOnPurpose.size > 0,
    logo: covered.size > 0,
    mask: settings.maskDots
  };
  for (const [marker, shown] of Object.entries(markerShown)) {
    document.querySelector(`#learn-legend [data-marker="${marker}"]`).hidden = !shown;
  }
  return learnSvg(cells, settings);
}

function flipped(cells) {
  const result = cells.slice();
  for (const index of damage) result[index] ^= 1;
  return result;
}

function learnSvg(cells, settings) {
  const { size } = model;
  const fills = new Map();
  for (let index = 0; index < size * size; index++) {
    const isDark = cells[index] === 1;
    const part = PARTS[model.roles[index]];
    const colour = settings.regions ? (isDark ? part.dark : part.light) : isDark ? "#000000" : "#ffffff";
    if (colour === "#ffffff") continue;
    fills.set(colour, (fills.get(colour) ?? "") + `M${index % size} ${Math.floor(index / size)}h1v1h-1z`);
  }
  let body = "";
  for (const [colour, path] of fills) body += `<path d="${path}" fill="${colour}" shape-rendering="crispEdges"/>`;
  if (settings.maskDots) body += maskDots(cells);
  body += logoCover();
  if (settings.path) body += placementPath();
  if (settings.numbers) body += bitNumbers(settings.regions);
  body += purposeRings();
  body += damageCrosses();
  body += `<g data-highlight></g>`;
  return wrap(size, "#ffffff", body);
}

function maskDots(cells) {
  const { size } = model;
  let onDark = "";
  let onLight = "";
  for (const index of model.positions) {
    if (!model.flippedByMask[index]) continue;
    const dot = `M${(index % size) + 0.32} ${Math.floor(index / size) + 0.5}a0.18 0.18 0 1 1 0.36 0a0.18 0.18 0 1 1 -0.36 0z`;
    if (cells[index]) onDark += dot;
    else onLight += dot;
  }
  return `<path d="${onDark}" fill="#ffffff"/><path d="${onLight}" fill="#141414"/>`;
}

function placementPath() {
  const { size } = model;
  const points = Array.from(model.positions, (index) => `${(index % size) + 0.5},${Math.floor(index / size) + 0.5}`).join(" ");
  const first = model.positions[0];
  return (
    `<polyline points="${points}" fill="none" stroke="#141414" stroke-width="0.24" stroke-linejoin="round" stroke-opacity="0.5"/>` +
    `<polyline points="${points}" fill="none" stroke="#ff8a00" stroke-width="0.12" stroke-linejoin="round"/>` +
    `<circle cx="${(first % size) + 0.5}" cy="${Math.floor(first / size) + 0.5}" r="0.35" fill="#ff8a00" stroke="#141414" stroke-width="0.08"/>`
  );
}

function bitNumbers(regions) {
  const { size } = model;
  let outlines = "";
  for (const modules of model.codewordModules) {
    const inCodeword = new Set(modules);
    for (const index of modules) {
      const x = index % size;
      const y = Math.floor(index / size);
      if (!inCodeword.has(index - size) || y === 0) outlines += `M${x} ${y}h1`;
      if (!inCodeword.has(index + size) || y === size - 1) outlines += `M${x} ${y + 1}h1`;
      if (!inCodeword.has(index - 1) || x === 0) outlines += `M${x} ${y}v1`;
      if (!inCodeword.has(index + 1) || x === size - 1) outlines += `M${x + 1} ${y}v1`;
    }
  }
  let labels = "";
  model.positions.forEach((index, position) => {
    const label = String(position + 1);
    const fontSize = Math.min(0.6, 0.9 / (label.length * 0.6)).toFixed(2);
    labels += `<text x="${(index % size) + 0.5}" y="${Math.floor(index / size) + 0.5}" font-size="${fontSize}">${label}</text>`;
  });
  const textColour = regions ? "#141414" : "#ff8a00";
  return (
    `<path d="${outlines}" fill="none" stroke="#ff8a00" stroke-width="0.12" stroke-linecap="square"/>` +
    `<g font-family="Space Mono, monospace" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${textColour}" stroke="#ffffff" stroke-width="0.08" paint-order="stroke">${labels}</g>`
  );
}

function purposeRings() {
  const { size } = model;
  let rings = "";
  for (const index of model.flippedOnPurpose) {
    rings += `M${(index % size) + 0.2} ${Math.floor(index / size) + 0.5}a0.3 0.3 0 1 1 0.6 0a0.3 0.3 0 1 1 -0.6 0z`;
  }
  return (
    `<path d="${rings}" fill="none" stroke="#ffffff" stroke-width="0.26"/>` +
    `<path d="${rings}" fill="none" stroke="#9333ea" stroke-width="0.14"/>`
  );
}

function logoCover() {
  if (covered.size === 0) return "";
  const { size } = model;
  const indexes = [...covered];
  const xs = indexes.map((index) => index % size);
  const ys = indexes.map((index) => Math.floor(index / size));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) + 1 - x;
  const height = Math.max(...ys) + 1 - y;
  return (
    `<defs><pattern id="learn-hatch" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.2" height="0.6" fill="#141414"/></pattern></defs>` +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff" fill-opacity="0.5"/>` +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#learn-hatch)" fill-opacity="0.6" stroke="#141414" stroke-width="0.15"/>`
  );
}

function damageCrosses() {
  const { size } = model;
  let crosses = "";
  for (const index of damage) {
    const x = index % size;
    const y = Math.floor(index / size);
    crosses += `M${x + 0.2} ${y + 0.2}l0.6 0.6M${x + 0.8} ${y + 0.2}l-0.6 0.6`;
  }
  return (
    `<path d="${crosses}" stroke="#ffffff" stroke-width="0.36" stroke-linecap="round"/>` +
    `<path d="${crosses}" stroke="#e0115f" stroke-width="0.2" stroke-linecap="round"/>`
  );
}

function groupOf(index) {
  const role = model.roles[index];
  const position = model.positionOf[index];
  if (position >= 0 && role !== "remainder") return model.codewordModules[position >> 3];
  if (role === "format" || role === "version") {
    const bit = model.bitIndex[index];
    return model.roles.flatMap((other, otherIndex) => (other === role && model.bitIndex[otherIndex] === bit ? [otherIndex] : []));
  }
  return [index];
}

function drawHighlight() {
  const layer = preview.querySelector("[data-highlight]");
  if (!layer || !model) return;
  const { size } = model;
  const group = focusedCodeword !== null ? model.codewordModules[focusedCodeword] : cursor !== null ? groupOf(cursor) : [];
  if (group.length === 0) {
    layer.innerHTML = "";
    return;
  }
  const total = size + QUIET * 2;
  const holes = group.map((index) => `M${index % size} ${Math.floor(index / size)}h1v1h-1z`).join("");
  let markup = `<path d="M${-QUIET} ${-QUIET}h${total}v${total}h${-total}z${holes}" fill="#ffffff" fill-opacity="0.72" fill-rule="evenodd"/>`;
  markup += `<path d="${holes}" fill="none" stroke="#141414" stroke-width="0.1"/>`;
  if (cursor !== null) {
    markup += `<rect x="${cursor % size}" y="${Math.floor(cursor / size)}" width="1" height="1" fill="none" stroke="#ff8a00" stroke-width="0.25"/>`;
  }
  layer.innerHTML = markup;
}

function clearHighlight() {
  cursor = null;
  focusedCodeword = null;
  inspector.textContent = IDLE_HINT;
  drawHighlight();
}

function moduleAt(event) {
  const svg = preview.querySelector("svg");
  if (!svg || !model) return null;
  const rect = svg.getBoundingClientRect();
  const total = model.size + QUIET * 2;
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * total) - QUIET;
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * total) - QUIET;
  if (x < 0 || y < 0 || x >= model.size || y >= model.size) return null;
  return y * model.size + x;
}

function toggleModule(index) {
  if (damage.has(index)) damage.delete(index);
  else damage.add(index);
  refresh();
  cursor = index;
  inspector.textContent = describeModule(index);
  drawHighlight();
}

function toggleCodeword(codeword) {
  const modules = model.codewordModules[codeword];
  const broken = modules.some((index) => damage.has(index));
  for (const index of modules) {
    if (broken) damage.delete(index);
    else damage.add(index);
  }
  refresh();
  focusedCodeword = codeword;
  inspector.textContent = describeCodeword(codeword);
  drawHighlight();
}

function describeCodeword(codeword) {
  const source = model.codewordSource[codeword];
  const block = model.blocks[source.block];
  const value = model.codewords[codeword];
  const kind = source.kind === "data" ? "data codeword" : "error correction codeword";
  const count = source.kind === "data" ? block.data.length : block.ec.length;
  const modules = model.codewordModules[codeword];
  const yours = modules.filter((index) => damage.has(index)).length;
  const onPurpose = modules.filter((index) => model.flippedOnPurpose.has(index)).length;
  const hidden = modules.filter((index) => covered.has(index)).length;
  return (
    `Codeword ${codeword + 1} in reading order: ${kind} ${source.index + 1} of ${count} in block ${source.block + 1}. ` +
    `Value ${hex(value)}, bits ${value.toString(2).padStart(8, "0")}.` +
    (onPurpose ? ` ${onPurpose} of its bits were flipped on purpose to draw your text.` : "") +
    (hidden ? ` ${hidden} of its bits are hidden behind your logo.` : "") +
    (yours ? ` You flipped ${yours} of its 8 bits.` : "")
  );
}

function describeModule(index) {
  const { size } = model;
  const role = model.roles[index];
  const where = `Row ${Math.floor(index / size) + 1}, column ${(index % size) + 1}: `;
  const notes =
    (model.flippedOnPurpose.has(index) ? " Flipped on purpose to draw your text." : "") +
    (covered.has(index) ? " Hidden behind your logo." : "") +
    (damage.has(index) ? " You flipped this one." : "");
  const position = model.positionOf[index];
  if (position >= 0 && role !== "remainder") {
    const codeword = position >> 3;
    const masked = model.flippedByMask[index] ? ` Mask ${model.mask} flipped this bit.` : ` Mask ${model.mask} left this bit alone.`;
    return `${where}bit ${position + 1} in reading order, bit ${(position & 7) + 1} of 8 in its codeword. ${describeCodeword(codeword)}${masked}${notes}`;
  }
  const part = PARTS[role];
  let detail = part.about;
  if (role === "format") detail = `Bit ${15 - model.bitIndex[index]} of 15. ${part.about}`;
  if (role === "version") detail = `Bit ${18 - model.bitIndex[index]} of 18. ${part.about}`;
  if (role === "remainder" && model.flippedByMask[index]) detail += ` Mask ${model.mask} flipped this one.`;
  return `${where}${part.label.toLowerCase()}. ${detail}${notes}`;
}

function renderSteps() {
  const { version, ecc } = model;
  document.querySelectorAll("#learn-legend [data-role]").forEach((item) => {
    item.hidden =
      (item.dataset.role === "version" && version < 7) || (item.dataset.role === "remainder" && model.remainderBits === 0);
  });

  const bits = $("learn-bits");
  bits.replaceChildren();
  let fillerCount = 0;
  for (const segment of model.segments) {
    if (segment.kind === "filler" && ++fillerCount > VISIBLE_FILLER_BYTES) continue;
    const group = element("span", "bitGroup");
    group.dataset.part = segment.kind;
    group.append(element("code", "", segment.bits), element("small", "", SEGMENT_LABELS[segment.kind](segment)));
    bits.append(group);
  }
  if (fillerCount > VISIBLE_FILLER_BYTES) {
    bits.append(element("span", "bitMore", `and ${fillerCount - VISIBLE_FILLER_BYTES} more filler bytes`));
  }
  const fillerName = mode === "pixel" ? "filler, set to draw your letters" : padding === "spec" ? "pad bytes" : "zeros";
  $("learn-bits-summary").textContent = `${model.messageBits} of ${model.capacityBits} bits used, the rest is ${fillerName}.`;

  const totalData = model.blocks.reduce((sum, block) => sum + block.data.length, 0);
  const remainder = model.remainderBits > 0 ? ` ${model.remainderBits} remainder bits after the last codeword.` : "";
  $("learn-blocks-summary").textContent =
    `${totalData} data and ${model.blocks.length * model.ecLen} error correction codewords in ` +
    `${model.blocks.length} ${model.blocks.length === 1 ? "block" : "blocks"}, ` +
    `each block repairs up to ${Math.floor(model.ecLen / 2)} broken codewords at level ${ecc} (${ECC_NAMES[ecc]}).${remainder}`;
  const placementOf = new Map();
  model.codewordSource.forEach((source, codeword) => placementOf.set(`${source.block}-${source.kind}-${source.index}`, codeword));
  const blocks = $("learn-blocks");
  blocks.replaceChildren();
  model.blocks.forEach((block, blockIndex) => {
    const wrapper = element("div", "block");
    wrapper.append(element("h4", "", `Block ${blockIndex + 1}: ${block.data.length} data, ${block.ec.length} error correction`));
    const chips = element("div", "chips");
    for (const kind of ["data", "ec"]) {
      (kind === "data" ? block.data : block.ec).forEach((value, index) => {
        const codeword = placementOf.get(`${blockIndex}-${kind}-${index}`);
        const chip = element("button", "chip", hex(value));
        chip.type = "button";
        chip.dataset.codeword = String(codeword);
        chip.dataset.part = kind;
        chip.setAttribute(
          "aria-label",
          `${kind === "data" ? "Data" : "Error correction"} codeword ${index + 1}, value ${hex(value)}, number ${codeword + 1} in reading order. Press to break it.`
        );
        chip.setAttribute("aria-pressed", "false");
        chips.append(chip);
      });
    }
    wrapper.append(chips);
    blocks.append(wrapper);
  });

  const usesPenalty = mode !== "pixel";
  const lowest = Math.min(...model.penalties);
  for (const card of document.querySelectorAll("#learn-masks [data-mask]")) {
    const mask = Number(card.dataset.mask);
    const used = mask === model.mask;
    card.toggleAttribute("data-used", used);
    const penalty = usesPenalty ? String(model.penalties[mask]) : "";
    card.querySelector("small").textContent = [penalty, used ? "used" : ""].filter(Boolean).join(", ");
  }
  const lowestMasks = model.penalties.flatMap((penalty, mask) => (penalty === lowest ? [mask] : []));
  $("learn-mask-rule").textContent =
    `Mask ${model.mask} flips every data module where ${MASK_RULES[model.mask]}.` +
    (usesPenalty ? ` The numbers are penalties, lowest is mask ${lowestMasks.join(" and ")}.` : "");

  $("learn-format").replaceChildren(
    bitRow("Level and mask", [
      [model.format.eccBits, `level ${ecc}`],
      [model.format.maskBits, `mask ${model.mask}`]
    ]),
    bitRow("Error correction", [[model.format.bchBits, "BCH code"]]),
    bitRow("XOR with", [[model.format.xorBits, "fixed pattern"]]),
    bitRow("Stored", [[model.format.finalBits, "twice"]])
  );
  if (model.versionInfo) {
    $("learn-format").append(
      bitRow("Version", [
        [model.versionInfo.versionBits, `version ${version}`],
        [model.versionInfo.bchBits, "BCH code"]
      ])
    );
  }
}

function bitRow(title, groups) {
  const row = element("div", "bitRow");
  row.append(element("span", "bitRowTitle", title));
  const values = element("span", "bitRowValues");
  for (const [bits, label] of groups) {
    const group = element("span", "bitGroup");
    group.append(element("code", "", bits), element("small", "", label));
    values.append(group);
  }
  row.append(values);
  return row;
}

function brokenCodewordsOf(modules) {
  const codewords = new Set();
  let outsideData = 0;
  for (const index of modules) {
    const position = model.positionOf[index];
    if (position >= 0 && model.roles[index] !== "remainder") codewords.add(position >> 3);
    else if (model.roles[index] !== "remainder") outsideData++;
  }
  return { codewords, outsideData };
}

function scansWithFlips() {
  const cells = flipped(model.cells);
  const fills = covered.size > 0 ? [0, 1] : [null];
  return fills.every((fill) => {
    const filled = cells.slice();
    if (fill !== null) for (const index of covered) filled[index] = fill;
    return decodeMatrix(matrixFromCells(filled, model.version, model.ecc)) === model.text;
  });
}

// A module is wrong when a scanner sees something other than what the encoder meant. Under
// the logo the scanner sees the logo, so that is counted twice: as all light and as all dark.
function wrongModules(fill) {
  const wrong = new Set();
  for (const index of new Set([...model.flippedOnPurpose, ...damage, ...covered])) {
    const intended = model.cells[index] ^ (model.flippedOnPurpose.has(index) ? 1 : 0);
    const seen = covered.has(index) ? fill : model.cells[index] ^ (damage.has(index) ? 1 : 0);
    if (seen !== intended) wrong.add(index);
  }
  return wrong;
}

function renderDamage() {
  const fixable = Math.floor(model.ecLen / 2);
  const outcomes = (covered.size > 0 ? [0, 1] : [null]).map((fill) => {
    const { codewords, outsideData } = brokenCodewordsOf(wrongModules(fill));
    const perBlock = model.blocks.map(() => 0);
    for (const codeword of codewords) perBlock[model.codewordSource[codeword].block]++;
    return { codewords, outsideData, perBlock };
  });
  const perBlock = model.blocks.map((_, blockIndex) => Math.max(...outcomes.map((outcome) => outcome.perBlock[blockIndex])));
  const outsideData = Math.max(...outcomes.map((outcome) => outcome.outsideData));
  const broken = new Set(outcomes.flatMap((outcome) => [...outcome.codewords]));
  const yours = brokenCodewordsOf(damage).codewords;
  for (const chip of document.querySelectorAll("#learn-blocks [data-codeword]")) {
    const codeword = Number(chip.dataset.codeword);
    chip.setAttribute("aria-pressed", String(yours.has(codeword)));
    chip.toggleAttribute("data-broken", broken.has(codeword) && !yours.has(codeword));
  }

  const list = $("learn-damage");
  list.replaceChildren();
  $("learn-reset").disabled = damage.size === 0;
  if (covered.size > 0) {
    const worst = Math.max(...outcomes.map((outcome) => outcome.codewords.size));
    list.append(
      element(
        "li",
        "",
        `Your logo hides ${covered.size} modules, up to ${worst} codewords.`
      )
    );
  }
  if (model.flippedOnPurpose.size > 0) {
    const onPurpose = brokenCodewordsOf(model.flippedOnPurpose).codewords.size;
    list.append(
      element("li", "", `${model.flippedOnPurpose.size} modules flipped on purpose to draw your text, ${onPurpose} codewords.`)
    );
  }
  if (broken.size === 0 && outsideData === 0) {
    list.append(element("li", "", "Nothing broken yet. Click modules in the code to flip them."));
    return;
  }
  const upTo = covered.size > 0 ? "up to " : "";
  perBlock.forEach((count, blockIndex) => {
    if (count === 0) return;
    const item = element("li", "", `Block ${blockIndex + 1}: ${upTo}${count} of ${fixable} repairable codewords broken`);
    if (count > fixable) item.append(" ", element("span", "warn", "too many"));
    list.append(item);
  });
  const untouched = perBlock.filter((count) => count === 0).length;
  if (untouched > 0) list.append(element("li", "", `${untouched} ${untouched === 1 ? "block" : "blocks"} without broken codewords.`));
  if (outsideData > 0) {
    list.append(
      element(
        "li",
        "",
        `${upTo}${outsideData} broken outside the data, error correction does not cover those.`
      )
    );
  }
  if (damage.size > 0) {
    const item = element("li", "", "With your flips: ");
    item.append(scansWithFlips() ? element("strong", "", "still scans") : element("span", "warn", "no longer scans"));
    list.append(item);
  }
}

export { setLearnActive, setupLearn, updateLearn };
