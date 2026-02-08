"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface GestureTutorialProps {
  onComplete: () => void;
  isVisible: boolean;
}

// Hand image component with CSS-based gesture animations
const AnimatedHand = ({
  gesture,
  isActive,
}: {
  gesture: "pinch" | "frame" | "fist-open";
  isActive: boolean;
}) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % 4);
    }, 700);
    return () => clearInterval(interval);
  }, [isActive]);

  // Different hand poses/animations for each gesture
  switch (gesture) {
    case "pinch":
      return (
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Single hand doing pinch gesture */}
          <div 
            className={`relative transition-all duration-500 ${
              isActive ? (phase % 2 === 0 ? "translate-x-0" : "translate-x-3") : ""
            }`}
          >
            <Image
              src="/hands.png"
              alt="Hand"
              width={120}
              height={120}
              className="object-contain"
              style={{ 
                clipPath: "inset(0 50% 0 0)", // Show left hand only
                transform: `scale(1.8) translateX(15px) ${isActive && phase % 2 === 1 ? "rotate(-5deg)" : "rotate(0deg)"}`,
              }}
            />
            {/* Pinch indicator dots */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
              isActive ? "opacity-100 scale-100" : "opacity-50 scale-75"
            }`}>
              <div className="relative">
                <div className={`w-3 h-3 rounded-full bg-[#B0FBCD] ${isActive ? "animate-ping" : ""}`} />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#B0FBCD]" />
              </div>
            </div>
          </div>
          {/* Drag arrow */}
          <div className={`absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isActive && phase % 2 === 1 ? "opacity-100 translate-x-2" : "opacity-40 translate-x-0"
          }`}>
            <svg className="w-6 h-6 text-[#B0FBCD]" viewBox="0 0 24 24" fill="none">
              <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      );

    case "frame":
      return (
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Both hands forming a frame */}
          <div className={`relative transition-all duration-300 ${
            isActive && phase >= 2 ? "scale-110" : "scale-100"
          }`}>
            <Image
              src="/hands.png"
              alt="Hands forming frame"
              width={140}
              height={100}
              className="object-contain"
              style={{ 
                transform: "scale(1.4)",
                filter: isActive && phase === 3 ? "brightness(1.5)" : "brightness(1)",
              }}
            />
            {/* Frame overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
              isActive && phase >= 2 ? "opacity-100" : "opacity-0"
            }`}>
              <div className="w-12 h-8 border-2 border-[#B0FBCD] border-dashed rounded-sm" />
            </div>
          </div>
          {/* Flash effect */}
          {isActive && phase === 3 && (
            <div className="absolute inset-0 bg-white/50 rounded-full animate-ping" />
          )}
        </div>
      );

    case "fist-open":
      return (
        <div className="relative w-28 h-28 flex items-center justify-center overflow-hidden">
          {/* Fist state (closed) - just show silhouette */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
            phase < 2 ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}>
            <div className="relative">
              <Image
                src="/hands.png"
                alt="Fist"
                width={100}
                height={100}
                className="object-contain"
                style={{ 
                  clipPath: "inset(0 50% 0 0)",
                  transform: "scale(1.5) translateX(12px)",
                  filter: "brightness(0.7)",
                }}
              />
              {/* Fist overlay indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/50" />
              </div>
            </div>
          </div>
          
          {/* Open state */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
            phase >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-125"
          }`}>
            <Image
              src="/hands.png"
              alt="Open hand"
              width={100}
              height={100}
              className="object-contain"
              style={{ 
                clipPath: "inset(0 0 0 50%)",
                transform: "scale(1.5) translateX(-12px)",
              }}
            />
          </div>
          
          {/* Transition arrow */}
          <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${
            isActive ? "opacity-100" : "opacity-50"
          }`}>
            <svg className="w-6 h-3 text-[#B0FBCD]" viewBox="0 0 24 12" fill="none">
              <path d="M2 6H22M22 6L17 1M22 6L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      );

    default:
      return null;
  }
};

