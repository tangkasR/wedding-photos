import mysql from "mysql2/promise";

// Lazy pool — dibuat saat pertama kali digunakan, bukan saat module load
// Ini penting agar env sudah terbaca oleh Next.js sebelum koneksi dibuat
let _pool: mysql.Pool | undefined;

function getPool(): mysql.Pool {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak ditemukan di .env");

  const parsed = new URL(url);
  const user = decodeURIComponent(parsed.username) || "root";
  const password = decodeURIComponent(parsed.password) || "";
  const host = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : 3306;
  const database = parsed.pathname.replace(/^\//, "");

  console.log(`[db] Connecting: ${user}@${host}:${port}/${database}`);

  _pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    supportBigNumbers: true,
    bigNumberStrings: false,
  });

  return _pool;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhotoStatus = "UPLOADING" | "COMPLETE" | "FAILED";

export interface Photo {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  checksum: string;
  uploadedAt: Date;
  downloadCount: number;
  uploaderName: string | null;
  uploaderMessage: string | null;
  deviceInfo: string | null;
  exifData: Record<string, unknown> | null;
  status: PhotoStatus;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function createPhoto(data: {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  uploaderName: string | null;
  uploaderMessage: string | null;
  deviceInfo: string | null;
}): Promise<void> {
  await getPool().execute(
    `INSERT INTO photos
      (id, originalName, storedName, filePath, mimeType, fileSize, checksum,
       uploaderName, uploaderMessage, deviceInfo, status)
     VALUES (?, ?, ?, ?, ?, 0, '', ?, ?, ?, 'UPLOADING')`,
    [
      data.id,
      data.originalName,
      data.storedName,
      data.filePath,
      data.mimeType,
      data.uploaderName,
      data.uploaderMessage,
      data.deviceInfo,
    ]
  );
}

export async function completePhoto(
  id: string,
  data: {
    fileSize: number;
    checksum: string;
    width: number | null;
    height: number | null;
    exifData: Record<string, unknown> | null;
  }
): Promise<void> {
  await getPool().execute(
    `UPDATE photos
     SET fileSize=?, checksum=?, width=?, height=?, exifData=?, status='COMPLETE'
     WHERE id=?`,
    [
      data.fileSize,
      data.checksum,
      data.width,
      data.height,
      data.exifData ? JSON.stringify(data.exifData) : null,
      id,
    ]
  );
}

export async function failPhoto(id: string): Promise<void> {
  await getPool().execute(`UPDATE photos SET status='FAILED' WHERE id=?`, [id]);
}

export async function deletePhoto(id: string): Promise<void> {
  await getPool().execute(`DELETE FROM photos WHERE id=?`, [id]);
}

export async function findPhotoByStoredName(
  storedName: string
): Promise<Photo | null> {
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    `SELECT * FROM photos WHERE storedName=? LIMIT 1`,
    [storedName]
  );
  if (!rows.length) return null;
  return rowToPhoto(rows[0]);
}

export async function updateFilePath(
  id: string,
  filePath: string
): Promise<void> {
  await getPool().execute(`UPDATE photos SET filePath=? WHERE id=?`, [
    filePath,
    id,
  ]);
}

export async function incrementDownloadCount(id: string): Promise<void> {
  await getPool().execute(
    `UPDATE photos SET downloadCount=downloadCount+1 WHERE id=?`,
    [id]
  );
}

export async function getGallery(
  page: number,
  pageSize: number
): Promise<{ photos: Photo[]; total: number }> {
  const limit = Math.max(1, Math.floor(Number(pageSize)));
  const offset = Math.max(0, Math.floor((Number(page) - 1) * limit));

  // Inline integer langsung — hindari ER_WRONG_ARGUMENTS pada LIMIT/OFFSET
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    `SELECT id, originalName, storedName, mimeType, fileSize, width, height,
            uploadedAt, downloadCount, uploaderName, uploaderMessage
     FROM photos
     WHERE status='COMPLETE'
     ORDER BY uploadedAt DESC
     LIMIT ${limit} OFFSET ${offset}`
  );

  const [[countRow]] = await getPool().query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM photos WHERE status='COMPLETE'`
  );

  return {
    photos: rows.map(rowToPhoto),
    total: Number(countRow.total),
  };
}

function rowToPhoto(row: mysql.RowDataPacket): Photo {
  return {
    id: row.id,
    originalName: row.originalName,
    storedName: row.storedName,
    filePath: row.filePath ?? "",
    mimeType: row.mimeType,
    fileSize: Number(row.fileSize ?? 0),
    width: row.width ?? null,
    height: row.height ?? null,
    checksum: row.checksum ?? "",
    uploadedAt: new Date(row.uploadedAt),
    downloadCount: row.downloadCount ?? 0,
    uploaderName: row.uploaderName ?? null,
    uploaderMessage: row.uploaderMessage ?? null,
    deviceInfo: row.deviceInfo ?? null,
    exifData: row.exifData
      ? typeof row.exifData === "string"
        ? JSON.parse(row.exifData)
        : row.exifData
      : null,
    status: row.status as PhotoStatus,
  };
}
