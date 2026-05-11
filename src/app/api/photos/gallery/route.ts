import { NextRequest, NextResponse } from "next/server";
import { getGallery } from "@/lib/db";
import { PhotoDTO, GalleryResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "24", 10)));

  try {
    const { photos, total } = await getGallery(page, pageSize);

    const photoDTOs: PhotoDTO[] = photos.map((p) => ({
      id: p.id,
      originalName: p.originalName,
      storedName: p.storedName,
      mimeType: p.mimeType,
      fileSize: p.fileSize,
      width: p.width,
      height: p.height,
      uploadedAt: p.uploadedAt.toISOString(),
      downloadCount: p.downloadCount,
      uploaderName: p.uploaderName,
      uploaderMessage: p.uploaderMessage,
      url: `/api/photos/file/${encodeURIComponent(p.storedName)}`,
      thumbnailUrl: `/api/photos/file/${encodeURIComponent(p.storedName)}?thumb=1`,
    }));

    const response: GalleryResponse = {
      photos: photoDTOs,
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + photos.length < total,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("Gallery fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch gallery." }, { status: 500 });
  }
}
