const jsQR = globalThis.jsQR;

import { loadImage, loadImageFromUrl } from "./image.js";
import { pixelMinVersion, pixelTextBox, solvePixel, stampText, textFitsVersion } from "./pixel.js";
import { compose } from "./presets.js";
import { renderQr, svgToCanvas } from "./render.js";
const HINTS = {
  minimal: "Fewest possible squares: lowest version that fits, level L error correction.",
  logo: "Clears a box in the middle for your logo, as wide as the code can still bear.",
  art: "Dots over your picture. Function patterns stay solid so it keeps scanning.",
  pixel: "Spells your text in the modules. Free padding bits are set to the letters and error correction covers the rest."
};
const DEFAULT_LOGO_URL = "./brand/logo/wordmark-tile.svg";
const DEFAULT_ART_URL = "./brand/logo/mark.svg";
const DEFAULT_ART_SIZE = "0.45";
const DEFAULT_PIXEL_VERSION = 5;
const PIXEL_VERSION_SPAN = 12;
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
const pixelVersion = $("pixel-version");
const stampField = $("stamp-text");
const stampScale = $("stamp-scale");
const stampHalo = $("stamp-halo");
let defaultLogo = null;
let defaultArt = null;
let logo = null;
let art = null;
let artOffset = { x: 0, y: 0 };
let current = null;
let renderId = 0;
let pixelMinV = 1;
let autoPixelVersion = true;
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
    artDot: Number(artDot.value),
    artZoom: Number(artZoom.value),
    artOffset
  };
}
function syncPixelVersions(text) {
  const min = pixelMinVersion(text, stampField.value, Number(stampScale.value), stampHalo.checked);
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
  $("art-zoom-out").textContent = `${Math.round(Number(artZoom.value) * 100)}%`;
  preview.toggleAttribute("data-draggable", options.mode === "art" && Boolean(options.art));
  if (!options.text) {
    show(null, "Type something to encode.");
    return;
  }
  let rendered;
  let extra = "";
  let warning = "";
  try {
    if (options.mode === "pixel") {
      let version = syncPixelVersions(options.text);
      if (version === null) {
        const box = pixelTextBox(stampField.value, Number(stampScale.value), stampHalo.checked);
        throw new Error(textFitsVersion(box, 40) ? "too long" : "too wide");
      }
      if (autoPixelVersion) {
        const smallest = fittingVersion(options.text, pixelMinV - 1);
        if (smallest !== null) {
          pixelVersion.value = String(smallest);
          version = smallest;
        }
        autoPixelVersion = false;
      }
      const result2 = solvePixel(options.text, version, stampedTarget(version));
      if (!result2) throw new Error("too long");
      rendered = renderQr(options, result2.matrix);
      extra = ` \xB7 ${result2.painted - result2.unmet} of ${result2.painted} text cells honoured`;
      if (result2.unmet > 0) {
        const fits = fittingVersion(options.text, version);
        warning = fits ? `the text fits from version ${fits}` : "try a bigger version";
      }
    } else {
      rendered = renderQr(options);
    }
    preview.innerHTML = rendered.svg;
  } catch (error) {
    show(null, error.message === "too wide" ? "The text does not fit in the code at this scale. Use a shorter text or a smaller scale." : "Too much text for this mode.");
    return;
  }
  current = rendered;
  const { matrix } = rendered;
  stats.textContent = `Version ${matrix.version} \xB7 ${matrix.size}\xD7${matrix.size} modules \xB7 level ${matrix.ecc} \xB7 ${new TextEncoder().encode(options.text).length} bytes${rendered.note ? ` \xB7 ${rendered.note}` : ""}${extra}`;
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
for (const id of ["stamp-text", "stamp-scale", "stamp-halo"]) {
  $(id).addEventListener("input", () => {
    autoPixelVersion = true;
  });
}
document.querySelectorAll("input, select, textarea").forEach((el) => {
  if (el.id === "logo" || el.id === "art") return;
  el.addEventListener("input", update);
});
update();
loadDefaults().then(update);
