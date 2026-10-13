const jsQR = globalThis.jsQR;

import { loadImage } from "./image.js";
import { pixelMinVersion, solvePixel, stampText } from "./pixel.js";
import { compose } from "./presets.js";
import { renderQr, svgToCanvas } from "./render.js";
const HINTS = {
  minimal: "Fewest possible squares: lowest version that fits, level L error correction.",
  logo: "Clears a box in the middle for your logo, as wide as the code can still bear.",
  art: "Dots over your picture. Function patterns stay solid so it keeps scanning.",
  pixel: "Spells your text in the modules. Free padding bits are set to the letters and error correction covers the rest."
};
const DEFAULT_PIXEL_VERSION = 5;
const PIXEL_VERSION_SPAN = 12;
const $ = (id) => document.getElementById(id);
const kind = $("kind");
const payload = $("payload");
const dots = $("dots");
const fg = $("fg");
const bg = $("bg");
const artDot = $("art-dot");
const preview = $("preview");
const stats = $("stats");
const badge = $("badge");
const pixelVersion = $("pixel-version");
const stampField = $("stamp-text");
const stampScale = $("stamp-scale");
const stampHalo = $("stamp-halo");
let logo = null;
let art = null;
let current = null;
let renderId = 0;
let pixelMinV = 1;
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
  return {
    text: readText(),
    mode: checked("mode"),
    fg: fg.value,
    bg: bg.value,
    dots: dots.checked,
    logo,
    logoFit: checked("logo-fit"),
    art,
    artDot: Number(artDot.value)
  };
}
function syncPixelVersions(text) {
  const min = pixelMinVersion(text);
  if (min === null) return null;
  if (min !== pixelMinV || pixelVersion.options.length === 0) {
    const previous = Number(pixelVersion.value) || DEFAULT_PIXEL_VERSION;
    pixelVersion.innerHTML = "";
    for (let v = min; v <= Math.min(40, min + PIXEL_VERSION_SPAN); v++) {
      const option = document.createElement("option");
      option.value = String(v);
      option.textContent = `Version ${v} \xB7 ${v * 4 + 17}\xD7${v * 4 + 17}`;
      pixelVersion.append(option);
    }
    pixelVersion.value = String(Math.max(min, Math.min(previous, min + PIXEL_VERSION_SPAN)));
    pixelMinV = min;
  }
  return Number(pixelVersion.value);
}
function stampedTarget(version) {
  const size = version * 4 + 17;
  const target = new Uint8Array(size * size);
  stampText(target, version, stampField.value, Number(stampScale.value), stampHalo.checked);
  return target;
}
function fittingVersion(text, from) {
  const last = Math.min(40, pixelMinV + PIXEL_VERSION_SPAN);
  for (let v = from + 1; v <= last; v++) {
    const result = solvePixel(text, v, stampedTarget(v));
    if (result && result.unmet === 0) return v;
  }
  return null;
}
async function update() {
  const id = ++renderId;
  const options = readOptions();
  document.querySelectorAll("[data-modes]").forEach((el) => {
    el.hidden = !el.dataset.modes.split(" ").includes(options.mode);
  });
  $("mode-hint").textContent = HINTS[options.mode];
  $("art-dot-out").textContent = `${Math.round(Number(artDot.value) * 100)}%`;
  if (!options.text) {
    show(null, "Type something to encode.");
    return;
  }
  let rendered;
  let extra = "";
  try {
    if (options.mode === "pixel") {
      const version = syncPixelVersions(options.text);
      if (version === null) throw new Error("too long");
      const result2 = solvePixel(options.text, version, stampedTarget(version));
      if (!result2) throw new Error("too long");
      rendered = renderQr(options, result2.matrix);
      extra = ` \xB7 ${result2.painted - result2.unmet} of ${result2.painted} text cells honoured`;
      if (result2.unmet > 0) {
        const fits = fittingVersion(options.text, version);
        extra += fits ? ` (the text fits from version ${fits})` : " (try a bigger version)";
      }
    } else {
      rendered = renderQr(options);
    }
    preview.innerHTML = rendered.svg;
  } catch {
    show(null, "Too much text for this mode.");
    return;
  }
  current = rendered;
  const { matrix } = rendered;
  stats.textContent = `Version ${matrix.version} \xB7 ${matrix.size}\xD7${matrix.size} modules \xB7 level ${matrix.ecc} \xB7 ${new TextEncoder().encode(options.text).length} bytes${rendered.note ? ` \xB7 ${rendered.note}` : ""}${extra}`;
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
  logo = file ? await loadImage(file, 512) : null;
  update();
});
$("art").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  art = file ? (await loadImage(file, 1024)).url : null;
  update();
});
document.querySelectorAll("input, select, textarea").forEach((el) => {
  if (el.id === "logo" || el.id === "art") return;
  el.addEventListener("input", update);
});
update();
