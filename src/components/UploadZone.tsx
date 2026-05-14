"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PhotoDTO } from "@/types";

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export default function UploadZone({
  onUploaded,
}: {
  onUploaded?: (photos: PhotoDTO[]) => void;
}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderMessage, setUploaderMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<UploadFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, []); // eslint-disable-line

  const addFiles = useCallback((newFiles: File[]) => {
    const imgs = newFiles.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return (
        [
          "jpg",
          "jpeg",
          "png",
          "heic",
          "heif",
          "webp",
          "tiff",
          "tif",
          "bmp",
          "gif",
        ].includes(ext) || f.type.startsWith("image/")
      );
    });
    setAllDone(false);
    setFiles((p) => [
      ...p,
      ...imgs.map((f) => ({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
        status: "pending" as const,
        progress: 0,
      })),
    ]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles((p) => {
      const f = p.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.preview);
      return p.filter((x) => x.id !== id);
    });
    if (previewPhoto?.id === id) setPreviewPhoto(null);
  };

  const uploadBatch = async (batch: UploadFile[]): Promise<PhotoDTO[]> => {
    const formData = new FormData();
    if (uploaderName) formData.append("uploaderName", uploaderName);
    if (uploaderMessage) formData.append("uploaderMessage", uploaderMessage);
    batch.forEach((uf) => formData.append("files", uf.file, uf.file.name));
    const ids = batch.map((b) => b.id);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setFiles((p) =>
            p.map((f) =>
              ids.includes(f.id)
                ? { ...f, progress: pct, status: "uploading" }
                : f
            )
          );
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setFiles((p) =>
              p.map((f) =>
                ids.includes(f.id) ? { ...f, status: "done", progress: 100 } : f
              )
            );
            resolve(data.photos ?? []);
          } catch {
            reject(new Error("Respons tidak valid"));
          }
        } else {
          let msg = "Upload gagal";
          try {
            msg = JSON.parse(xhr.responseText).error ?? msg;
          } catch {}
          setFiles((p) =>
            p.map((f) =>
              ids.includes(f.id) ? { ...f, status: "error", error: msg } : f
            )
          );
          reject(new Error(msg));
        }
      });
      xhr.addEventListener("error", () =>
        reject(new Error("Kesalahan jaringan"))
      );
      xhr.open("POST", "/api/photos/upload");
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setIsUploading(true);
    const uploaded: PhotoDTO[] = [];
    for (let i = 0; i < pending.length; i += 5) {
      try {
        uploaded.push(...(await uploadBatch(pending.slice(i, i + 5))));
      } catch {}
    }
    setIsUploading(false);
    setAllDone(true);
    if (uploaded.length) onUploaded?.(uploaded);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const fmt = (b: number) =>
    b < 1048576
      ? `${(b / 1024).toFixed(0)} KB`
      : `${(b / 1048576).toFixed(1)} MB`;

  /* ── SUCCESS ── */
  if (allDone && doneCount > 0 && pendingCount === 0) {
    return (
      <div className="text-center py-10 px-4 bg-sage-light rounded-2xl border-2 border-sage">
        <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center mx-auto mb-4">
          <svg
            width="28"
            height="28"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="font-display text-2xl font-semibold text-charcoal mb-1">
          Terima kasih! 🌸
        </p>
        <p className="text-[14px] text-muted font-medium mb-5">
          {doneCount} foto berhasil ditambahkan ke galeri
        </p>
        <button
          onClick={() => {
            setFiles([]);
            setAllDone(false);
            setUploaderName("");
            setUploaderMessage("");
          }}
          className="bg-white border-2 border-border-strong rounded-full px-6 py-2 text-[13px] font-semibold text-charcoal cursor-pointer hover:border-rose hover:text-rose transition-colors duration-200"
        >
          Unggah foto lagi
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ── DROP ZONE ── */}
      <div
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={[
          "border-2 rounded-2xl py-10 px-6 text-center cursor-pointer transition-all duration-200",
          isDragging
            ? "border-rose bg-rose-light scale-[1.01]"
            : "border-border-strong bg-cream-soft hover:border-rose hover:bg-rose-light",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              addFiles(Array.from(e.target.files));
              e.target.value = "";
            }
          }}
        />
        <div
          className={[
            "w-16 h-16 rounded-full bg-rose flex items-center justify-center mx-auto mb-4 transition-transform duration-200",
            isDragging ? "scale-110" : "",
          ].join(" ")}
        >
          <svg
            width="28"
            height="28"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <p className="font-display text-2xl font-semibold text-charcoal mb-1">
          {isDragging ? "Lepaskan di sini" : "Tambah Fotomu"}
        </p>
        <p className="text-[14px] text-muted font-medium">
          Ketuk untuk memilih foto · atau seret &amp; lepas
        </p>
        <p className="text-[12px] text-subtle mt-1">
          JPG · PNG · HEIC · semua format didukung
        </p>
      </div>

      {/* ── NOTE ── */}
      <div className="mt-3 flex items-start gap-2 p-3 bg-gold-light border border-[#c8a870] rounded-xl">
        <span className="text-[16px] mt-[1px]">⚠️</span>
        <p className="text-[12px] text-body font-medium leading-relaxed">
          Foto yang sudah diunggah{" "}
          <strong className="text-charcoal">
            tidak dapat diubah atau dihapus
          </strong>
          . Pastikan foto yang kamu pilih sudah tepat sebelum mengunggah.
        </p>
      </div>

      {/* ── PREVIEW GRID ── */}
      {files.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-charcoal mb-2">
            Pratinjau —{" "}
            <span className="text-rose">{files.length} foto dipilih</span>
          </p>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
            }}
          >
            {files.map((uf) => (
              <div
                key={uf.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-cream-mid border-2 border-border"
              >
                <img
                  src={uf.preview}
                  alt={uf.file.name}
                  onClick={() => setPreviewPhoto(uf)}
                  className={[
                    "w-full h-full object-cover block cursor-zoom-in transition-transform duration-300 hover:scale-105",
                    uf.status === "done" ? "brightness-50" : "",
                  ].join(" ")}
                />
                {uf.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                    <div className="w-10 h-[3px] rounded-sm bg-white/30 overflow-hidden">
                      <div
                        className="shimmer h-full rounded-sm transition-[width] duration-300"
                        style={{ width: `${uf.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-white font-semibold">
                      {uf.progress}%
                    </span>
                  </div>
                )}
                {uf.status === "done" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center">
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="white"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
                {uf.status === "error" && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="white"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  </div>
                )}
                {uf.status === "pending" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(uf.id);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-charcoal/70 border-none cursor-pointer text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 text-[10px] text-white font-medium">
                      {fmt(uf.file.size)}
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add more */}
            {!isUploading && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border-strong bg-cream-soft flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors duration-200 hover:border-rose hover:bg-rose-light"
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="text-muted"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-[10px] font-semibold text-muted">
                  Tambah
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── OPTIONAL FIELDS ── */}
      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <div>
            <label className="block text-[12px] font-semibold text-charcoal mb-1">
              Nama kamu (opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Budi & Siti"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              maxLength={200}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-charcoal outline-none focus:border-rose transition-colors duration-200 font-medium placeholder:text-subtle placeholder:font-normal"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-charcoal mb-1">
              Pesan untuk pengantin (opsional)
            </label>
            <textarea
              placeholder="Tulis doa atau ucapan selamat..."
              value={uploaderMessage}
              onChange={(e) => setUploaderMessage(e.target.value)}
              maxLength={300}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-charcoal outline-none resize-none focus:border-rose transition-colors duration-200 font-medium placeholder:text-subtle placeholder:font-normal"
            />
          </div>
        </div>
      )}

      {/* ── UPLOAD BUTTON ── */}
      {pendingCount > 0 && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={[
            "mt-4 w-full py-4 rounded-2xl border-none text-white text-[15px] font-bold tracking-wide transition-all duration-200 bg-rose",
            isUploading
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer hover:bg-rose-dark active:scale-[0.98]",
          ].join(" ")}
        >
          {isUploading
            ? "⏳ Sedang Mengunggah..."
            : `📤 Unggah ${pendingCount} Foto`}
        </button>
      )}

      {/* ── PREVIEW LIGHTBOX ── */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(16,13,11,0.97)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border-none cursor-pointer text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {(() => {
            const idx = files.findIndex((f) => f.id === previewPhoto.id);
            return idx > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewPhoto(files[idx - 1]);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border-none cursor-pointer text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            ) : null;
          })()}

          {(() => {
            const idx = files.findIndex((f) => f.id === previewPhoto.id);
            return idx < files.length - 1 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewPhoto(files[idx + 1]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border-none cursor-pointer text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ) : null;
          })()}

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center max-w-[min(90vw,900px)] px-14"
          >
            <img
              src={previewPhoto.preview}
              alt={previewPhoto.file.name}
              className="max-w-full max-h-[76vh] object-contain rounded-lg block"
            />
            <div className="mt-4 w-full flex items-center justify-between gap-4">
              <div>
                <p className="text-white text-[14px] font-semibold">
                  {previewPhoto.file.name}
                </p>
                <p className="text-white/50 text-[12px] mt-1">
                  {fmt(previewPhoto.file.size)}
                  {previewPhoto.file.lastModified &&
                    ` · ${new Date(
                      previewPhoto.file.lastModified
                    ).toLocaleDateString("id-ID")}`}
                </p>
              </div>
              {previewPhoto.status === "pending" && (
                <button
                  onClick={() => {
                    removeFile(previewPhoto.id);
                    setPreviewPhoto(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-400 text-red-300 text-[12px] font-semibold cursor-pointer hover:bg-red-500/30 transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Hapus foto ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
