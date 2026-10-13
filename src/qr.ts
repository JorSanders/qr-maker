import qrcode from 'qrcode-generator';

export type Ecc = 'L' | 'M' | 'Q' | 'H';

export interface Matrix {
  size: number;
  version: number;
  ecc: Ecc;
  isDark: (row: number, col: number) => boolean;
}

export function buildMatrix(text: string, ecc: Ecc): Matrix {
  const qr = qrcode(0, ecc);
  qr.addData(text, 'Byte');
  qr.make();
  const size = qr.getModuleCount();
  return {
    size,
    version: (size - 17) / 4,
    ecc,
    isDark: (row, col) => qr.isDark(row, col),
  };
}

export function isFinderZone(row: number, col: number, size: number, reach: number): boolean {
  return (
    (row < reach && col < reach) ||
    (row < reach && col >= size - reach) ||
    (row >= size - reach && col < reach)
  );
}

export function alignmentCenters(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const centers = [6];
  for (let i = 0, p = size - 7; i < count - 1; i++, p -= step) centers.splice(1, 0, p);
  const last = size - 7;
  const pairs: number[] = [];
  for (const r of centers) {
    for (const c of centers) {
      const onFinder = (r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6);
      if (!onFinder) pairs.push(r * size + c);
    }
  }
  return pairs;
}
