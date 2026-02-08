"use client";

import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// Loading component for 3D content
function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#050507]">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle
            cx="30"
            cy="30"
            r="25"
            stroke="rgba(176,251,205,0.1)"
            strokeWidth="2"
            fill="none"
          />
          <motion.circle
            cx="30"
            cy="30"
            r="25"
            stroke="rgba(176,251,205,0.5)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="80 157"
          />
        </svg>
      </motion.div>
    </div>
  );
}

// Dynamically import CameraCarousel with SSR disabled
// Three.js requires browser APIs that aren't available during server-side rendering
const CameraCarousel = dynamic(
  () => import("@/components/CameraCarousel").then((mod) => mod.CameraCarousel),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

// Shutter opening animation overlay - stays on top until animation completes
function ShutterOpenOverlay({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Signal completion after shutter fully opens
    const timer = setTimeout(onComplete, 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      {/* Left shutter blade */}
      <motion.div
        className="fixed inset-y-0 left-0 z-[100] bg-[#050507]"
        initial={{ width: "50%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
      />
      {/* Right shutter blade */}
      <motion.div
        className="fixed inset-y-0 right-0 z-[100] bg-[#050507]"
        initial={{ width: "50%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
      />
      {/* Center aperture ring */}
      <motion.div
        className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.div
          className="relative"
          initial={{ scale: 1, rotate: 0 }}
          animate={{ scale: 2.5, rotate: 120, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
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
  );
}

export default function CreatePage() {
  const [isRevealed, setIsRevealed] = useState(false);
  const [shutterComplete, setShutterComplete] = useState(false);

  return (
    <>
      {/* Shutter opening animation - covers content initially */}
      {!shutterComplete && (
        <ShutterOpenOverlay onComplete={() => setShutterComplete(true)} />
      )}
      
      {/* Main content - always rendered, revealed after shutter */}
      <motion.main
        className="h-screen w-full overflow-hidden bg-[#050507]"
        initial={{ opacity: 0 }}
        animate={{ opacity: shutterComplete ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onAnimationComplete={() => setIsRevealed(true)}
      >
        <CameraCarousel />
      </motion.main>
    </>
  );
}
