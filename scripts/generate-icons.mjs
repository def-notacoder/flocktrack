/**
 * Generate favicon, PWA, and touch icons from client/public/icon.png.
 * Re-run after replacing the source icon: npm run icons
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../client/public");
const iconsDir = path.join(publicDir, "icons");
const source = path.join(publicDir, "icon.png");

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_BG = "#f7f7f7";

async function writeSquare(size, outPath) {
  await sharp(source).resize(size, size, { fit: "cover" }).png().toFile(outPath);
}

async function writeMaskable(size, outPath) {
  const inner = Math.round(size * 0.75);
  const innerBuf = await sharp(source).resize(inner, inner, { fit: "cover" }).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: MASKABLE_BG },
  })
    .composite([{ input: innerBuf, gravity: "center" }])
    .png()
    .toFile(outPath);
}

await mkdir(iconsDir, { recursive: true });

for (const size of PWA_SIZES) {
  await writeSquare(size, path.join(iconsDir, `icon-${size}x${size}.png`));
}

await writeSquare(180, path.join(iconsDir, "apple-touch-icon.png"));
await writeSquare(16, path.join(publicDir, "favicon-16x16.png"));
await writeSquare(32, path.join(publicDir, "favicon-32x32.png"));
await writeSquare(48, path.join(publicDir, "favicon-48x48.png"));

await writeMaskable(192, path.join(iconsDir, "icon-maskable-192x192.png"));
await writeMaskable(512, path.join(iconsDir, "icon-maskable-512x512.png"));

const favicon16 = await sharp(path.join(publicDir, "favicon-16x16.png")).toBuffer();
const favicon32 = await sharp(path.join(publicDir, "favicon-32x32.png")).toBuffer();
const favicon48 = await sharp(path.join(publicDir, "favicon-48x48.png")).toBuffer();
const ico = await pngToIco([favicon16, favicon32, favicon48]);
await writeFile(path.join(publicDir, "favicon.ico"), ico);

console.log("Icons generated in client/public/icons/");
console.log("Note: logo.png is for in-app use only — not modified by this script.");
