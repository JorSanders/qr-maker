export interface LoadedImage {
  url: string;
  width: number;
  height: number;
}

export async function loadImage(file: File, maxSide: number): Promise<LoadedImage> {
  if (file.type === 'image/svg+xml') {
    const url = await readAsDataUrl(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    return { url, width: img.naturalWidth || 1, height: img.naturalHeight || 1 };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
