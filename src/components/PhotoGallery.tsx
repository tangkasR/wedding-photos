"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { PhotoDTO, GalleryResponse } from "@/types";

const fmt = (b: number) =>
  b < 1048576
    ? `${(b / 1024).toFixed(0)} KB`
    : `${(b / 1048576).toFixed(1)} MB`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/* ── LIGHTBOX — rendered via portal ke document.body ── */
function Lightbox({
  photo,
  onClose,
  onPrev,
  onNext,
}: {
  photo: PhotoDTO;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    // Simpan posisi scroll sebelum dikunci
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", h);

    return () => {
      // Kembalikan scroll ke posisi semula
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo({ top: scrollY, behavior: "instant" });
      window.removeEventListener("keydown", h);
    };
  }, [onClose, onPrev, onNext]);

  const NavBtn = ({
    onClick,
    children,
  }: {
    onClick: (e: React.MouseEvent) => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full border-none cursor-pointer text-white flex items-center justify-center transition-colors duration-200"
      style={{ background: "rgba(255,255,255,0.08)" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.16)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
      }
    >
      {children}
    </button>
  );

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(16,13,11,0.97)",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeUp 0.2s ease both",
      }}
    >
      {/* Tombol Close */}
      <div
        style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 1 }}
      >
        <NavBtn
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </NavBtn>
      </div>

      {/* Tombol Prev */}
      {onPrev && (
        <div
          style={{
            position: "absolute",
            left: "1rem",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
          }}
        >
          <NavBtn
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </NavBtn>
        </div>
      )}

      {/* Tombol Next */}
      {onNext && (
        <div
          style={{
            position: "absolute",
            right: "1rem",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
          }}
        >
          <NavBtn
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </NavBtn>
        </div>
      )}

      {/* Konten: close di atas, foto di tengah, info+unduh di bawah */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "min(88vw, 960px)",
          height: "90dvh",
          maxHeight: "90dvh",
          boxSizing: "border-box",
          overflow: "hidden",
          paddingTop: "48px",
          paddingBottom: "0px",
          gap: "10px",
        }}
      >
        {/* Foto — mengisi sisa ruang */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={photo.thumbnailUrl}
            alt={photo.originalName}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: "6px",
            }}
          />
        </div>

        {/* Footer bar — nama, pesan, tanggal + tombol unduh */}
        <div
          style={{
            width: "100%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "10px 0 16px",
          }}
        >
          {/* Info kiri */}
          <div style={{ minWidth: 0, flex: 1 }}>
            {photo.uploaderName && (
              <p
                className="font-display"
                style={{
                  color: "white",
                  fontSize: "1rem",
                  lineHeight: 1.3,
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {photo.uploaderName}
              </p>
            )}
            {photo.uploaderMessage && (
              <p
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "12px",
                  fontStyle: "italic",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                "{photo.uploaderMessage}"
              </p>
            )}
            <p
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: "11px",
                marginTop: "2px",
              }}
            >
              {fmtDate(photo.uploadedAt)} · {fmt(photo.fileSize)}
            </p>
          </div>

          {/* Tombol unduh kanan */}
          <a
            href={`${photo.url}?download=1`}
            download={photo.originalName}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              borderRadius: "999px",
              background: "var(--color-rose)",
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Unduh Foto
          </a>
        </div>
      </div>
    </div>
  );

  // Portal ke document.body — bebas dari stacking context manapun
  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : null;
}

/* ── IRREGULAR GRID ── */
const ROW_PATTERN = [3, 2, 4];

function buildRows(photos: PhotoDTO[]): PhotoDTO[][] {
  const rows: PhotoDTO[][] = [];
  let i = 0,
    patIdx = 0;
  while (i < photos.length) {
    const n = ROW_PATTERN[patIdx % ROW_PATTERN.length];
    rows.push(photos.slice(i, i + n));
    i += n;
    patIdx++;
  }
  return rows;
}

