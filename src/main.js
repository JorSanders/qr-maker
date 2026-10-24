const jsQR = globalThis.jsQR;

import { loadImage, loadImageFromUrl } from "./image.js";
import { setLearnActive, setupLearn, updateLearn } from "./learn.js";
import { pixelMinVersion, pixelTextBox, solvePixel, stampText, textFitsVersion } from "./pixel.js";
import { compose } from "./presets.js";
import { minVersion } from "./codec.js";
import { decodeMatrix, fallbackPair, versionLevelPairs } from "./qr.js";
import { logoSizes, prepareArtPlan, prepareLogoPlan, renderQr, svgToCanvas } from "./render.js";
const HINTS = {
  minimal: "Fewest possible squares: lowest version that fits, level L error correction.",
  logo: "Clears a box in the middle for your logo, as wide as the code can still bear.",
  art: "Dots over your picture. Function patterns stay solid so it keeps scanning.",
  pixel: "Spells your text in the modules. Free padding bits are set to the letters and error correction covers the rest."
};
const DEFAULT_PADDING = { minimal: "spec", logo: "spec", pixel: "zeros", art: "spec" };
const PADDING_NAMES = { spec: "pad bytes", zeros: "zeros" };
const DEFAULT_MASK = { minimal: "lowest penalty", logo: "lowest penalty", pixel: "fewest wrong letter modules", art: "lowest penalty" };
const DEFAULT_LOGO_URL = "./brand/logo/wordmark-tile.svg";
const DEFAULT_ART_URL = "./brand/logo/mark.svg";
const DEFAULT_ART_SIZE = "0.45";
const PIXEL_SEARCH_SPAN = 12;
const $ = (id) => document.getElementById(id);
const kind = $("kind");
const payload = $("payload");
const dots = $("dots");
const fg = $("fg");
const bg = $("bg");
const artDot = $("art-dot");
const artZoom = $("art-zoom");
const preview = $("preview");
const stats = $("stats");
const badge = $("badge");
const stampField = $("stamp-text");
const stampScale = $("stamp-scale");
const stampHalo = $("stamp-halo");
const advanced = $("advanced");
const eccSelect = $("ecc");
const versionSelect = $("version");
const maskSelect = $("mask");
const paddingSelect = $("padding");
const eciCheckbox = $("eci");
const learn = $("learn");
let defaultLogo = null;
let defaultArt = null;
let logo = null;
let art = null;
let artOffset = { x: 0, y: 0 };
let current = null;
let renderId = 0;
const pixelPlans = new Map();
const checked = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
function readFields(k) {
  const fields = {};
  document.querySelectorAll(
    `[data-kind="${k}"] [data-field]`
  ).forEach((el) => {
    const name = el.dataset.field;
    fields[name] = el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked ? "true" : "" : el.value;
  });
  return fields;
}
function readText() {
  const k = kind.value;
  const text = compose(k, readFields(k));
  document.querySelectorAll("[data-kind]").forEach((el) => {
    el.hidden = el.dataset.kind !== k;
  });
  payload.hidden = k === "text";
  payload.textContent = text;
  return text;
}
function readOptions() {
  const mode = checked("mode");
  const custom = advanced.checked;
  return {
    text: readText(),
    mode,
    ecc: custom && eccSelect.value !== "auto" ? eccSelect.value : mode === "minimal" ? "L" : null,
    version: custom ? Number(versionSelect.value) : 0,
    mask: custom && maskSelect.value !== "auto" ? Number(maskSelect.value) : null,
    padding: custom && paddingSelect.value !== "auto" ? paddingSelect.value : DEFAULT_PADDING[mode],
    eci: custom && eciCheckbox.checked,
    fg: fg.value,
    bg: bg.value,
    dots: dots.checked,
    logo,
    logoFit: checked("logo-fit"),
    art,
    artDot: Number(artDot.value),
    artZoom: Number(artZoom.value),
    artOffset
  };
}
function syncAdvanced(options) {
  $("advanced-fields").hidden = !advanced.checked;
  $("logo-fit").hidden = options.mode !== "logo" || (options.version > 0 && options.ecc !== null);
  eccSelect.options[0].textContent = options.mode === "minimal" ? "Mode default (L)" : "Mode default (lowest that works)";
  maskSelect.options[0].textContent = `Mode default (${DEFAULT_MASK[options.mode]})`;
  paddingSelect.options[0].textContent = `Mode default (${PADDING_NAMES[DEFAULT_PADDING[options.mode]]})`;
  const smallest = options.mode === "pixel" ? pixelMinimum(options) : minVersion(new TextEncoder().encode(options.text).length, options.ecc ?? "L", options.eci);
  versionSelect.options[0].textContent =
    options.mode === "pixel" ? "Smallest where the text fits" : smallest ? `Smallest that fits (version ${smallest})` : "Smallest that fits";
  for (let v = 1; v <= 40; v++) versionSelect.options[v].disabled = smallest !== null && v < smallest;
}
function pixelMinimum(options) {
  return pixelMinVersion(options.text, stampField.value, Number(stampScale.value), stampHalo.checked, options.ecc ?? "L", options.eci);
}
function stampedTarget(version) {
  const size = version * 4 + 17;
  const target = new Uint8Array(size * size);
  stampText(target, version, stampField.value, Number(stampScale.value), stampHalo.checked);
  return target;
}
function pixelWorks(options, version, ecc) {
  const result = solvePixel(options.text, version, stampedTarget(version), ecc, options);
  return Boolean(result) && result.unmet === 0 && decodeMatrix(result.matrix) === options.text;
}
function fittingVersion(options, ecc, minimum, from) {
  const last = Math.min(40, minimum + PIXEL_SEARCH_SPAN);
  for (let v = from + 1; v <= last; v++) {
    if (pixelWorks(options, v, ecc)) return v;
  }
  return null;
}
// The smallest version, and in it the lowest level, where every letter module comes out
// right and the code still scans.
function pixelPlan(options, minimum) {
  const key = [options.text, stampField.value, stampScale.value, stampHalo.checked, options.ecc, options.version, options.mask, options.padding, options.eci].join("|");
  if (!pixelPlans.has(key)) {
    const pairs = versionLevelPairs(options.text, options, PIXEL_SEARCH_SPAN, minimum);
    if (pairs.length === 0) throw new Error("Pixel version too small");
    const found = pairs.find((pair) => pixelWorks(options, pair.version, pair.ecc));
    pixelPlans.set(key, found ?? fallbackPair(pairs, options.ecc));
  }
  return pixelPlans.get(key);
}
async function update() {
  const id = ++renderId;
  const options = readOptions();
  document.querySelectorAll("[data-modes]").forEach((el) => {
    el.hidden = !el.dataset.modes.split(" ").includes(options.mode);
  });
  $("mode-hint").textContent = HINTS[options.mode];
  $("art-dot-out").textContent = `${Math.round(Number(artDot.value) * 100)}%`;
  $("art-zoom-out").textContent = `${Math.round(Number(artZoom.value) * 100)}%`;
  syncAdvanced(options);
  $("learn-options").hidden = !learn.checked;
  $("learn-breakdown").hidden = !learn.checked;
  $("learn-legend").hidden = !learn.checked;
  $("learn-inspector").hidden = !learn.checked;
  setLearnActive(learn.checked);
  preview.toggleAttribute("data-draggable", options.mode === "art" && Boolean(options.art) && !learn.checked);
  if (!options.text) {
    show(null, "Type something to encode.");
    return;
  }
  let rendered;
  let extra = "";
  let warning = "";
  try {
    if (options.mode === "pixel") {
      const minimum = pixelMinimum(options);
      if (minimum === null) {
        const box = pixelTextBox(stampField.value, Number(stampScale.value), stampHalo.checked);
        throw new Error(textFitsVersion(box, 40) ? "too long" : "too wide");
      }
      if (options.version && options.version < minimum) throw new Error("Pixel version too small");
      const { version, ecc } = pixelPlan(options, minimum);
      if (!options.version) versionSelect.options[0].textContent = `Smallest where the text fits (version ${version})`;
      const result2 = solvePixel(options.text, version, stampedTarget(version), ecc, options);
      if (!result2) throw new Error("too long");
      rendered = renderQr(options, result2.matrix);
      extra = ` \xB7 ${result2.painted - result2.unmet} of ${result2.painted} text cells honoured`;
      if (result2.unmet > 0) {
        const fits = fittingVersion(options, ecc, minimum, version);
        warning = fits ? `the text fits from version ${fits}` : "try a bigger version";
      }
    } else {
      if (options.mode === "logo") {
        await prepareLogoPlan(options);
        showLogoSizes(options);
      }
      if (options.mode === "art") await prepareArtPlan(options);
      if (id !== renderId) return;
      rendered = renderQr(options);
    }
    preview.innerHTML = learn.checked ? updateLearn(options.text, rendered, options) : rendered.svg;
  } catch (error) {
    show(null, errorMessage(error, options));
    return;
  }
  current = rendered;
  const { matrix } = rendered;
  stats.textContent = `Version ${matrix.version} \xB7 ${matrix.size}\xD7${matrix.size} modules \xB7 level ${matrix.ecc} \xB7 mask ${matrix.mask} \xB7 ${new TextEncoder().encode(options.text).length} bytes${rendered.note ? ` \xB7 ${rendered.note}` : ""}${extra}`;
  if (warning) {
    const mark = document.createElement("span");
    mark.className = "warn";
    mark.textContent = warning;
    stats.append(" ", mark);
  }
  badge.textContent = "Checking scan\u2026";
  badge.dataset.state = "pending";
  const canvas = await svgToCanvas(rendered.svg, 8);
  if (id !== renderId) return;
  const { data, width, height } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(data, width, height);
  const ok = result?.data === options.text;
  badge.textContent = ok ? "Scans correctly" : "Could not be read back, try less decoration";
  badge.dataset.state = ok ? "ok" : "fail";
}
function showLogoSizes(options) {
  const sizes = logoSizes(options);
  for (const [fit, plan] of Object.entries(sizes)) {
    document.querySelector(`#logo-fit input[value="${fit}"] + span small`).textContent = `${Math.round(plan.fraction * 100)}%`;
  }
}
function errorMessage(error, options) {
  if (error.message === "too wide") return "The text does not fit in the code at this scale. Use a shorter text or a smaller scale.";
  if (error.message === "Pixel version too small") return `The text in the code needs at least version ${pixelMinimum(options)}. Pick a bigger version.`;
  if (error.message === "Version too small") return `Too much text for version ${options.version} at level ${options.ecc ?? "L"}. Pick a bigger version${options.ecc ? " or a lower level" : ""}.`;
  return "Too much text for this mode.";
}
function show(rendered, message) {
  current = rendered;
  preview.innerHTML = "";
  stats.textContent = message;
  badge.textContent = "";
  badge.dataset.state = "";
}
function fileName(extension) {
  const k = kind.value;
  const fields = readFields(k);
  const label = k === "wifi" ? `wifi-${fields.ssid}` : k === "email" ? `email-${fields.address}` : k === "sms" ? `sms-${fields.number}` : k === "vcard" ? `vcard-${fields.first}-${fields.last}` : fields.text.replace(/^[a-z]+:\/\//i, "");
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "");
  return `qr-${slug || "code"}-${checked("mode")}.${extension}`;
}
function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
$("dl-svg").addEventListener("click", () => {
  if (current) download(fileName("svg"), new Blob([current.svg], { type: "image/svg+xml" }));
});
async function downloadRaster(type, extension) {
  if (!current) return;
  const canvas = await svgToCanvas(current.svg, Math.ceil(1200 / (current.matrix.size + 8)));
  canvas.toBlob((blob) => {
    if (!blob || blob.type !== type) {
      badge.textContent = `This browser cannot export ${extension.toUpperCase()}`;
      badge.dataset.state = "fail";
      return;
    }
    download(fileName(extension), blob);
  }, type);
}
$("dl-png").addEventListener("click", () => downloadRaster("image/png", "png"));
$("dl-webp").addEventListener("click", () => downloadRaster("image/webp", "webp"));
$("logo").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  logo = file ? await loadImage(file, 512) : defaultLogo;
  update();
});
$("art").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  art = file ? await loadImage(file, 1024) : defaultArt;
  artOffset = { x: 0, y: 0 };
  artZoom.value = file ? "1" : DEFAULT_ART_SIZE;
  update();
});
$("art-reset").addEventListener("click", () => {
  artOffset = { x: 0, y: 0 };
  artZoom.value = art === defaultArt ? DEFAULT_ART_SIZE : "1";
  update();
});
function syncHex(colorInput, hexInput) {
  colorInput.addEventListener("input", () => {
    hexInput.value = colorInput.value;
  });
  hexInput.addEventListener("input", () => {
    const value = hexInput.value.trim();
    const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
    const long = /^#?([0-9a-f]{6})$/i.exec(value);
    const hex = long ? `#${long[1]}` : short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
    hexInput.setCustomValidity(hex ? "" : "Use a hex colour like #3dd6cf");
    hexInput.setAttribute("aria-invalid", String(!hex));
    document.getElementById(`${hexInput.id}-error`).hidden = Boolean(hex);
    if (hex) colorInput.value = hex.toLowerCase();
  });
}
syncHex(fg, $("fg-hex"));
syncHex(bg, $("bg-hex"));
let drag = null;
preview.addEventListener("pointerdown", (event) => {
  if (!preview.hasAttribute("data-draggable")) return;
  const svg = preview.querySelector("svg");
  if (!svg) return;
  const modules = Number(svg.getAttribute("viewBox").split(" ")[2]);
  const modulesPerPixel = modules / svg.getBoundingClientRect().width;
  drag = { x: event.clientX, y: event.clientY, start: { ...artOffset }, modulesPerPixel, frame: 0 };
  preview.classList.add("dragging");
  preview.setPointerCapture(event.pointerId);
  event.preventDefault();
});
preview.addEventListener("pointermove", (event) => {
  if (!drag) return;
  artOffset = {
    x: drag.start.x + (event.clientX - drag.x) * drag.modulesPerPixel,
    y: drag.start.y + (event.clientY - drag.y) * drag.modulesPerPixel
  };
  if (!drag.frame) {
    drag.frame = requestAnimationFrame(() => {
      if (drag) drag.frame = 0;
      update();
    });
  }
});
function endDrag(event) {
  if (!drag) return;
  if (preview.hasPointerCapture(event.pointerId)) preview.releasePointerCapture(event.pointerId);
  drag = null;
  preview.classList.remove("dragging");
  update();
}
preview.addEventListener("pointerup", endDrag);
preview.addEventListener("pointercancel", endDrag);
async function loadDefaults() {
  try {
    defaultLogo = await loadImageFromUrl(DEFAULT_LOGO_URL, 512);
  } catch (error) {
    console.warn("default logo not loaded", error);
  }
  try {
    defaultArt = await loadImageFromUrl(DEFAULT_ART_URL, 1024);
  } catch (error) {
    console.warn("default picture not loaded", error);
  }
  if (!$("logo").files?.length) logo = defaultLogo;
  if (!$("art").files?.length) art = defaultArt;
}
for (let v = 0; v <= 40; v++) {
  const option = document.createElement("option");
  option.value = String(v);
  if (v > 0) option.textContent = `Version ${v} \xB7 ${v * 4 + 17}\xD7${v * 4 + 17}`;
  versionSelect.append(option);
}
setupLearn();
document.querySelectorAll("input, select, textarea").forEach((el) => {
  if (el.id === "logo" || el.id === "art") return;
  el.addEventListener("input", update);
});
update();
loadDefaults().then(update);
