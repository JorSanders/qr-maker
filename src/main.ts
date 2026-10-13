import jsQR from 'jsqr';
import './style.css';
import { fileToDataUrl } from './image';
import type { Ecc } from './qr';
import { renderQr, svgToCanvas, type Mode, type Options, type Rendered } from './render';

const HINTS: Record<Mode, string> = {
  minimal: 'Fewest possible squares: lowest version that fits, plain square modules.',
  logo: 'Uses level H error correction and clears a square in the middle for your logo.',
  art: 'Dots over your image. Function patterns stay solid so it keeps scanning.',
  dots: 'Round dots and rounded corner eyes.',
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const text = $<HTMLTextAreaElement>('text');
const ecc = $<HTMLSelectElement>('ecc');
const fg = $<HTMLInputElement>('fg');
const bg = $<HTMLInputElement>('bg');
const logoSize = $<HTMLInputElement>('logo-size');
const artDot = $<HTMLInputElement>('art-dot');
const preview = $('preview');
const stats = $('stats');
const badge = $('badge');

let logo: string | null = null;
let art: string | null = null;
let current: Rendered | null = null;
let renderId = 0;

const mode = (): Mode =>
  (document.querySelector<HTMLInputElement>('input[name="mode"]:checked')!.value) as Mode;

function readOptions(): Options {
  return {
    text: text.value,
    mode: mode(),
    fg: fg.value,
    bg: bg.value,
    ecc: ecc.value as Ecc,
    logo,
    logoSize: Number(logoSize.value),
    art,
    artDot: Number(artDot.value),
  };
}

async function update() {
  const id = ++renderId;
  const options = readOptions();

  document.querySelectorAll<HTMLElement>('[data-modes]').forEach((el) => {
    el.hidden = !el.dataset.modes!.split(' ').includes(options.mode);
  });
  $('mode-hint').textContent = HINTS[options.mode];
  $('logo-size-out').textContent = `${Math.round(Number(logoSize.value) * 100)}%`;
  $('art-dot-out').textContent = `${Math.round(Number(artDot.value) * 100)}%`;

  if (!options.text) {
    show(null, 'Type something to encode.');
    return;
  }

  let rendered: Rendered;
  try {
    rendered = renderQr(options);
  } catch {
    show(null, 'Too much text for this mode.');
    return;
  }
  current = rendered;
  preview.innerHTML = rendered.svg;
  const { matrix } = rendered;
  stats.textContent =
    `Version ${matrix.version} · ${matrix.size}×${matrix.size} modules · level ${matrix.ecc} · ` +
    `${new TextEncoder().encode(options.text).length} bytes`;
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

$('dl-png').addEventListener('click', async () => {
  if (!current) return;
  const canvas = await svgToCanvas(current.svg, Math.ceil(1200 / (current.matrix.size + 8)));
  canvas.toBlob((blob) => blob && download('qr.png', blob), 'image/png');
});

$<HTMLInputElement>('logo').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  logo = file ? await fileToDataUrl(file, 512) : null;
  update();
});

$<HTMLInputElement>('art').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  art = file ? await fileToDataUrl(file, 1024) : null;
  update();
});

document.querySelectorAll('input, select, textarea').forEach((el) => {
  el.addEventListener('input', update);
});

update();
