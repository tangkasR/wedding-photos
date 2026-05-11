export interface PhotoRecord {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  fileSize: bigint | number;
  width: number | null;
  height: number | null;
  checksum: string;
  uploadedAt: Date;
  downloadCount: number;
  uploaderName: string | null;
  uploaderMessage: string | null;
  deviceInfo: string | null;
  exifData: Record<string, unknown> | null;
  status: "UPLOADING" | "COMPLETE" | "FAILED";
}

export interface PhotoDTO {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
  downloadCount: number;
  uploaderName: string | null;
  uploaderMessage: string | null;
  url: string;
  thumbnailUrl: string;
}

export interface UploadResult {
  success: boolean;
  photo?: PhotoDTO;
  error?: string;
}

export interface GalleryResponse {
  photos: PhotoDTO[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
