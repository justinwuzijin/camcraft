"use client";

import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

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
  return (
    <>
      {/* Shutter opening animation */}
      <ShutterOpenOverlay />
      
      <motion.main
        className="h-screen w-full overflow-hidden"
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      >
        <CameraCarousel />
      </motion.main>
    </>
  );
}