function GalleryGrid({
  photos,
  onClickPhoto,
}: {
  photos: PhotoDTO[];
  onClickPhoto: (idx: number) => void;
}) {
  const rows = buildRows(photos);
  let globalIdx = 0;

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, rowIdx) => {
        const rowStart = globalIdx;
        globalIdx += row.length;

        const flexes =
          row.length === 3
            ? [1, 1, 1]
            : row.length === 2
            ? rowIdx % 2 === 0
              ? [1.5, 1]
              : [1, 1.5]
            : [1, 1, 1, 1];

        const rowH =
          row.length === 4
            ? "h-[180px]"
            : row.length === 2
            ? "h-[280px]"
            : "h-[230px]";

        return (
          <div key={rowIdx} className={`flex gap-2 ${rowH}`}>
            {row.map((photo, colIdx) => {
              const gi = rowStart + colIdx;
              return (
                <div
                  key={photo.id}
                  className="g-item rounded-[10px] overflow-hidden relative bg-border"
                  style={{ flex: flexes[colIdx] }}
                  onClick={() => onClickPhoto(gi)}
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={
                      photo.uploaderName
                        ? `Foto oleh ${photo.uploaderName}`
                        : "Foto pernikahan"
                    }
                    loading="lazy"
                    className="w-full h-full object-cover block"
                  />
                  <div
                    className="g-overlay absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-[280ms]"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(28,22,18,0.7) 0%, transparent 50%)",
                    }}
                  >
                    {photo.uploaderName && (
                      <p className="text-white text-[11px] font-medium leading-snug">
                        {photo.uploaderName}
                      </p>
                    )}
                    {photo.uploaderMessage && (
                      <p className="text-white/60 text-[10px] italic mt-[1px]">
                        "{photo.uploaderMessage}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ── MAIN ── */
export default function PhotoGallery({
  initialPhotos = [],
  newPhotos = [],
  onBackToShare,
}: {
  initialPhotos?: PhotoDTO[];
  newPhotos?: PhotoDTO[];
  onBackToShare?: () => void;
}) {
  const [photos, setPhotos] = useState<PhotoDTO[]>(initialPhotos);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newPhotos.length) return;
    setPhotos((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...newPhotos.filter((p) => !ids.has(p.id)), ...prev];
    });
  }, [newPhotos]);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/gallery?page=${page}&pageSize=24`);
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        setError("Gagal memuat galeri. Coba refresh halaman.");
        setHasMore(false);
        return;
      }
      const data = (await res.json()) as Partial<GalleryResponse>;
      if (!data || !Array.isArray(data.photos)) {
        setError("Respons server tidak terduga.");
        setHasMore(false);
        return;
      }
      setPhotos((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...data.photos!.filter((p) => !ids.has(p.id))];
      });
      setTotal(data.total ?? 0);
      setPage((p) => p + 1);
      setHasMore(data.hasMore ?? false);
    } catch {
      setError("Gagal memuat foto. Periksa koneksi database.");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  useEffect(() => {
    if (!initialPhotos.length) fetchMore();
  }, []); // eslint-disable-line

  useEffect(() => {
    const obs = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting && hasMore && !loading) fetchMore();
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [fetchMore, hasMore, loading]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {total > 0 ? (
          <p className="text-[13px] font-semibold text-muted">
            {total} kenangan tersimpan
          </p>
        ) : (
          <span />
        )}
        {onBackToShare && (
          <button
            onClick={onBackToShare}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose text-white border-none cursor-pointer text-[13px] font-bold tracking-wide hover:bg-rose-dark transition-colors duration-200"
          >
            <svg
              width="13"
              height="13"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Bagikan Foto
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center py-16 px-4">
          <p className="text-body text-[14px] font-medium mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setHasMore(true);
              fetchMore();
            }}
            className="bg-rose text-white border-none rounded-full px-5 py-2 text-[11px] cursor-pointer hover:opacity-90 transition-opacity duration-200"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && photos.length === 0 && (
        <div className="text-center py-24 px-4">
          <p className="font-display text-3xl font-semibold text-charcoal">
            Belum ada foto ✨
          </p>
          <p className="text-[14px] text-muted font-medium mt-2">
            Jadilah yang pertama membagikan kenangan
          </p>
        </div>
      )}

      {/* Grid */}
      {photos.length > 0 && (
        <GalleryGrid photos={photos} onClickPhoto={setLightboxIdx} />
      )}

      {/* Loader */}
      <div ref={loaderRef} className="flex justify-center py-10">
        {loading && (
          <div className="flex gap-[5px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-[6px] h-[6px] rounded-full bg-rose opacity-55"
                style={{
                  animation: "bounceDot 1.2s infinite",
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </div>
        )}
        {!hasMore && photos.length > 0 && !loading && (
          <p className="text-[13px] text-muted font-semibold">
            — akhir galeri —
          </p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <Lightbox
          photo={photos[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={
            lightboxIdx > 0 ? () => setLightboxIdx((i) => i! - 1) : undefined
          }
          onNext={
            lightboxIdx < photos.length - 1
              ? () => setLightboxIdx((i) => i! + 1)
              : undefined
          }
        />
      )}
    </>
  );
}