// Gesture card with instructions
const GestureCard = ({
  gesture,
  title,
  instructions,
  isActive,
}: {
  gesture: "pinch" | "frame" | "fist-open";
  title: string;
  instructions: string[];
  isActive: boolean;
}) => {
  return (
    <div className={`flex flex-col items-center p-5 rounded-2xl border transition-all duration-300 min-w-[180px] max-w-[200px] ${
      isActive 
        ? "bg-white/10 border-[#B0FBCD]/50 scale-105 shadow-lg shadow-[#B0FBCD]/10" 
        : "bg-white/5 border-white/10 opacity-50"
    }`}>
      <div className="mb-4">
        <AnimatedHand gesture={gesture} isActive={isActive} />
      </div>
      <h3 className={`text-base font-bold mb-2 transition-colors ${
        isActive ? "text-[#B0FBCD]" : "text-white"
      }`}>
        {title}
      </h3>
      <div className="space-y-1">
        {instructions.map((instruction, idx) => (
          <p key={idx} className={`text-xs text-center leading-tight ${
            isActive ? "text-white/70" : "text-white/40"
          }`}>
            {instruction}
          </p>
        ))}
      </div>
    </div>
  );
};

export default function GestureTutorial({ onComplete, isVisible }: GestureTutorialProps) {
  const [activeGesture, setActiveGesture] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const gestures = [
    {
      gesture: "pinch" as const,
      title: "Pinch & Drag",
      instructions: [
        "1. Touch thumb to index finger",
        "2. Hold the pinch",
        "3. Drag to look around",
      ],
    },
    {
      gesture: "frame" as const,
      title: "Take Photo",
      instructions: [
        "1. Extend thumb & index finger",
        "2. Form an L-shape",
        "3. Hold for 0.5 seconds",
      ],
    },
    {
      gesture: "fist-open" as const,
      title: "Toggle Camera",
      instructions: [
        "1. Make a closed fist",
        "2. Open your hand fully",
        "3. Camera view toggles",
      ],
    },
  ];

  // Cycle through gestures
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveGesture((prev) => (prev + 1) % gestures.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [gestures.length, isVisible]);

  // Enable button after delay
  useEffect(() => {
    if (!isVisible) {
      setIsReady(false);
      return;
    }
    const timer = setTimeout(() => setIsReady(true), 3000);
    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md" 
        onClick={isReady ? onComplete : undefined} 
      />

      {/* Popup Card */}
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-gradient-to-b from-[#151515] to-[#0d0d0d] border border-white/10 rounded-3xl p-8 shadow-2xl">
        {/* Close button */}
        {isReady && (
          <button
            onClick={onComplete}
            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/70 transition-colors rounded-full hover:bg-white/10"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-[#B0FBCD]/10">
              <svg className="w-8 h-8 text-[#B0FBCD]" viewBox="0 0 24 24" fill="none">
                <path d="M18 11V6a2 2 0 00-2-2h-1a2 2 0 00-2 2v0M10 11V4a2 2 0 00-2-2H7a2 2 0 00-2 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 11V9a2 2 0 012-2v0a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M18 11v0a2 2 0 012 2v0a2 2 0 01-2 2h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M5 12v4a6 6 0 006 6h2a6 6 0 006-6v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white">Hand Gestures</h2>
          </div>
          <p className="text-base text-white/50">Control the panorama with these gestures</p>
        </div>

        {/* Gesture Cards */}
        <div className="flex justify-center gap-5 mb-8">
          {gestures.map((g, index) => (
            <GestureCard
              key={g.gesture}
              gesture={g.gesture}
              title={g.title}
              instructions={g.instructions}
              isActive={activeGesture === index}
            />
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {gestures.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveGesture(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeGesture === index 
                  ? "bg-[#B0FBCD] w-8" 
                  : "bg-white/20 w-2 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Webcam notice */}
        <div className="flex items-center justify-center gap-2 text-white/40 text-sm mb-6">
          <div className="p-1.5 rounded-lg bg-white/5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="1" fill="currentColor"/>
            </svg>
          </div>
          <span>Webcam required for gesture detection</span>
        </div>

        {/* Continue button */}
        <div className="flex justify-center">
          <button
            onClick={onComplete}
            disabled={!isReady}
            className={`px-12 py-3.5 rounded-full text-base font-semibold transition-all duration-300 ${
              isReady
                ? "bg-[#B0FBCD] text-black hover:bg-[#9EEABC] hover:scale-105 cursor-pointer shadow-lg shadow-[#B0FBCD]/20"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            {isReady ? "Got it!" : "Please wait..."}
          </button>
        </div>
      </div>

      {/* Keyboard listener */}
      <KeyboardListener onEnter={isReady ? onComplete : undefined} />
    </div>
  );
}

function KeyboardListener({ onEnter }: { onEnter?: () => void }) {
  useEffect(() => {
    if (!onEnter) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") onEnter();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEnter]);
  return null;
}
