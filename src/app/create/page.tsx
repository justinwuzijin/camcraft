"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NavButton } from "@/components/NavButton";
import WorldPickerModal from "@/components/WorldPickerModal";
import type { WorldEntry } from "@/lib/worldStore";

// Dynamically import CameraCarousel with SSR disabled
// Three.js requires browser APIs that aren't available during server-side rendering
const CameraCarousel = dynamic(
  () => import("@/components/CameraCarousel").then((mod) => mod.CameraCarousel),
  { ssr: false }
);

// Shutter opening animation overlay
function ShutterOpenOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Play shutter sound when the opening animation starts
    const audio = new Audio("/sony_shutter.mp3");
    audio.play().catch(() => {});

    // Start the opening animation after a brief delay
    const timer = setTimeout(() => setIsOpen(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {!isOpen && (
        <>
          {/* Left shutter blade */}
          <motion.div
            className="fixed inset-y-0 left-0 z-[100] bg-[#050507]"
            initial={{ width: "50%" }}
            animate={{ width: "0%" }}
            exit={{ width: "0%" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
          />
          {/* Right shutter blade */}
          <motion.div
            className="fixed inset-y-0 right-0 z-[100] bg-[#050507]"
            initial={{ width: "50%" }}
            animate={{ width: "0%" }}
            exit={{ width: "0%" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
          />
          {/* Center aperture ring */}
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <motion.div
              className="relative"
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 2, rotate: 90, opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                {/* Outer ring */}
                <circle
                  cx="40"
                  cy="40"
                  r="38"
                  stroke="rgba(176,251,205,0.4)"
                  strokeWidth="1.5"
                  fill="none"
                />
                {/* Inner aperture */}
                <circle
                  cx="40"
                  cy="40"
                  r="20"
                  stroke="rgba(176,251,205,0.6)"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Aperture blades */}
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line
                    key={angle}
                    x1="40"
                    y1="40"
                    x2={40 + 18 * Math.cos((angle * Math.PI) / 180)}
                    y2={40 + 18 * Math.sin((angle * Math.PI) / 180)}
                    stroke="rgba(176,251,205,0.3)"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const playCarouselSound = useCallback(() => {
    const audio = new Audio("/carousel.mp3");
    audio.play().catch(() => {});
  }, []);

  const handleTryOut = useCallback(async () => {
    const audio = new Audio("/confirm_button.mp3");
    audio.play().catch(() => {});

    try {
      const res = await fetch("/api/worlds");
      const data = await res.json();
      const fetchedWorlds: WorldEntry[] = data.worlds ?? [];
      if (fetchedWorlds.length === 0) {
        router.push("/generate");
      } else {
        setWorlds(fetchedWorlds);
        setShowPicker(true);
      }
    } catch {
      router.push("/generate");
    }
  }, [router]);

  return (
    <>
      {/* Shutter opening animation */}
      <ShutterOpenOverlay />

      <motion.main
        className="relative h-screen w-full overflow-hidden"
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      >
        <CameraCarousel onCarouselChange={playCarouselSound} onTryOutClick={handleTryOut} />

        {/* World picker modal */}
        {showPicker && (
          <WorldPickerModal
            worlds={worlds}
            onClose={() => setShowPicker(false)}
            onGenerateNew={() => router.push("/generate")}
          />
        )}

        {/* Header overlay — matches Generate page style */}
        <header className="pointer-events-auto absolute top-0 left-0 right-0 z-40 border-b border-white/[0.06] bg-[#060608]/80 backdrop-blur-xl">
          <div className="relative mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 sm:px-10">
            <div className="flex items-center gap-4">
              <Link href="/" aria-label="Home" className="relative -ml-6 shrink-0 pl-6 sm:-ml-10 sm:pl-10">
                <div
                  className="absolute inset-0 blur-lg opacity-25 rounded-full"
                  style={{ background: "rgba(176,251,205,0.4)", transform: "scale(1.6)" }}
                />
                <NextImage
                  src="/logo.png"
                  alt="CamCraft"
                  width={28}
                  height={28}
                  className="relative h-7 w-7 object-contain drop-shadow-[0_0_10px_rgba(176,251,205,0.15)]"
                />
              </Link>
              <div className="h-4 w-px bg-white/[0.08]" />
              <NavButton href="/" icon="back" label="Back" variant="header" />
            </div>
            <h1
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-sm tracking-[0.25em] uppercase text-white/70"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Create
            </h1>
            <NavButton href="/gallery" icon="gallery" label="Gallery" variant="header" />
          </div>
        </header>
      </motion.main>
    </>
  );
}
