/**
 * Converts client/public/logo.png (often a JPEG mislabeled as PNG) to a true RGBA PNG.
 * Makes edge-connected black background pixels transparent.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../client/public/logo.png");
const output = path.join(__dirname, "../client/public/logo.png");
const tmp = path.join(__dirname, "../client/public/logo.tmp.png");

const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;

function isBackground(r, g, b) {
  return r <= 2 && g <= 2 && b <= 2;
}

const get = (x, y) => {
  const i = (w * y + x) * ch;
  return [data[i], data[i + 1], data[i + 2]];
};

const transparent = new Uint8Array(w * h);
const queue = [];
for (let x = 0; x < w; x++) {
  queue.push([x, 0], [x, h - 1]);
}
for (let y = 0; y < h; y++) {
  queue.push([0, y], [w - 1, y]);
}

while (queue.length) {
  const item = queue.pop();
  if (!item) continue;
  const [x, y] = item;
  if (x < 0 || y < 0 || x >= w || y >= h) continue;
  const idx = w * y + x;
  if (transparent[idx]) continue;
  const [r, g, b] = get(x, y);
  if (!isBackground(r, g, b)) continue;
  transparent[idx] = 1;
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

const rgba = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const si = (w * y + x) * ch;
    const di = (w * y + x) * 4;
    rgba[di] = data[si];
    rgba[di + 1] = data[si + 1];
    rgba[di + 2] = data[si + 2];
    rgba[di + 3] = transparent[w * y + x] ? 0 : 255;
  }
}

await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toFile(tmp);
fs.renameSync(tmp, output);

const meta = await sharp(output).metadata();
console.log(`Wrote ${output} — ${meta.format} ${meta.width}x${meta.height} alpha=${meta.hasAlpha}`);
