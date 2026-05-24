import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHICKEN_PHOTO_DIR = path.join(__dirname, "../../uploads/chickens");
const EGG_LOG_PHOTO_DIR = path.join(__dirname, "../../uploads/egg-logs");
const HEALTH_RECORD_PHOTO_DIR = path.join(__dirname, "../../uploads/health-records");
/** Max photo file size — typical phone camera JPEG. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTO_MB = 15;
/** Express JSON body limit; must match nginx client_max_body_size. */
export const MAX_JSON_BODY_MB = 24;

function parsePhotoDataUrl(dataUrl: string): { ext: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i);
  if (!match) {
    throw new Error("Photo must be a JPEG, PNG, WebP, or GIF image");
  }
  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error(`Photo must be ${MAX_PHOTO_MB} MB or smaller`);
  }
  return { ext, buffer };
}

async function writePhoto(dir: string, entityId: string, dataUrl: string, urlPrefix: string): Promise<string> {
  const { ext, buffer } = parsePhotoDataUrl(dataUrl);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${entityId}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${urlPrefix}/${filename}`;
}

async function removePhotos(dir: string, entityId: string): Promise<void> {
  try {
    const files = await fs.readdir(dir);
    await Promise.all(
      files
        .filter((f) => f.startsWith(`${entityId}.`))
        .map((f) => fs.unlink(path.join(dir, f)).catch(() => undefined))
    );
  } catch {
    // uploads dir may not exist yet
  }
}

export async function saveChickenPhoto(chickenId: string, dataUrl: string): Promise<string> {
  return writePhoto(CHICKEN_PHOTO_DIR, chickenId, dataUrl, "/uploads/chickens");
}

export async function deleteChickenPhoto(chickenId: string): Promise<void> {
  await removePhotos(CHICKEN_PHOTO_DIR, chickenId);
}

export async function saveEggLogPhoto(logId: string, dataUrl: string): Promise<string> {
  return writePhoto(EGG_LOG_PHOTO_DIR, logId, dataUrl, "/uploads/egg-logs");
}

export async function deleteEggLogPhoto(logId: string): Promise<void> {
  await removePhotos(EGG_LOG_PHOTO_DIR, logId);
}

/** Apply photo / clearPhoto fields from a PATCH body; returns photoUrl update or undefined. */
export async function resolveLogPhotoPatch(
  logId: string,
  photo?: string,
  clearPhoto?: boolean
): Promise<string | null | undefined> {
  if (clearPhoto) {
    await deleteEggLogPhoto(logId);
    return null;
  }
  if (typeof photo === "string" && photo.trim()) {
    await deleteEggLogPhoto(logId);
    return saveEggLogPhoto(logId, photo.trim());
  }
  return undefined;
}

export async function saveHealthRecordPhoto(recordId: string, dataUrl: string): Promise<string> {
  return writePhoto(HEALTH_RECORD_PHOTO_DIR, recordId, dataUrl, "/uploads/health-records");
}

export async function deleteHealthRecordPhoto(recordId: string): Promise<void> {
  await removePhotos(HEALTH_RECORD_PHOTO_DIR, recordId);
}

export async function resolveHealthRecordPhotoPatch(
  recordId: string,
  photo?: string,
  clearPhoto?: boolean
): Promise<string | null | undefined> {
  if (clearPhoto) {
    await deleteHealthRecordPhoto(recordId);
    return null;
  }
  if (typeof photo === "string" && photo.trim()) {
    await deleteHealthRecordPhoto(recordId);
    return saveHealthRecordPhoto(recordId, photo.trim());
  }
  return undefined;
}
