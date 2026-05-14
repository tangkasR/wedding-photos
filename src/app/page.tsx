"use client";

import { useState } from "react";
import Link from "next/link";
import UploadZone from "@/components/UploadZone";
import PhotoGallery from "@/components/PhotoGallery";
import { PhotoDTO } from "@/types";
import Image from "next/image";

const COUPLE_NAMES = process.env.NEXT_PUBLIC_COUPLE_NAMES ?? "Ais & Tangkas";
const WEDDING_DATE = process.env.NEXT_PUBLIC_WEDDING_DATE ?? "14 Juni 2025";

const SocialLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1 text-[11px] text-muted no-underline transition-colors duration-200 hover:text-rose"
  >
    {children}
  </a>
);

export default function HomePage() {
  const [newPhotos, setNewPhotos] = useState<PhotoDTO[]>([]);
  const [view, setView] = useState<"upload" | "gallery">("upload");

  return (
    <main className="min-h-screen bg-cream">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 h-[50px] bg-cream/90 backdrop-blur-md border-b border-border">
        <span className="font-display text-base tracking-wide text-charcoal">
          <Image src="/imglogo.png" width={"30"} height={"30"} alt="logo" />
        </span>
        <div className="flex gap-[3px] bg-border rounded-full p-[3px]">
          {(["upload", "gallery"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                "px-4 py-1 rounded-full text-[11px] font-medium tracking-widest uppercase border-none cursor-pointer transition-all duration-200",
                v === "upload" && view === "upload"
                  ? "bg-rose text-white shadow-sm"
                  : v === "gallery" && view === "gallery"
                  ? "bg-white text-charcoal shadow-sm"
                  : "bg-transparent text-muted",
              ].join(" ")}
            >
              {v === "upload" ? "Bagikan" : "Galeri"}
            </button>
          ))}
        </div>
      </nav>

      {/* ── UPLOAD VIEW ── */}
      {view === "upload" && (
        <div className="max-w-[440px] mx-auto px-6 pt-8 pb-16 animate-[var(--animate-fade-up-1)]">
          {/* Hero */}
          <div className="text-center mb-8">
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted mb-2">
              Hari Pernikahan
            </p>
            <h1 className="font-display text-[clamp(2.2rem,7vw,3.2rem)] font-light leading-[1.08] text-charcoal mb-1">
              {COUPLE_NAMES}
            </h1>
            {WEDDING_DATE && (
              <p className="font-display text-base italic text-rose mb-3 animate-[var(--animate-fade-up-2)]">
                {WEDDING_DATE}
              </p>
            )}
            <div className="flex items-center gap-[10px] mx-auto w-fit mb-3 animate-[var(--animate-fade-up-3)]">
              <div className="h-px w-8 bg-gold opacity-50" />
              <span className="text-gold text-xs">✦</span>
              <div className="h-px w-8 bg-gold opacity-50" />
            </div>
            <p className="text-[12px] leading-[1.75] text-muted animate-[var(--animate-fade-up-3)]">
              Bagikan fotomu dari hari istimewa kami.
            </p>
          </div>

          {/* Upload */}
          <div className="animate-[var(--animate-fade-up-4)]">
            <UploadZone
              onUploaded={(photos) =>
                setNewPhotos((prev) => [...photos, ...prev])
              }
            />
          </div>

          {/* Gallery link */}
          <div className="text-center mt-8 animate-[var(--animate-fade-up-5)]">
            <button
              onClick={() => setView("gallery")}
              className="bg-transparent border-none cursor-pointer text-[11px] text-muted tracking-[0.12em] uppercase underline decoration-border hover:text-charcoal transition-colors duration-200"
            >
              Lihat Galeri →
            </button>
          </div>
        </div>
      )}

      {/* ── GALLERY VIEW ── */}
      {view === "gallery" && (
        <div className="px-4 pt-8 pb-16 animate-[var(--animate-fade-up-1)]">
          <PhotoGallery
            newPhotos={newPhotos}
            onBackToShare={() => setView("upload")}
          />
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-10 px-6 text-center">
        <p className="font-display text-xl text-charcoal mb-1">
          {COUPLE_NAMES}
        </p>
        {WEDDING_DATE && (
          <p className="font-display text-sm italic text-rose mb-4">
            {WEDDING_DATE}
          </p>
        )}

        {/* Romantic tagline */}
        <p className="font-display text-base italic text-muted leading-relaxed max-w-xs mx-auto mb-6">
          "Setiap foto adalah doa yang terpanjatkan,
          <br />
          setiap senyum adalah cerita yang abadi."
        </p>

        <div className="h-px bg-border max-w-[160px] mx-auto mb-6" />

        {/* tr.codes credit */}
        <div className="text-[11px] text-muted leading-loose">
          <p className="mb-1 opacity-70">
            Website ini dibuat dengan ❤️ oleh{" "}
            <Link
              href="https://trcodes.id"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 font-medium text-rose no-underline text-[13px] tracking-wide"
            >
              tr.codes
            </Link>
          </p>
          <div className="grid grid-cols-2 md:flex flex-wrap justify-center gap-3 mt-2 opacity-75">
            <SocialLink href="https://instagram.com/tr.codes">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              tr.codes
            </SocialLink>
            <SocialLink href="mailto:tr.codes.dev@gmail.com">
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
                  strokeWidth={1.8}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              tr.codes.dev@gmail.com
            </SocialLink>
            <SocialLink href="https://wa.me/6282135397406">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              082135397406
            </SocialLink>
            <SocialLink href="https://trcodes.id">
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
                  strokeWidth={1.8}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              trcodes.id
            </SocialLink>
          </div>
        </div>
      </footer>
    </main>
  );
}
