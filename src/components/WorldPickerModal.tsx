"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { WorldEntry } from "@/lib/worldStore";

// ── Viewfinder corner brackets ───────────────────────────────
export function ViewfinderCorners({ active }: { active: boolean }) {
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
export function relativeTime(ts: number): string {
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
export function WorldCard({ world, onClick, onDelete }: { world: WorldEntry; onClick: () => void; onDelete: () => void }) {
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
    <motion.div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="group relative w-full aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.08] bg-[#050507] text-left transition-all duration-300 hover:border-[#B0FBCD]/30 hover:bg-white/[0.06] cursor-pointer flex flex-col justify-end"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background Image */}
      <img
        src={panoPath}
        alt={primaryLabel}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] z-0"
        style={{ objectPosition: "center 30%" }}
        loading="lazy"
      />

      {/* Gradient & Blur Bottom Overlay for Title Area */}
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent pointer-events-none z-0" />
      <div
        className="absolute inset-x-0 bottom-0 h-[60%] backdrop-blur-md pointer-events-none z-0"
        style={{
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)"
        }}
      />

      {/* Viewfinder corners on hover */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300 absolute inset-0">
          <ViewfinderCorners active={true} />
        </div>
      </div>

      {/* Delete button — top-left, hover only */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.12] bg-[#050507]/80 text-white/40 backdrop-blur-sm transition-all hover:border-red-500/40 hover:bg-red-500/[0.15] hover:text-red-400"
          aria-label="Delete world"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Time chip overlay */}
      <div className="absolute top-2.5 right-2.5 z-20">
        <span
          className="rounded-full border border-white/[0.12] bg-[#050507]/70 px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase text-white/40 backdrop-blur-sm"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {relativeTime(createdAt)}
        </span>
      </div>

      {/* Card body */}
      <div className="relative z-20 px-4 py-3.5 mt-auto w-full">
        {chips.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5 pr-6">
            {chips.slice(0, 3).map((chip) => (
              <span
                key={chip}
                className="rounded-full px-2 py-0.5 text-[9px] tracking-[0.15em] uppercase border border-[#B0FBCD]/15 bg-[#B0FBCD]/[0.06] text-[#B0FBCD]/60"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        <p
          className="text-[15px] font-medium text-white/90 truncate leading-tight drop-shadow-md"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {primaryLabel}
        </p>
      </div>

      {/* Enter arrow */}
      <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#B0FBCD] drop-shadow-lg">
          <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.div>
  );
}

// ── Main modal ───────────────────────────────────────────────
type Props = {
  worlds: WorldEntry[];
  onClose: () => void;
  onGenerateNew: () => void;
  onSelectWorld?: (world: WorldEntry) => void;
};

export default function WorldPickerModal({ worlds: initialWorlds, onClose, onGenerateNew, onSelectWorld }: Props) {
  const router = useRouter();
  const [worlds, setWorlds] = useState<WorldEntry[]>(initialWorlds);

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
      if (onSelectWorld) {
        onSelectWorld(world);
      } else {
        router.push(`/generate?pano=${encodeURIComponent(world.panoPath)}`);
      }
    },
    [router, onSelectWorld]
  );

  const handleDelete = useCallback((world: WorldEntry) => {
    setWorlds((prev) => {
      const next = prev.filter((w) => w.id !== world.id);
      if (next.length === 0) setTimeout(onClose, 300);
      return next;
    });
    fetch("/api/worlds", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panoPath: world.panoPath }),
    }).catch(() => {
      setWorlds((prev) => [world, ...prev].sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [onClose]);

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
          className="relative z-10 flex flex-col h-full w-full"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header (Navbar) */}
          <header className="pointer-events-auto w-full border-b border-white/[0.06] bg-[#050507]/80 backdrop-blur-xl shrink-0">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 sm:px-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={onClose}
                  className="group flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5">
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
                </button>
                <div className="h-4 w-px bg-white/[0.08]" />
                <h1
                  className="text-sm tracking-[0.25em] uppercase text-white/70"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  World Library
                </h1>
              </div>

              <div className="flex items-center gap-3">
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
              </div>
            </div>
          </header>

          {/* Inner Content wrapper */}
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 sm:px-10 overflow-hidden">
            {/* Sub-label */}
            <div className="mt-8 mb-6 shrink-0 flex items-end justify-between">
              <div>
                <h2
                  className="text-xl text-white/85 leading-tight mb-1"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Choose a World
                </h2>
                <p
                  className="text-xs text-white/30"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {worlds.length} saved world{worlds.length !== 1 ? "s" : ""} — click any to enter
                </p>
              </div>
            </div>

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
                      onDelete={() => handleDelete(world)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
