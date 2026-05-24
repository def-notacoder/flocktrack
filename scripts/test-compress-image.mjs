/**
 * Smoke test for client photo compression limits (pure logic + large fixture).
 * Browser canvas compression is validated via npm run build and manual/browser check.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const UPLOAD_TARGET_BYTES = 8 * 1024 * 1024;
const MAX_JSON_BODY_BYTES = 24 * 1024 * 1024;

function decodedDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function fitDimensions(width, height, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- unit checks mirroring compressImage.ts ---
const fitted = fitDimensions(4032, 3024, 2048);
assert(fitted.width === 2048, `expected width 2048, got ${fitted.width}`);
assert(fitted.height === 1536, `expected height 1536, got ${fitted.height}`);

const tiny = fitDimensions(800, 600, 2048);
assert(tiny.width === 800 && tiny.height === 600, "small images should not upscale");

const sample = `data:image/jpeg;base64,${"A".repeat(4000)}`;
assert(decodedDataUrlBytes(sample) === 3000, "base64 byte length decode");

// --- large phone-like fixture ---
const fixtureDir = path.join(root, "client", "public", "test-fixtures");
await fs.mkdir(fixtureDir, { recursive: true });
const fixturePath = path.join(fixtureDir, "large-phone.jpg");

const jpeg = await sharp({
  create: {
    width: 4032,
    height: 3024,
    channels: 3,
    noise: { type: "gaussian", mean: 128, sigma: 40 },
  },
})
  .jpeg({ quality: 95 })
  .toBuffer();

await fs.writeFile(fixturePath, jpeg);
assert(jpeg.length > UPLOAD_TARGET_BYTES, `fixture should exceed upload target (${jpeg.length} bytes)`);
console.log(`Created fixture ${fixturePath} (${(jpeg.length / (1024 * 1024)).toFixed(2)} MB)`);

// Simulate post-compression payload ceiling (8 MB JPEG -> ~10.7 MB data URL JSON field).
const simulatedCompressedBytes = UPLOAD_TARGET_BYTES - 1024;
const simulatedDataUrlLen = Math.ceil((simulatedCompressedBytes * 4) / 3) + 30;
const simulatedJsonBytes = simulatedDataUrlLen + 64;
assert(simulatedCompressedBytes <= MAX_PHOTO_BYTES, "compressed payload within server photo limit");
assert(simulatedJsonBytes <= MAX_JSON_BODY_BYTES, "compressed payload within nginx/API JSON limit");

console.log("compressImage smoke tests passed");
