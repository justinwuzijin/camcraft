"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getGalleryEntries, removeGalleryEntry } from "@/lib/galleryStore";
import type { GalleryEntry } from "@/lib/galleryStore";
import { resetUnseen } from "@/lib/galleryBadgeStore";

type ServerImage = {
  filename: string;
  path: string;
  createdAt: number;
};

type DisplayItem = {
  id: string;
  imagePath: string;
  capturedAt: number;
  scene: GalleryEntry["scene"];
  camera: GalleryEntry["camera"];
  hasMetadata: boolean;
};

const DEFAULT_CAMERA = {
  body: "Sony α7 IV",
  lens: "FE 24-70mm f/2.8 GM",
  focalLength: "24-70mm",
  iso: "100-51200",
  sensor: "35mm Full-Frame BSI",
  resolution: "33 Megapixels",
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function GalleryPage() {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxEntering, setLightboxEntering] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Load gallery items: merge localStorage metadata with server files
  useEffect(() => {
    resetUnseen();
    async function load() {
      const [localEntries, serverRes] = await Promise.all([
        Promise.resolve(getGalleryEntries()),
        fetch("/api/gallery")
          .then((r) => r.json())
          .catch(() => ({ images: [] })),
      ]);

      const serverImages: ServerImage[] = serverRes.images || [];
      const localByPath = new Map(localEntries.map((e) => [e.imagePath, e]));
      const merged: DisplayItem[] = [];
      const seenPaths = new Set<string>();

      // First pass: server images matched with local metadata
      for (const img of serverImages) {
        seenPaths.add(img.path);
        const local = localByPath.get(img.path);
        merged.push({
          id: local?.id || img.filename,
          imagePath: img.path,
          capturedAt: local?.capturedAt || img.createdAt,
          scene: local?.scene || {},
          camera: local?.camera || DEFAULT_CAMERA,
          hasMetadata: !!local,
        });
      }

      // Second pass: local entries whose files might not be on server yet
      for (const entry of localEntries) {
        if (!seenPaths.has(entry.imagePath)) {
          merged.push({
            id: entry.id,
            imagePath: entry.imagePath,
            capturedAt: entry.capturedAt,
            scene: entry.scene,
            camera: entry.camera,
            hasMetadata: true,
          });
        }
      }

      merged.sort((a, b) => b.capturedAt - a.capturedAt);
      setItems(merged);
      setLoading(false);
    }

    load();
  }, []);

  const selected = items.find((i) => i.id === selectedId) || null;

  const openLightbox = useCallback((id: string) => {
    setSelectedId(id);
    setLightboxEntering(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLightboxEntering(false));
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedId(null);
    setDeleteConfirm(null);
  }, []);

  const navigateLightbox = useCallback(
    (dir: 1 | -1) => {
      if (!selectedId) return;
      const idx = items.findIndex((i) => i.id === selectedId);
      const next = idx + dir;
      if (next >= 0 && next < items.length) {
        setSelectedId(items[next].id);
        setDeleteConfirm(null);
      }
    },
    [selectedId, items]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (deleteConfirm === id) {
        removeGalleryEntry(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (selectedId === id) {
          closeLightbox();
        }
        setDeleteConfirm(null);
      } else {
        setDeleteConfirm(id);
      }
    },
    [deleteConfirm, selectedId, closeLightbox]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!selectedId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") navigateLightbox(1);
      if (e.key === "ArrowLeft") navigateLightbox(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, closeLightbox, navigateLightbox]);

  const sceneEntries = selected
    ? Object.entries(selected.scene).filter(([, v]) => v)
    : [];

  const hasScene = sceneEntries.length > 0;

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060608]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Home" className="relative shrink-0">
              <div
                className="absolute inset-0 blur-lg opacity-25 rounded-full"
                style={{ background: "rgba(176,251,205,0.4)", transform: "scale(1.6)" }}
              />
              <Image
                src="/logo.png"
                alt="CamCraft"
                width={28}
                height={28}
                className="relative h-7 w-7 object-contain drop-shadow-[0_0_10px_rgba(176,251,205,0.15)]"
              />
            </Link>
            <Link
              href="/create"
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className="text-xs tracking-wider"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                Back
              </span>
            </Link>
            <div className="h-4 w-px bg-white/[0.08]" />
            <h1
              className="text-sm tracking-[0.25em] uppercase text-white/70"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Gallery
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-xs text-white/30 tracking-wider"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {items.length} {items.length === 1 ? "exposure" : "exposures"}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1600px] px-6 sm:px-10 py-8">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[#B0FBCD]/60" />
              </div>
              <span
                className="text-xs tracking-[0.2em] uppercase text-white/30"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                Loading
              </span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
            <div className="relative">
              {/* Empty state aperture icon */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                className="text-white/[0.08]"
              >
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1" />
                <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="1" />
                <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="1" />
                <line x1="32" y1="4" x2="32" y2="14" stroke="currentColor" strokeWidth="1" />
                <line x1="32" y1="50" x2="32" y2="60" stroke="currentColor" strokeWidth="1" />
                <line x1="4" y1="32" x2="14" y2="32" stroke="currentColor" strokeWidth="1" />
                <line x1="50" y1="32" x2="60" y2="32" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40 mb-1">No exposures yet</p>
              <p className="text-xs text-white/20">
                Generate a panorama and use the focus + picture frame gestures to capture shots
              </p>
            </div>
            <Link
              href="/generate"
              className="mt-2 rounded-full border border-[#B0FBCD]/30 bg-[#B0FBCD]/10 px-6 py-2.5 text-sm font-medium text-[#B0FBCD] transition-all hover:bg-[#B0FBCD]/20"
            >
              Generate Panorama
            </Link>
          </div>
        ) : (
          <>
            {/* Gallery grid */}
            <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => openLightbox(item.id)}
                  className="group relative aspect-[4/3] overflow-hidden bg-white/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#B0FBCD]/40"
                  style={{
                    animationDelay: `${idx * 40}ms`,
                    animation: "fadeSlideIn 0.5s ease-out both",
                  }}
                >
                  <img
                    src={item.imagePath}
                    alt={`Capture from ${formatDate(item.capturedAt)}`}
                    className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {/* Bottom info on hover */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <div
                      className="text-[10px] tracking-[0.15em] uppercase text-white/60"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {formatDate(item.capturedAt)}
                    </div>
                    {item.scene.location && (
                      <div className="mt-0.5 text-xs text-white/80 truncate">
                        {item.scene.location}
                      </div>
                    )}
                  </div>
                  {/* Frame number */}
                  <div
                    className="absolute right-2 top-2 text-[9px] tracking-wider text-white/0 transition-colors duration-300 group-hover:text-white/30"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {String(items.length - idx).padStart(3, "0")}
                  </div>
                </button>
              ))}
            </div>

            {/* Film strip footer */}
            <div className="mt-12 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <span
                className="text-[10px] tracking-[0.3em] uppercase text-white/15"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                End of Roll
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
          </>
        )}
      </main>

      {/* Lightbox */}
      {selected && (
        <div
          className={`fixed inset-0 z-[60] flex transition-all duration-300 ${
            lightboxEntering ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#060608]/95 backdrop-blur-2xl"
            onClick={closeLightbox}
          />

          {/* Content */}
          <div className="relative z-10 flex h-full w-full flex-col lg:flex-row">
            {/* Image panel */}
            <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-12">
              {/* Nav arrows */}
              {items.findIndex((i) => i.id === selectedId) > 0 && (
                <button
                  onClick={() => navigateLightbox(-1)}
                  className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white/50 backdrop-blur-md transition-all hover:border-white/20 hover:text-white/80 sm:left-6"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M12 15L7 10L12 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
              {items.findIndex((i) => i.id === selectedId) <
                items.length - 1 && (
                <button
                  onClick={() => navigateLightbox(1)}
                  className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white/50 backdrop-blur-md transition-all hover:border-white/20 hover:text-white/80 sm:right-6"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M8 5L13 10L8 15"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {/* Close button */}
              <button
                onClick={closeLightbox}
                className="absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-black/40 p-2 text-white/50 backdrop-blur-md transition-all hover:border-white/20 hover:text-white/80 sm:right-6 sm:top-6 lg:right-[calc(380px+1.5rem)]"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M13 5L5 13M5 5L13 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* Image */}
              <div
                className="relative max-h-[85vh] max-w-full overflow-hidden shadow-2xl shadow-black/60"
                style={{
                  animation: "lightboxScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
                }}
              >
                <img
                  src={selected.imagePath}
                  alt={`Capture from ${formatDate(selected.capturedAt)}`}
                  className="max-h-[85vh] max-w-full object-contain"
                />
                {/* Subtle vignette */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    boxShadow: "inset 0 0 80px rgba(0,0,0,0.3)",
                  }}
                />
              </div>

              {/* Frame counter */}
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-white/20 sm:bottom-6"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {items.findIndex((i) => i.id === selectedId) + 1} / {items.length}
              </div>
            </div>

            {/* Info sidebar */}
            <div
              className="w-full shrink-0 overflow-y-auto border-l border-white/[0.06] bg-[#0a0a0c]/90 backdrop-blur-xl lg:w-[380px]"
              style={{
                animation: "slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
              }}
            >
              <div className="p-6 sm:p-8">
                {/* Timestamp */}
                <div className="mb-8">
                  <div
                    className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-3"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    Captured
                  </div>
                  <div className="text-lg text-white/90 font-light tracking-tight">
                    {formatDate(selected.capturedAt)}
                  </div>
                  <div
                    className="text-sm text-white/40 mt-0.5"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {formatTime(selected.capturedAt)}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/[0.06] mb-8" />

                {/* Scene details */}
                {hasScene && (
                  <>
                    <div className="mb-8">
                      <div
                        className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-4"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        Scene
                      </div>
                      <div className="space-y-3">
                        {sceneEntries.map(([key, value]) => (
                          <div key={key} className="flex items-baseline justify-between gap-4">
                            <span className="text-xs text-white/30 shrink-0">
                              {key === "timeOfDay"
                                ? "Time"
                                : key === "era"
                                ? "Era"
                                : capitalizeFirst(key)}
                            </span>
                            <span className="text-sm text-white/75 text-right">
                              {capitalizeFirst(value!)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-white/[0.06] mb-8" />
                  </>
                )}

                {/* Camera specs */}
                <div className="mb-8">
                  <div
                    className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-4"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    Equipment
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs text-white/30">Body</span>
                      <span className="text-sm text-white/75 text-right">
                        {selected.camera.body}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs text-white/30">Lens</span>
                      <span className="text-sm text-white/75 text-right">
                        {selected.camera.lens}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs text-white/30">Focal Length</span>
                      <span
                        className="text-sm text-white/75 text-right"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {selected.camera.focalLength}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs text-white/30">ISO</span>
                      <span
                        className="text-sm text-white/75 text-right"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {selected.camera.iso}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs text-white/30">Sensor</span>
                      <span className="text-sm text-white/75 text-right">
                        {selected.camera.sensor}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs text-white/30">Resolution</span>
                      <span
                        className="text-sm text-white/75 text-right"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {selected.camera.resolution}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06] mb-8" />

                {/* Actions */}
                <div className="space-y-3">
                  <a
                    href={selected.imagePath}
                    download
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 2V9.5M7 9.5L4 6.5M7 9.5L10 6.5M2 11.5H12"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Download
                  </a>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all ${
                      deleteConfirm === selected.id
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-white/10 bg-white/[0.03] text-white/40 hover:border-red-500/20 hover:text-red-400/70"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 4H12M5 4V3C5 2.448 5.448 2 6 2H8C8.552 2 9 2.448 9 3V4M5.5 6.5V10.5M8.5 6.5V10.5M3 4L3.5 11.5C3.5 12.052 3.948 12.5 4.5 12.5H9.5C10.052 12.5 10.5 12.052 10.5 11.5L11 4"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {deleteConfirm === selected.id ? "Confirm Delete" : "Remove"}
                  </button>
                </div>

                {/* File path */}
                <div className="mt-8">
                  <div
                    className="text-[9px] tracking-wider text-white/15 break-all"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {selected.imagePath}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes lightboxScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
