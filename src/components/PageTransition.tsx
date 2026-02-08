"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Shutter-style transition variants
const shutterVariants = {
  initial: {
    clipPath: "inset(0 50% 0 50%)",
    opacity: 0,
  },
  animate: {
    clipPath: "inset(0 0% 0 0%)",
    opacity: 1,
    transition: {
      clipPath: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
      opacity: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  },
  exit: {
    clipPath: "inset(0 50% 0 50%)",
    opacity: 0,
    transition: {
      clipPath: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
      opacity: {
        duration: 0.3,
        ease: "easeIn",
      },
    },
  },
};

// Fade + scale variants for smoother feel
const fadeScaleVariants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    y: -10,
    transition: {
      duration: 0.4,
      ease: [0.55, 0.06, 0.68, 0.19],
    },
  },
};

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeScaleVariants}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Shutter-style transition for camera-themed pages
export function ShutterTransition({ children, className = "" }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={shutterVariants}
        className={className}
      >
        {/* Shutter overlay effect */}
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] bg-black"
          initial={{ scaleX: 0 }}
          animate={{ 
            scaleX: [0, 1, 1, 0],
            originX: ["0%", "0%", "100%", "100%"],
          }}
          transition={{
            duration: 0.8,
            times: [0, 0.4, 0.6, 1],
            ease: "easeInOut",
          }}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Lens aperture transition overlay
export function ApertureOverlay() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
    >
      {/* Aperture blades animation */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 20, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <svg width="100" height="100" viewBox="0 0 100 100">
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(176,251,205,0.3)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="rgba(176,251,205,0.2)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
