import path from "path";
import fs from "fs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// Resolve the storage base path (relative to project root or absolute)
const STORAGE_BASE = path.resolve(
  process.cwd(),
  process.env.STORAGE_BASE_PATH ?? "./storage/uploads/photos"
);

/**
 * Get organized upload directory by date: YYYY/MM
 */
export function getUploadDir(date: Date = new Date()): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return path.join(STORAGE_BASE, year, month);
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Sanitize the original filename — strip dangerous characters,
 * keep extension intact.
 */
export function sanitizeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const base = path
    .basename(original, ext)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 100);
  return base + ext;
}

/**
 * Generate a collision-safe stored filename.
 * Format: uuid-sanitizedOriginal
 */
export function generateStoredFilename(originalName: string): string {
  const id = uuidv4();
  const sanitized = sanitizeFilename(originalName);
  return `${id}-${sanitized}`;
}

/**
 * Compute SHA-256 checksum of a file on disk.
 */
export async function computeFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Returns the relative path from the storage root to a stored file.
 * Used for DB storage and URL building.
 */
export function getRelativePath(absolutePath: string): string {
  return path.relative(STORAGE_BASE, absolutePath);
}

/**
 * Given a relative path (from DB), return the absolute filesystem path.
 */
export function getAbsolutePath(relativePath: string): string {
  return path.join(STORAGE_BASE, relativePath);
}

/**
 * Allowed MIME types for upload.
 */
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/gif",
]);

/**
 * Allowed file extensions (lowercased).
 */
export const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".webp",
  ".tiff",
  ".tif",
  ".bmp",
  ".gif",
]);

/**
 * Validate a MIME type is in the allowed list.
 */
export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime.toLowerCase());
}

/**
 * Validate a file extension is allowed.
 */
export function isAllowedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Returns the public URL path for a stored file.
 */
export function getFileUrl(storedName: string, relativeDir: string): string {
  // We serve files via our own API route, not directly from /public
  return `/api/photos/file/${encodeURIComponent(storedName)}`;
}

export { STORAGE_BASE };
