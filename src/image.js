async function loadImage(file, maxSide) {
  if (file.type === "image/svg+xml") {
    const url = await readAsDataUrl(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    return { url, width: img.naturalWidth || 1, height: img.naturalHeight || 1 };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { url: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}
async function loadImageFromUrl(url, maxSide) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not load ${url}: ${response.status}`);
  const blob = await response.blob();
  const name = url.split("/").pop();
  const file = new File([blob], name, { type: blob.type || "image/svg+xml" });
  return loadImage(file, maxSide);
}
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
export {
  loadImage,
  loadImageFromUrl
};
