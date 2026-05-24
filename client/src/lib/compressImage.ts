/** Must stay in sync with server MAX_PHOTO_BYTES. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTO_MB = 15;

/** Target decoded JPEG size — keeps base64 JSON well under nginx/API 24 MB limit. */
const UPLOAD_TARGET_BYTES = 3 * 1024 * 1024;
const MAX_EDGE_PX = 1920;
const MIN_EDGE_PX = 640;
const JPEG_MIME = "image/jpeg";

function decodedDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read photo"));
    };
    img.src = url;
  });
}

function fitDimensions(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL(JPEG_MIME, quality);
}

async function compressToJpegDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  targetMaxBytes: number
): Promise<string> {
  const { width, height } = fitDimensions(sourceWidth, sourceHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to prepare photo");

  ctx.drawImage(source, 0, 0, width, height);

  let quality = 0.85;
  let dataUrl = encodeJpeg(canvas, quality);
  let bytes = decodedDataUrlBytes(dataUrl);

  while (bytes > targetMaxBytes && quality > 0.4) {
    quality -= 0.07;
    dataUrl = encodeJpeg(canvas, quality);
    bytes = decodedDataUrlBytes(dataUrl);
  }

  return dataUrl;
}

function shouldCompress(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.includes("heic") || type.includes("heif")) return true;
  if (type === "image/png" || type === "image/webp" || type === "image/gif") return true;
  return file.size > 512 * 1024;
}

/** Resize and recompress phone photos so uploads fit app/nginx limits. */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file");
  }

  if (!shouldCompress(file)) {
    const dataUrl = await readFileAsDataUrl(file);
    if (decodedDataUrlBytes(dataUrl) <= UPLOAD_TARGET_BYTES) {
      return dataUrl;
    }
  }

  const img = await loadImageElement(file);
  let maxEdge = MAX_EDGE_PX;
  let dataUrl = await compressToJpegDataUrl(img, img.naturalWidth, img.naturalHeight, maxEdge, UPLOAD_TARGET_BYTES);
  let bytes = decodedDataUrlBytes(dataUrl);

  while (bytes > UPLOAD_TARGET_BYTES && maxEdge > MIN_EDGE_PX) {
    maxEdge = Math.round(maxEdge * 0.75);
    dataUrl = await compressToJpegDataUrl(img, img.naturalWidth, img.naturalHeight, maxEdge, UPLOAD_TARGET_BYTES);
    bytes = decodedDataUrlBytes(dataUrl);
  }

  if (bytes > MAX_PHOTO_BYTES) {
    throw new Error(`Photo could not be compressed below ${MAX_PHOTO_MB} MB`);
  }

  return dataUrl;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read photo"));
    };
    reader.onerror = () => reject(new Error("Failed to read photo"));
    reader.readAsDataURL(file);
  });
}
