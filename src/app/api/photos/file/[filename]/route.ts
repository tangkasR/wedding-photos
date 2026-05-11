import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { findPhotoByStoredName, updateFilePath, incrementDownloadCount } from "@/lib/db";
import { STORAGE_BASE } from "@/lib/storage";

export const dynamic = "force-dynamic";

async function findFileInStorage(storedName: string): Promise<string | null> {
  function searchDir(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = searchDir(fullPath);
        if (found) return found;
      } else if (entry.name === storedName) {
        return fullPath;
      }
    }
    return null;
  }
  return searchDir(STORAGE_BASE);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params;
  const isThumb = req.nextUrl.searchParams.get("thumb") === "1";
  const isDownload = req.nextUrl.searchParams.get("download") === "1";

  const storedName = decodeURIComponent(filename);

  if (storedName.includes("..") || storedName.includes("/") || storedName.includes("\\")) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  try {
    const photo = await findPhotoByStoredName(storedName);

    if (!photo || photo.status !== "COMPLETE") {
      return new NextResponse("Photo not found", { status: 404 });
    }

    let absolutePath = path.join(STORAGE_BASE, photo.filePath);

    if (!fs.existsSync(absolutePath)) {
      const found = await findFileInStorage(storedName);
      if (!found) return new NextResponse("File not found on disk", { status: 404 });
      absolutePath = found;
      await updateFilePath(photo.id, path.relative(STORAGE_BASE, absolutePath));
    }

    const stat = fs.statSync(absolutePath);

    // Serve thumbnail (display only — never modifies original)
    if (isThumb && !["image/heic", "image/heif"].includes(photo.mimeType)) {
      try {
        const sharp = (await import("sharp")).default;
        const thumbBuffer = await sharp(absolutePath, { failOn: "none" })
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .toBuffer();

        return new NextResponse(thumbBuffer as unknown as BodyInit, {
          headers: {
            "Content-Type": photo.mimeType.startsWith("image/png") ? "image/png" : "image/jpeg",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      } catch {
        // Fall through to serve original
      }
    }

    // Increment download counter
    if (isDownload) {
      incrementDownloadCount(photo.id).catch(console.error);
    }

    // Stream original file — untouched
    const fileStream = fs.createReadStream(absolutePath);
    const headers: Record<string, string> = {
      "Content-Type": photo.mimeType,
      "Content-Length": stat.size.toString(),
      "Cache-Control": isDownload ? "no-cache" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (isDownload) {
      headers["Content-Disposition"] =
        `attachment; filename*=UTF-8''${encodeURIComponent(photo.originalName)}`;
    }

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) =>
          controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
        );
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() { fileStream.destroy(); },
    });

    return new NextResponse(webStream, { headers });
  } catch (err) {
    console.error("File serve error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
