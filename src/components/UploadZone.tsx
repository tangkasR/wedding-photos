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

export default function UploadZone({ onUploaded }: { onUploaded?: (photos: PhotoDTO[]) => void }) {
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
    return () => { files.forEach((f) => URL.revokeObjectURL(f.preview)); };
  }, []); // eslint-disable-line

  const addFiles = useCallback((newFiles: File[]) => {
    const imgs = newFiles.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return ["jpg","jpeg","png","heic","heif","webp","tiff","tif","bmp","gif"].includes(ext) || f.type.startsWith("image/");
    });
    setAllDone(false);
    setFiles((p) => [...p, ...imgs.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
      status: "pending" as const,
      progress: 0,
    }))]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current = 0; setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current++; setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles((p) => { const f = p.find((x) => x.id === id); if (f) URL.revokeObjectURL(f.preview); return p.filter((x) => x.id !== id); });
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
          setFiles((p) => p.map((f) => ids.includes(f.id) ? { ...f, progress: pct, status: "uploading" } : f));
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setFiles((p) => p.map((f) => ids.includes(f.id) ? { ...f, status: "done", progress: 100 } : f));
            resolve(data.photos ?? []);
          } catch { reject(new Error("Respons tidak valid")); }
        } else {
          let msg = "Upload gagal";
          try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch {}
          setFiles((p) => p.map((f) => ids.includes(f.id) ? { ...f, status: "error", error: msg } : f));
          reject(new Error(msg));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Kesalahan jaringan")));
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
      try { uploaded.push(...(await uploadBatch(pending.slice(i, i + 5)))); } catch {}
    }
    setIsUploading(false);
    setAllDone(true);
    if (uploaded.length) onUploaded?.(uploaded);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const fmt = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  /* ── SUCCESS ── */
  if (allDone && doneCount > 0 && pendingCount === 0) {
    return (
      <div className="text-center py-10 px-4">
        <div className="w-[52px] h-[52px] rounded-full bg-sage-light flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-sage">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-display text-2xl text-charcoal mb-1">Terima kasih! 🌸</p>
        <p className="text-[12px] text-muted mb-6">{doneCount} foto berhasil ditambahkan ke galeri</p>
        <button
          onClick={() => { setFiles([]); setAllDone(false); setUploaderName(""); setUploaderMessage(""); }}
          className="bg-transparent border border-border rounded-full px-6 py-2 text-[11px] text-muted cursor-pointer tracking-widest uppercase hover:border-rose hover:text-rose transition-colors duration-200"
        >
          Unggah lagi
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* ── DROP ZONE ── */}
      <div
        onDrop={handleDrop} onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave} onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={[
          "border-[1.5px] border-dashed rounded-[18px] py-9 px-6 text-center cursor-pointer transition-all duration-200",
          isDragging ? "border-rose bg-[#fdf6f3] scale-[1.015]" : "border-border bg-white hover:border-rose/50",
        ].join(" ")}
      >
        <input
          ref={fileInputRef} type="file" multiple accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
        />
        <div className={[
          "w-[46px] h-[46px] rounded-full bg-blush flex items-center justify-center mx-auto mb-4 transition-transform duration-200",
          isDragging ? "scale-110" : "scale-100",
        ].join(" ")}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-rose">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="font-display text-xl text-charcoal mb-1">
          {isDragging ? "Lepaskan di sini" : "Tambah Fotomu"}
        </p>
        <p className="text-[11px] text-muted">Ketuk untuk memilih · atau seret &amp; lepas</p>
        <p className="text-[10px] text-muted mt-1 opacity-65">JPG · PNG · HEIC · semua format</p>
      </div>

      {/* ── NOTE ── */}
      <p className="mt-2 text-[10.5px] text-muted text-center leading-relaxed opacity-80">
        ⚠️ Foto yang sudah diunggah <strong>tidak dapat diubah atau dihapus</strong>. Pastikan fotomu sudah tepat.
      </p>

      {/* ── PREVIEW GRID ── */}
      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-muted mb-2 tracking-wide">
            Pratinjau — {files.length} foto dipilih
          </p>
          <div className="grid gap-[6px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))" }}>
            {files.map((uf) => (
              <div key={uf.id} className="relative aspect-square rounded-[10px] overflow-hidden bg-border">

                {/* Thumbnail */}
                <img
                  src={uf.preview}
                  alt={uf.file.name}
                  onClick={() => setPreviewPhoto(uf)}
                  className={[
                    "w-full h-full object-cover block cursor-zoom-in transition-transform duration-300 hover:scale-105",
                    uf.status === "done" ? "brightness-[0.6]" : "",
                  ].join(" ")}
                />

                {/* Uploading overlay */}
                {uf.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1">
                    <div className="w-9 h-[3px] rounded-sm bg-white/20 overflow-hidden">
                      <div className="shimmer h-full rounded-sm transition-[width] duration-300" style={{ width: `${uf.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-white">{uf.progress}%</span>
                  </div>
                )}

                {/* Done overlay */}
                {uf.status === "done" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {uf.status === "error" && (
                  <div className="absolute inset-0 bg-red-500/15 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Remove btn */}
                {uf.status === "pending" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(uf.id); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 border-none cursor-pointer text-white flex items-center justify-center"
                  >
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {/* Size badge */}
                {uf.status === "pending" && (
                  <div className="absolute bottom-1 left-1 bg-black/55 rounded px-1 text-[9px] text-white">
                    {fmt(uf.file.size)}
                  </div>
                )}
              </div>
            ))}

            {/* Add more */}
            {!isUploading && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-[10px] border-[1.5px] border-dashed border-border bg-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors duration-200 hover:border-rose"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-muted">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[9px] text-muted text-center">Tambah</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── OPTIONAL FIELDS ── */}
      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <input
            type="text" placeholder="Namamu (opsional)"
            value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} maxLength={200}
            className="w-full px-[13px] py-[9px] rounded-[11px] border border-border bg-white text-[12px] text-charcoal outline-none focus:border-rose transition-colors duration-200"
          />
          <textarea
            placeholder="Pesan kecil (opsional)"
            value={uploaderMessage} onChange={(e) => setUploaderMessage(e.target.value)} maxLength={300} rows={2}
            className="w-full px-[13px] py-[9px] rounded-[11px] border border-border bg-white text-[12px] text-charcoal outline-none resize-none focus:border-rose transition-colors duration-200"
          />
        </div>
      )}

      {/* ── UPLOAD BUTTON ── */}
      {pendingCount > 0 && (
        <button
          onClick={handleUpload} disabled={isUploading}
          className={[
            "mt-4 w-full py-[13px] rounded-[13px] border-none text-white text-[12px] font-medium tracking-widest uppercase transition-opacity duration-200 bg-rose",
            isUploading ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:opacity-90",
          ].join(" ")}
        >
          {isUploading ? "Mengunggah…" : `Unggah ${pendingCount} Foto`}
        </button>
      )}

      {/* ── PREVIEW LIGHTBOX ── */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[999] bg-[rgba(16,13,11,0.96)] flex items-center justify-center animate-[fadeUp_0.18s_ease_both]"
        >
          {/* Close */}
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/[0.08] border-none cursor-pointer text-white flex items-center justify-center z-10 hover:bg-white/[0.15] transition-colors duration-200"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          {(() => {
            const idx = files.findIndex((f) => f.id === previewPhoto.id);
            return idx > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewPhoto(files[idx - 1]); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/[0.08] border-none cursor-pointer text-white flex items-center justify-center z-10 hover:bg-white/[0.15] transition-colors duration-200"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : null;
          })()}

          {/* Next */}
          {(() => {
            const idx = files.findIndex((f) => f.id === previewPhoto.id);
            return idx < files.length - 1 ? (
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewPhoto(files[idx + 1]); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/[0.08] border-none cursor-pointer text-white flex items-center justify-center z-10 hover:bg-white/[0.15] transition-colors duration-200"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : null;
          })()}

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center max-w-[min(90vw,900px)] px-14"
          >
            <img
              src={previewPhoto.preview} alt={previewPhoto.file.name}
              className="max-w-full max-h-[76vh] object-contain rounded-lg block"
            />
            <div className="mt-4 w-full flex items-center justify-between gap-4">
              <div>
                <p className="text-white text-[13px]">{previewPhoto.file.name}</p>
                <p className="text-white/35 text-[11px] mt-[3px]">
                  {fmt(previewPhoto.file.size)}
                  {previewPhoto.file.lastModified && ` · ${new Date(previewPhoto.file.lastModified).toLocaleDateString("id-ID")}`}
                </p>
              </div>
              {previewPhoto.status === "pending" && (
                <button
                  onClick={() => { removeFile(previewPhoto.id); setPreviewPhoto(null); }}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] cursor-pointer hover:bg-red-500/25 transition-colors duration-200"
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
