import jsQR from 'jsqr';
import './style.css';
import { loadImage, type LoadedImage } from './image';
import { pixelMinVersion, solvePixel, stampText } from './pixel';
import { compose, type Fields, type Kind } from './presets';
import { renderQr, svgToCanvas, type LogoFit, type Mode, type Options, type Rendered } from './render';

const HINTS: Record<Mode, string> = {
  minimal: 'Fewest possible squares: lowest version that fits, level L error correction.',
  logo: 'Clears a box in the middle for your logo, as wide as the code can still bear.',
  art: 'Dots over your picture. Function patterns stay solid so it keeps scanning.',
  pixel:
    'Spells your text in the modules. Free padding bits are set to the letters and error correction covers the rest.',
};

const DEFAULT_PIXEL_VERSION = 5;
const PIXEL_VERSION_SPAN = 12;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const kind = $<HTMLSelectElement>('kind');
const payload = $<HTMLPreElement>('payload');
const dots = $<HTMLInputElement>('dots');
const fg = $<HTMLInputElement>('fg');
const bg = $<HTMLInputElement>('bg');
const artDot = $<HTMLInputElement>('art-dot');
const preview = $('preview');
const stats = $('stats');
const badge = $('badge');
const pixelVersion = $<HTMLSelectElement>('pixel-version');
const stampField = $<HTMLInputElement>('stamp-text');
const stampScale = $<HTMLSelectElement>('stamp-scale');
const stampHalo = $<HTMLInputElement>('stamp-halo');

let logo: LoadedImage | null = null;
let art: string | null = null;
let current: Rendered | null = null;
let renderId = 0;

let pixelMinV = 1;

const checked = (name: string) =>
  document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!.value;

function readFields(k: Kind): Fields {
  const fields: Fields = {};
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[data-kind="${k}"] [data-field]`,
    )
    .forEach((el) => {
      const name = el.dataset.field!;
      fields[name] =
        el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.checked ? 'true' : '') : el.value;
    });
  return fields;
}

function readText(): string {
  const k = kind.value as Kind;
  const text = compose(k, readFields(k));
  document.querySelectorAll<HTMLElement>('[data-kind]').forEach((el) => {
    el.hidden = el.dataset.kind !== k;
  });
  payload.hidden = k === 'text';
  payload.textContent = text;
  return text;
}

function readOptions(): Options {
  return {
    text: readText(),
    mode: checked('mode') as Mode,
    fg: fg.value,
    bg: bg.value,
    dots: dots.checked,
    logo,
    logoFit: checked('logo-fit') as LogoFit,
    art,
    artDot: Number(artDot.value),
  };
}

function syncPixelVersions(text: string): number | null {
  const min = pixelMinVersion(text);
  if (min === null) return null;
  if (min !== pixelMinV || pixelVersion.options.length === 0) {
    const previous = Number(pixelVersion.value) || DEFAULT_PIXEL_VERSION;
    pixelVersion.innerHTML = '';
    for (let v = min; v <= Math.min(40, min + PIXEL_VERSION_SPAN); v++) {
      const option = document.createElement('option');
      option.value = String(v);
      option.textContent = `Version ${v} · ${v * 4 + 17}×${v * 4 + 17}`;
      pixelVersion.append(option);
    }
    pixelVersion.value = String(Math.max(min, Math.min(previous, min + PIXEL_VERSION_SPAN)));
    pixelMinV = min;
  }
  return Number(pixelVersion.value);
}

function stampedTarget(version: number): Uint8Array {
  const size = version * 4 + 17;
  const target = new Uint8Array(size * size);
  stampText(target, version, stampField.value, Number(stampScale.value), stampHalo.checked);
  return target;
}

function fittingVersion(text: string, from: number): number | null {
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

  document.querySelectorAll<HTMLElement>('[data-modes]').forEach((el) => {
    el.hidden = !el.dataset.modes!.split(' ').includes(options.mode);
  });
  $('mode-hint').textContent = HINTS[options.mode];
  $('art-dot-out').textContent = `${Math.round(Number(artDot.value) * 100)}%`;

  if (!options.text) {
    show(null, 'Type something to encode.');
    return;
  }

  let rendered: Rendered;
  let extra = '';
  try {
    if (options.mode === 'pixel') {
      const version = syncPixelVersions(options.text);
      if (version === null) throw new Error('too long');
      const result = solvePixel(options.text, version, stampedTarget(version));
      if (!result) throw new Error('too long');
      rendered = renderQr(options, result.matrix);
      extra = ` · ${result.painted - result.unmet} of ${result.painted} text cells honoured`;
      if (result.unmet > 0) {
        const fits = fittingVersion(options.text, version);
        extra += fits ? ` (the text fits from version ${fits})` : ' (try a bigger version)';
      }
    } else {
      rendered = renderQr(options);
    }
    preview.innerHTML = rendered.svg;
  } catch {
    show(null, 'Too much text for this mode.');
    return;
  }
  current = rendered;
  const { matrix } = rendered;
  stats.textContent =
    `Version ${matrix.version} · ${matrix.size}×${matrix.size} modules · level ${matrix.ecc} · ` +
    `${new TextEncoder().encode(options.text).length} bytes${rendered.note ? ` · ${rendered.note}` : ''}${extra}`;
  badge.textContent = 'Checking scan…';
  badge.dataset.state = 'pending';

  const canvas = await svgToCanvas(rendered.svg, 8);
  if (id !== renderId) return;
  const { data, width, height } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(data, width, height);
  const ok = result?.data === options.text;
  badge.textContent = ok ? 'Scans correctly' : 'Could not be read back, try less decoration';
  badge.dataset.state = ok ? 'ok' : 'fail';
}

function show(rendered: Rendered | null, message: string) {
  current = rendered;
  preview.innerHTML = '';
  stats.textContent = message;
  badge.textContent = '';
  badge.dataset.state = '';
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

$('dl-svg').addEventListener('click', () => {
  if (current) download('qr.svg', new Blob([current.svg], { type: 'image/svg+xml' }));
});

async function downloadRaster(type: string, extension: string) {
  if (!current) return;
  const canvas = await svgToCanvas(current.svg, Math.ceil(1200 / (current.matrix.size + 8)));
  canvas.toBlob((blob) => {
    if (!blob || blob.type !== type) {
      badge.textContent = `This browser cannot export ${extension.toUpperCase()}`;
      badge.dataset.state = 'fail';
      return;
    }
    download(`qr.${extension}`, blob);
  }, type);
}

$('dl-png').addEventListener('click', () => downloadRaster('image/png', 'png'));
$('dl-webp').addEventListener('click', () => downloadRaster('image/webp', 'webp'));

$<HTMLInputElement>('logo').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  logo = file ? await loadImage(file, 512) : null;
  update();
});

$<HTMLInputElement>('art').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  art = file ? (await loadImage(file, 1024)).url : null;
  update();
});

document.querySelectorAll('input, select, textarea').forEach((el) => {
  if (el.id === 'logo' || el.id === 'art') return;
  el.addEventListener('input', update);
});

update();
