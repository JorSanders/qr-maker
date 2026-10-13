import { alignmentCenters, buildMatrix, isFinderZone, type Ecc, type Matrix } from './qr';

export type Mode = 'minimal' | 'logo' | 'art' | 'dots';

export interface Options {
  text: string;
  mode: Mode;
  fg: string;
  bg: string;
  ecc: Ecc;
  logo: string | null;
  logoSize: number;
  art: string | null;
  artDot: number;
}

export interface Rendered {
  svg: string;
  matrix: Matrix;
}

const QUIET = 4;
export const MAX_LOGO_AREA = 0.2;

export function renderQr(options: Options): Rendered {
  const ecc: Ecc = options.mode === 'logo' || options.mode === 'art' ? 'H' : options.ecc;
  const matrix = buildMatrix(options.text, ecc);
  const body = {
    minimal: renderMinimal,
    logo: renderLogo,
    art: renderArt,
    dots: renderDots,
  }[options.mode](matrix, options);
  return { svg: wrap(matrix.size, options.bg, body), matrix };
}

function wrap(size: number, bg: string, body: string): string {
  const total = size + QUIET * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-QUIET} ${-QUIET} ${total} ${total}" ` +
    `width="${total * 10}" height="${total * 10}">` +
    `<rect x="${-QUIET}" y="${-QUIET}" width="${total}" height="${total}" fill="${bg}"/>` +
    body +
    `</svg>`
  );
}

function runs(matrix: Matrix, skip: (row: number, col: number) => boolean = () => false): string {
  let d = '';
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

function renderMinimal(matrix: Matrix, { fg }: Options): string {
  return `<path d="${runs(matrix)}" fill="${fg}" shape-rendering="crispEdges"/>`;
}

export function logoBoxModules(size: number, fraction: number): number {
  const capped = Math.min(fraction, Math.sqrt(MAX_LOGO_AREA));
  let n = Math.max(3, Math.round(capped * size));
  if ((n - size) % 2 !== 0) n -= 1;
  return Math.max(n, 3);
}

function renderLogo(matrix: Matrix, { fg, bg, logo, logoSize }: Options): string {
  const n = logoBoxModules(matrix.size, logoSize);
  const from = (matrix.size - n) / 2;
  const inBox = (row: number, col: number) =>
    row >= from && row < from + n && col >= from && col < from + n;
  let out = `<path d="${runs(matrix, inBox)}" fill="${fg}" shape-rendering="crispEdges"/>`;
  if (logo) {
    const pad = 0.5;
    out +=
      `<image href="${logo}" x="${from + pad}" y="${from + pad}" ` +
      `width="${n - pad * 2}" height="${n - pad * 2}" preserveAspectRatio="xMidYMid meet"/>`;
  } else {
    out += `<rect x="${from}" y="${from}" width="${n}" height="${n}" fill="${bg}"/>`;
  }
  return out;
}

function renderDots(matrix: Matrix, { fg }: Options): string {
  const { size } = matrix;
  let dots = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isFinderZone(row, col, size, 7) || !matrix.isDark(row, col)) continue;
      dots += `M${col + 0.5} ${row + 0.05}a0.45 0.45 0 1 1 0 0.9a0.45 0.45 0 1 1 0 -0.9z`;
    }
  }
  const eye = (x: number, y: number) =>
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="0.5" fill="none" stroke="${fg}" stroke-width="1"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.4" fill="${fg}"/>`;
  return (
    `<path d="${dots}" fill="${fg}"/>` +
    eye(0, 0) +
    eye(size - 7, 0) +
    eye(0, size - 7)
  );
}

function renderArt(matrix: Matrix, { fg, bg, art, artDot }: Options): string {
  const { size, version } = matrix;
  const solid = new Set<number>();
  const mark = (row: number, col: number) => {
    if (row >= 0 && col >= 0 && row < size && col < size) solid.add(row * size + col);
  };
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (
        isFinderZone(row, col, size, 9) ||
        row === 6 ||
        col === 6
      ) {
        mark(row, col);
      }
    }
  }
  for (const key of alignmentCenters(version)) {
    const cr = Math.floor(key / size);
    const cc = key % size;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) mark(cr + dr, cc + dc);
  }

  let out = '';
  if (art) {
    out +=
      `<image href="${art}" x="0" y="0" width="${size}" height="${size}" ` +
      `preserveAspectRatio="xMidYMid slice"/>`;
  }
  const inset = (1 - artDot) / 2;
  const dark: string[] = [];
  const light: string[] = [];
  const solidDark: string[] = [];
  const solidLight: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const isDark = matrix.isDark(row, col);
      if (solid.has(row * size + col)) {
        (isDark ? solidDark : solidLight).push(`M${col} ${row}h1v1h-1z`);
      } else {
        const x = col + inset;
        const y = row + inset;
        (isDark ? dark : light).push(`M${x} ${y}h${artDot}v${artDot}h-${artDot}z`);
      }
    }
  }
  out += `<path d="${solidLight.join('')}" fill="${bg}" shape-rendering="crispEdges"/>`;
  out += `<path d="${light.join('')}" fill="${bg}"/>`;
  out += `<path d="${solidDark.join('')}" fill="${fg}" shape-rendering="crispEdges"/>`;
  out += `<path d="${dark.join('')}" fill="${fg}"/>`;
  return out;
}

export async function svgToCanvas(svg: string, pixelsPerModule: number): Promise<HTMLCanvasElement> {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)![1].split(' ').map(Number);
  const side = Math.round(viewBox[2]) * pixelsPerModule;
  const sized = svg.replace(/width="\d+" height="\d+"/, `width="${side}" height="${side}"`);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, side, side);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
