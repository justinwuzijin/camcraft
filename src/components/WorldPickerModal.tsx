"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { WorldEntry } from "@/lib/worldStore";

// ── Viewfinder corner brackets ───────────────────────────────
function ViewfinderCorners({ active }: { active: boolean }) {
  const size = 12;
  const thickness = 1.5;
  const color = active ? "rgba(176,251,205,0.7)" : "rgba(176,251,205,0)";
  const style = {
    position: "absolute" as const,
    width: size,
    height: size,
    transition: "all 0.3s ease",
    opacity: active ? 1 : 0,
  };
  const line = {
    position: "absolute" as const,
    background: color,
    transition: "background 0.3s ease",
  };

  return (
    <>
      {/* Top-left */}
      <span style={{ ...style, top: 8, left: 8 }}>
        <span style={{ ...line, top: 0, left: 0, width: thickness, height: size }} />
        <span style={{ ...line, top: 0, left: 0, width: size, height: thickness }} />
      </span>
      {/* Top-right */}
      <span style={{ ...style, top: 8, right: 8 }}>
        <span style={{ ...line, top: 0, right: 0, width: thickness, height: size }} />
        <span style={{ ...line, top: 0, right: 0, width: size, height: thickness }} />
      </span>
      {/* Bottom-left */}
      <span style={{ ...style, bottom: 8, left: 8 }}>
        <span style={{ ...line, bottom: 0, left: 0, width: thickness, height: size }} />
        <span style={{ ...line, bottom: 0, left: 0, width: size, height: thickness }} />
      </span>
      {/* Bottom-right */}
      <span style={{ ...style, bottom: 8, right: 8 }}>
        <span style={{ ...line, bottom: 0, right: 0, width: thickness, height: size }} />
        <span style={{ ...line, bottom: 0, right: 0, width: size, height: thickness }} />
      </span>
    </>
  );
}

// ── Relative time label ──────────────────────────────────────
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── World card ───────────────────────────────────────────────
function WorldCard({ world, onClick }: { world: WorldEntry; onClick: () => void }) {
  const { parameters, panoPath, createdAt } = world;

  const primaryLabel =
    parameters.location && parameters.location !== "Default"
      ? parameters.location
      : "Unknown Location";

  const chips: string[] = [];
  if (parameters.timeOfDay && parameters.timeOfDay !== "Default") chips.push(parameters.timeOfDay);
  if (parameters.decade && parameters.decade !== "Default") chips.push(parameters.decade);
  if (parameters.placeType && parameters.placeType !== "Default") chips.push(parameters.placeType);
  if (parameters.weather && parameters.weather !== "Default") chips.push(parameters.weather);

  return (
    <motion.button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] text-left transition-all duration-300 hover:border-[#B0FBCD]/30 hover:bg-white/[0.06]"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Pano thumbnail — crop center strip of equirectangular */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
        <img
          src={panoPath}
          alt={primaryLabel}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ objectPosition: "center 30%" }}
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507]/80 via-transparent to-transparent" />

        {/* Viewfinder corners on hover */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300 absolute inset-0">
            <ViewfinderCorners active={true} />
          </div>
        </div>

        {/* Time chip overlay */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className="rounded-full border border-white/[0.12] bg-[#050507]/70 px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase text-white/40 backdrop-blur-sm"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {relativeTime(createdAt)}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3">
        <p
          className="text-sm text-white/80 truncate leading-tight"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {primaryLabel}
        </p>

        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.slice(0, 3).map((chip) => (
              <span
                key={chip}
                className="rounded-full px-2 py-0.5 text-[9px] tracking-[0.15em] uppercase border border-[#B0FBCD]/15 bg-[#B0FBCD]/[0.06] text-[#B0FBCD]/50"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Enter arrow */}
      <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#B0FBCD]/60">
          <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.button>
  );
}

// ── Main modal ───────────────────────────────────────────────
type Props = {
  worlds: WorldEntry[];
  onClose: () => void;
  onGenerateNew: () => void;
};

export default function WorldPickerModal({ worlds, onClose, onGenerateNew }: Props) {
  const router = useRouter();

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelectWorld = useCallback(
    (world: WorldEntry) => {
      router.push(`/generate?pano=${encodeURIComponent(world.panoPath)}`);
    },
    [router]
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#050507]/95 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* Scan-line grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col h-full max-w-4xl mx-auto w-full px-6 sm:px-10"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pt-10 pb-6 shrink-0">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                {/* Aperture icon */}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#B0FBCD]/50">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="0.8" />
                  <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="0.8" />
                  <path d="M7 1.5V3.5M7 10.5V12.5M1.5 7H3.5M10.5 7H12.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                </svg>
                <span
                  className="text-[10px] tracking-[0.3em] uppercase text-[#B0FBCD]/50"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  World Library
                </span>
              </div>
              <h2
                className="text-xl text-white/85 leading-tight"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Choose a World
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Generate New button */}
              <button
                onClick={onGenerateNew}
                className="group flex items-center gap-2 rounded-lg border border-[#B0FBCD]/20 bg-[#B0FBCD]/[0.06] px-4 py-2 text-xs tracking-[0.2em] uppercase text-[#B0FBCD]/70 transition-all duration-300 hover:border-[#B0FBCD]/40 hover:bg-[#B0FBCD]/[0.12] hover:text-[#B0FBCD]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-300 group-hover:rotate-90">
                  <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Generate New
              </button>

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/40 transition-all hover:border-white/[0.15] hover:text-white/70"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Top separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent shrink-0" />

          {/* Sub-label */}
          <p
            className="text-xs text-white/30 mt-4 mb-5 shrink-0"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {worlds.length} saved world{worlds.length !== 1 ? "s" : ""} — click any to enter
          </p>

          {/* World grid */}
          <div className="flex-1 overflow-y-auto pb-10 pr-1" style={{ scrollbarWidth: "none" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {worlds.map((world, i) => (
                <motion.div
                  key={world.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.08 + i * 0.04, ease: "easeOut" }}
                >
                  <WorldCard
                    world={world}
                    onClick={() => handleSelectWorld(world)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
