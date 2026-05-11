import { NextRequest, NextResponse } from "next/server";
import busboy from "busboy";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  createPhoto,
  completePhoto,
  failPhoto,
  deletePhoto,
} from "@/lib/db";
import {
  getUploadDir,
  ensureDir,
  generateStoredFilename,
  computeFileChecksum,
  getRelativePath,
  isAllowedMimeType,
  isAllowedExtension,
} from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import { PhotoDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function parseImageDimensions(
  filePath: string,
  mimeType: string
): Promise<{ width: number | null; height: number | null }> {
  try {
    if (mimeType === "image/heic" || mimeType === "image/heif") {
      return { width: null, height: null };
    }
    const sharp = (await import("sharp")).default;
    const meta = await sharp(filePath, { failOn: "none" }).metadata();
    return { width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

async function parseExifData(
  filePath: string
): Promise<Record<string, unknown> | null> {
  try {
    const exifr = await import("exifr");
    const exif = await exifr.parse(filePath, {
      tiff: true, exif: true, gps: true,
      icc: false, iptc: false, jfif: false, ihdr: false,
    });
    if (!exif) return null;
    return JSON.parse(JSON.stringify(exif));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const rateResult = checkRateLimit(ip);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait before trying again." },
      { status: 429 }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const uploadDir = getUploadDir();
  ensureDir(uploadDir);

  let uploaderName: string | null = null;
  let uploaderMessage: string | null = null;
  const uploadedPhotos: PhotoDTO[] = [];
  const errors: string[] = [];

  return new Promise<NextResponse>((resolve) => {
    const bb = busboy({
      headers: Object.fromEntries(req.headers.entries()),
      limits: { fileSize: Infinity, files: 20, fields: 10 },
    });

    const filePromises: Promise<void>[] = [];

    bb.on("field", (name, value) => {
      if (name === "uploaderName") uploaderName = value.substring(0, 200);
      if (name === "uploaderMessage") uploaderMessage = value.substring(0, 500);
    });

    bb.on("file", (fieldname, fileStream, info) => {
      const { filename, mimeType } = info;

      if (!isAllowedMimeType(mimeType) && !isAllowedExtension(filename)) {
        fileStream.resume();
        errors.push(`File "${filename}" is not an allowed image type.`);
        return;
      }

      const id = uuidv4();
      const storedName = generateStoredFilename(filename || "photo");
      const destPath = path.join(uploadDir, storedName);
      const relPath = getRelativePath(destPath);

      const promise = createPhoto({
        id,
        originalName: filename || "unknown",
        storedName,
        filePath: relPath,
        mimeType: mimeType || "application/octet-stream",
        uploaderName,
        uploaderMessage,
        deviceInfo: req.headers.get("user-agent"),
      })
        .then(async () => {
          const writeStream = fs.createWriteStream(destPath);

          await new Promise<void>((res, rej) => {
            fileStream.pipe(writeStream);
            writeStream.on("finish", res);
            writeStream.on("error", rej);
            fileStream.on("error", rej);
          });

          const stat = fs.statSync(destPath);
          const fileSize = stat.size;

          if (fileSize === 0) {
            fs.unlinkSync(destPath);
            await deletePhoto(id);
            errors.push(`File "${filename}" appears to be empty.`);
            return;
          }

          const [checksum, dimensions, exifData] = await Promise.all([
            computeFileChecksum(destPath),
            parseImageDimensions(destPath, mimeType),
            parseExifData(destPath),
          ]);

          await completePhoto(id, {
            fileSize,
            checksum,
            width: dimensions.width,
            height: dimensions.height,
            exifData,
          });

          uploadedPhotos.push({
            id,
            originalName: filename || "unknown",
            storedName,
            mimeType,
            fileSize,
            width: dimensions.width,
            height: dimensions.height,
            uploadedAt: new Date().toISOString(),
            downloadCount: 0,
            uploaderName,
            uploaderMessage,
            url: `/api/photos/file/${encodeURIComponent(storedName)}`,
            thumbnailUrl: `/api/photos/file/${encodeURIComponent(storedName)}?thumb=1`,
          });
        })
        .catch(async (err: Error) => {
          console.error("Upload error for", filename, err);
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          await failPhoto(id).catch(() => {});
          errors.push(`Failed to upload "${filename}": ${err.message}`);
        });

      filePromises.push(promise);
    });

    bb.on("finish", async () => {
      await Promise.all(filePromises);

      if (uploadedPhotos.length === 0 && errors.length > 0) {
        resolve(NextResponse.json({ success: false, errors }, { status: 400 }));
        return;
      }

      resolve(NextResponse.json({
        success: true,
        uploaded: uploadedPhotos.length,
        photos: uploadedPhotos,
        errors: errors.length > 0 ? errors : undefined,
      }));
    });

    bb.on("error", (err) => {
      console.error("Busboy error:", err);
      resolve(NextResponse.json({ error: "Upload processing failed." }, { status: 500 }));
    });

    if (req.body) {
      const reader = req.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { bb.end(); break; }
          if (!bb.write(value)) await new Promise((r) => bb.once("drain", r));
        }
      };
      pump().catch(() => bb.end());
    } else {
      bb.end();
    }
  });
}
