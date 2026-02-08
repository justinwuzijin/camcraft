"use client";

import { useState, useEffect, useRef } from "react";

interface GestureTutorialProps {
  onComplete: () => void;
  isVisible: boolean;
  isLoading?: boolean;
}

const LOADING_MESSAGES = [
  "Analyzing scene parameters...",
  "Building the mesh...",
  "Generating panoramic textures...",
  "Mapping equirectangular projection...",
  "Compositing lighting and shadows...",
  "Rendering atmospheric effects...",
  "Applying post-processing...",
  "Stitching panorama seams...",
  "Finalizing image data...",
];

// Animated SVG hand illustrations for each gesture
const GestureIllustration = ({
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
      setPhase((p) => (p + 1) % 60);
    }, 50);
    return () => clearInterval(interval);
  }, [isActive]);

  const t = phase / 60; // 0-1 normalized time
  const mint = "#B0FBCD";

  switch (gesture) {
    case "pinch":
      // Thumb and index finger pinching together, then dragging
      const pinchClose = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0=open, 1=closed
      const dragX = t > 0.5 ? (t - 0.5) * 40 : 0;
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
          {/* Movement trail */}
          {isActive && t > 0.5 && (
            <path
              d={`M${36 + dragX * 0.3} 32 L${36 + dragX} 32`}
              stroke={mint}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.4}
            />
          )}
          {/* Palm base */}
          <g transform={`translate(${dragX * 0.6}, 0)`} opacity={isActive ? 1 : 0.5}>
            {/* Wrist */}
            <path
              d="M28 68 L28 50 Q28 44 32 42 L36 40"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.6}
            />
            {/* Middle finger */}
            <path
              d="M36 40 L36 24"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.4}
            />
            {/* Ring finger */}
            <path
              d="M36 40 L42 26"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.3}
            />
            {/* Pinky */}
            <path
              d="M36 42 L46 30"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.25}
            />
            {/* Index finger - moves with pinch */}
            <path
              d={`M36 40 L${30 + pinchClose * 6} ${28 + pinchClose * 6}`}
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity={0.9}
            />
            {/* Thumb - moves with pinch */}
            <path
              d={`M28 50 Q24 46 ${24 + pinchClose * 8} ${40 - pinchClose * 4}`}
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity={0.9}
            />
            {/* Pinch point glow */}
            <circle
              cx={33 + pinchClose * 2}
              cy={34}
              r={pinchClose > 0.7 ? 4 : 2}
              fill={mint}
              opacity={pinchClose > 0.7 ? 0.6 : 0.15}
            >
              {pinchClose > 0.7 && (
                <animate
                  attributeName="r"
                  values="3;5;3"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
          {/* Direction arrow */}
          {isActive && t > 0.5 && (
            <g opacity={0.5}>
              <path
                d={`M${50 + dragX} 32 l6 0 l-2 -2 m2 2 l-2 2`}
                stroke={mint}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </svg>
      );

    case "frame":
      // Two L-shaped hands forming a frame
      const holdProgress = Math.min(1, t * 2); // fills up first half
      const flashOn = t > 0.85;
      const frameScale = flashOn ? 1.02 : 1;
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
          <g transform={`scale(${frameScale})`} style={{ transformOrigin: "40px 40px" }}>
            {/* Left hand L-shape */}
            <g opacity={isActive ? 0.9 : 0.4}>
              {/* Left thumb (horizontal) */}
              <path
                d="M14 28 L28 28"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Left index (vertical) */}
              <path
                d="M14 28 L14 52"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Left palm corner */}
              <circle cx="14" cy="28" r="2" fill="white" opacity={0.3} />
            </g>

            {/* Right hand L-shape (mirrored) */}
            <g opacity={isActive ? 0.9 : 0.4}>
              {/* Right thumb (horizontal) */}
              <path
                d="M66 52 L52 52"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Right index (vertical) */}
              <path
                d="M66 52 L66 28"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Right palm corner */}
              <circle cx="66" cy="52" r="2" fill="white" opacity={0.3} />
            </g>

            {/* Frame rectangle (viewfinder) */}
            <rect
              x="18"
              y="30"
              width="44"
              height="20"
              rx="1"
              stroke={mint}
              strokeWidth="0.8"
              strokeDasharray={isActive ? `${holdProgress * 130}` : "4 4"}
              strokeDashoffset={isActive ? 0 : undefined}
              fill="none"
              opacity={isActive ? 0.5 + holdProgress * 0.3 : 0.2}
            />

            {/* Corner brackets inside frame */}
            {isActive && holdProgress > 0.5 && (
              <g opacity={holdProgress - 0.5} stroke={mint} strokeWidth="0.6">
                <path d="M22 34 L22 32 L24 32" />
                <path d="M58 34 L58 32 L56 32" />
                <path d="M22 46 L22 48 L24 48" />
                <path d="M58 46 L58 48 L56 48" />
              </g>
            )}

            {/* Hold timer arc */}
            {isActive && (
              <circle
                cx="40"
                cy="40"
                r="6"
                stroke={mint}
                strokeWidth="1.2"
                strokeDasharray={`${holdProgress * 37.7} 37.7`}
                fill="none"
                opacity={0.6}
                transform="rotate(-90, 40, 40)"
              />
            )}

            {/* Flash burst */}
            {flashOn && (
              <circle cx="40" cy="40" r="20" fill="white" opacity={0.15}>
                <animate
                  attributeName="r"
                  values="8;25"
                  dur="0.2s"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0"
                  dur="0.2s"
                  fill="freeze"
                />
              </circle>
            )}
          </g>
        </svg>
      );

    case "fist-open":
      // Fist opening to flat hand
      const openness = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0=fist, 1=open
      const fingerSpread = openness * 8;
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
          <g opacity={isActive ? 1 : 0.5}>
            {/* Wrist */}
            <path
              d="M40 70 L40 52"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.5}
            />
            {/* Palm */}
            <ellipse
              cx="40"
              cy="46"
              rx={8 + openness * 3}
              ry={7}
              stroke="white"
              strokeWidth="1"
              fill="white"
              fillOpacity={0.04}
              opacity={0.4}
            />
            {/* Fingers - spread out when open */}
            {[
              { angle: -40, len: 22 },
              { angle: -14, len: 26 },
              { angle: 8, len: 26 },
              { angle: 30, len: 22 },
              { angle: 50, len: 18 },
            ].map((finger, i) => {
              const curl = 1 - openness;
              const baseAngle = finger.angle;
              const spreadAngle = baseAngle - (i - 2) * fingerSpread * 0.3;
              const finalAngle = isActive ? spreadAngle : baseAngle;
              const rad = (finalAngle * Math.PI) / 180;
              const length = finger.len * (1 - curl * 0.5);
              const endX = 40 + Math.sin(rad) * length;
              const endY = 42 - Math.cos(rad) * length;
              // Curl: bend midway
              const midX = 40 + Math.sin(rad) * length * (0.5 + curl * 0.2);
              const midY = 42 - Math.cos(rad) * length * (0.5 - curl * 0.3);
              return (
                <path
                  key={i}
                  d={
                    curl > 0.3
                      ? `M40 42 Q${midX} ${midY} ${40 + (endX - 40) * 0.6} ${42 + (endY - 42) * 0.4}`
                      : `M40 42 L${endX} ${endY}`
                  }
                  stroke="white"
                  strokeWidth={i === 0 ? "2" : "1.5"}
                  strokeLinecap="round"
                  opacity={0.6 + (i === 1 || i === 2 ? 0.3 : 0)}
                />
              );
            })}
            {/* State indicator ring */}
            <circle
              cx="40"
              cy="40"
              r={12 + openness * 8}
              stroke={mint}
              strokeWidth="0.8"
              fill="none"
              opacity={0.2 + openness * 0.3}
              strokeDasharray="2 4"
            />
            {/* Center dot */}
            <circle
              cx="40"
              cy="42"
              r={openness > 0.5 ? 3 : 1.5}
              fill={mint}
              opacity={openness > 0.5 ? 0.5 : 0.15}
            />
          </g>
          {/* State labels */}
          {isActive && (
            <>
              <text
                x="40"
                y="10"
                textAnchor="middle"
                fill={mint}
                fontSize="5"
                fontFamily="var(--font-geist-mono)"
                letterSpacing="0.15em"
                opacity={openness > 0.6 ? 0.7 : 0.2}
              >
                OPEN
              </text>
            </>
          )}
        </svg>
      );

    default:
      return null;
  }
};

// Video player component for gesture demonstrations
const GestureVideo = ({
  videoSrc,
  isActive,
  fallbackGesture,
}: {
  videoSrc: string;
  isActive: boolean;
  fallbackGesture: "pinch" | "frame" | "fist-open";
}) => {
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  if (hasError) {
    return <GestureIllustration gesture={fallbackGesture} isActive={isActive} />;
  }

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      loop
      muted
      playsInline
      className={`w-full h-full object-cover transition-opacity duration-500 ${
        isActive ? "opacity-100" : "opacity-40"
      }`}
      onError={() => setHasError(true)}
    />
  );
};

// Film-strip perforation pattern
const FilmPerforations = ({ side, count = 6 }: { side: "left" | "right"; count?: number }) => (
  <div
    className={`absolute top-0 bottom-0 ${side === "left" ? "left-0" : "right-0"} w-5 flex flex-col justify-around py-4`}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="mx-auto w-2.5 h-3.5 rounded-[1px] border border-white/[0.08] bg-white/[0.02]"
      />
    ))}
  </div>
);

export default function GestureTutorial({ onComplete, isVisible, isLoading = false }: GestureTutorialProps) {
  const [activeGesture, setActiveGesture] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [enterAnim, setEnterAnim] = useState(false);

  const gestures = [
    {
      gesture: "pinch" as const,
      title: "Pinch & Drag",
      shortcut: "LOOK",
      instructions: "Pinch thumb to index, then drag to pan around the panorama",
      videoSrc: "/gestures/pinch.mp4",
    },
    {
      gesture: "fist-open" as const,
      title: "Toggle Camera",
      shortcut: "EQUIP",
      instructions: "Close your fist, then open hand quickly to toggle camera overlay",
      videoSrc: "/gestures/toggle.mp4",
    },
    {
      gesture: "frame" as const,
      title: "Take Photo",
      shortcut: "CAPTURE",
      instructions: "Form an L-shape with both hands to frame a shot, hold to capture",
      videoSrc: "/gestures/photo.mp4",
    },
  ];

  // Entrance animation
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setEnterAnim(true), 50);
      return () => clearTimeout(timer);
    } else {
      setEnterAnim(false);
    }
  }, [isVisible]);

  // Cycle through gestures
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveGesture((prev) => (prev + 1) % gestures.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [gestures.length, isVisible]);

  // Ready = generation done (not loading) and minimum time elapsed
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useEffect(() => {
    if (!isVisible) {
      setIsReady(false);
      setMinTimeElapsed(false);
      setLoadingMsgIndex(0);
      return;
    }
    const timer = setTimeout(() => setMinTimeElapsed(true), 3000);
    return () => clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    setIsReady(minTimeElapsed && !isLoading);
  }, [minTimeElapsed, isLoading]);

  // Fake progress bar
  useEffect(() => {
    if (!isVisible) {
      setFakeProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setFakeProgress((prev) => {
        if (!isLoading) {
          return prev >= 100 ? 100 : Math.min(100, prev + 4);
        }
        if (prev < 30) return prev + 2.5;
        if (prev < 60) return prev + 1.2;
        if (prev < 80) return prev + 0.4;
        if (prev < 90) return prev + 0.1;
        return prev + 0.02;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isVisible, isLoading]);

  // Advance loading messages
  useEffect(() => {
    if (!isVisible || !isLoading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [isVisible, isLoading]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-[#030304]/90 backdrop-blur-xl transition-opacity duration-500 ${
          enterAnim ? "opacity-100" : "opacity-0"
        }`}
        onClick={isReady ? onComplete : undefined}
      />

      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)",
        }}
      />

      {/* Main card */}
      <div
        className={`relative z-10 w-full max-w-2xl mx-4 transition-all duration-700 ease-out ${
          enterAnim ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.97]"
        }`}
      >
        {/* Film strip frame */}
        <div className="relative bg-[#0a0a0c] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Film perforations */}
          <FilmPerforations side="left" />
          <FilmPerforations side="right" />

          {/* Inner content area */}
          <div className="relative px-10 py-8">
            {/* Close button */}
            {isReady && (
              <button
                onClick={onComplete}
                className="absolute top-4 right-10 z-20 p-1.5 text-white/25 hover:text-white/60 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              {/* Technical label bar */}
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.06]" />
                <span
                  className="text-[9px] tracking-[0.35em] uppercase text-white/20"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  Gesture Control System
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.06]" />
              </div>

              <h2
                className="text-xl font-light text-white/90 tracking-tight mb-2"
              >
                Hand Controls
              </h2>
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-white/25"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                Navigate the panorama with your hands
              </p>
            </div>

            {/* Gesture panels — film frame style */}
            <div className="flex gap-3 mb-6">
              {gestures.map((g, index) => {
                const isActive = activeGesture === index;
                return (
                  <button
                    key={g.gesture}
                    onClick={() => setActiveGesture(index)}
                    className={`flex-1 relative rounded-lg border transition-all duration-500 overflow-hidden group cursor-pointer ${
                      isActive
                        ? "border-[#B0FBCD]/20 bg-[#B0FBCD]/[0.03]"
                        : "border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] hover:bg-white/[0.02]"
                    }`}
                    style={{
                      transitionDelay: `${index * 80}ms`,
                    }}
                  >
                    {/* Top strip — gesture type badge */}
                    <div className="relative px-3 pt-3 pb-1 flex items-center justify-between">
                      <span
                        className={`text-[8px] tracking-[0.3em] uppercase transition-colors duration-300 ${
                          isActive ? "text-[#B0FBCD]/60" : "text-white/15"
                        }`}
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {g.shortcut}
                      </span>
                      {/* Active indicator dot */}
                      <div
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                          isActive ? "bg-[#B0FBCD]/70 shadow-[0_0_6px_rgba(176,251,205,0.3)]" : "bg-white/[0.06]"
                        }`}
                      />
                    </div>

                    {/* Illustration area */}
                    <div className="px-3 py-2">
                      <div
                        className={`relative w-full aspect-square max-w-[100px] mx-auto rounded border transition-all duration-500 overflow-hidden ${
                          isActive
                            ? "border-white/[0.08] bg-black/40"
                            : "border-white/[0.03] bg-black/20"
                        }`}
                      >
                        {/* Corner tick marks */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" fill="none">
                          <path d="M2 10 L2 2 L10 2" stroke={isActive ? "#B0FBCD" : "white"} strokeWidth="0.5" opacity={isActive ? 0.4 : 0.08} />
                          <path d="M90 2 L98 2 L98 10" stroke={isActive ? "#B0FBCD" : "white"} strokeWidth="0.5" opacity={isActive ? 0.4 : 0.08} />
                          <path d="M2 90 L2 98 L10 98" stroke={isActive ? "#B0FBCD" : "white"} strokeWidth="0.5" opacity={isActive ? 0.4 : 0.08} />
                          <path d="M90 98 L98 98 L98 90" stroke={isActive ? "#B0FBCD" : "white"} strokeWidth="0.5" opacity={isActive ? 0.4 : 0.08} />
                        </svg>

                        {g.videoSrc ? (
                          <GestureVideo
                            videoSrc={g.videoSrc}
                            isActive={isActive}
                            fallbackGesture={g.gesture}
                          />
                        ) : (
                          <GestureIllustration gesture={g.gesture} isActive={isActive} />
                        )}
                      </div>
                    </div>

                    {/* Title + description */}
                    <div className="px-3 pb-3">
                      <h3
                        className={`text-xs font-medium mb-1 transition-colors duration-300 ${
                          isActive ? "text-white/90" : "text-white/30"
                        }`}
                      >
                        {g.title}
                      </h3>
                      <p
                        className={`text-[10px] leading-relaxed transition-colors duration-300 ${
                          isActive ? "text-white/40" : "text-white/15"
                        }`}
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {g.instructions}
                      </p>
                    </div>

                    {/* Bottom progress bar for active gesture */}
                    <div className="h-[2px] w-full bg-white/[0.02]">
                      {isActive && (
                        <div
                          className="h-full bg-[#B0FBCD]/30"
                          style={{
                            animation: "gestureTimer 4s linear",
                          }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation dots */}
            <div className="flex justify-center gap-3 mb-6">
              {gestures.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveGesture(index)}
                  className="group relative py-2 px-1"
                >
                  <div
                    className={`h-[2px] rounded-full transition-all duration-500 ${
                      activeGesture === index
                        ? "bg-[#B0FBCD]/60 w-6"
                        : "bg-white/[0.08] w-3 group-hover:bg-white/[0.15]"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Webcam requirement badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.04] bg-white/[0.01]">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-red-400/40 animate-ping" />
                </div>
                <span
                  className="text-[9px] tracking-[0.15em] uppercase text-white/25"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  Webcam Required
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            {/* Loading status / progress */}
            {!isReady ? (
              <div className="mb-5">
                {/* Progress track */}
                <div className="relative h-[3px] w-full rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#B0FBCD]/40 to-[#B0FBCD]/70 transition-all duration-300 ease-out"
                    style={{ width: `${fakeProgress}%` }}
                  />
                  {/* Glow */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#B0FBCD]/20 blur-sm transition-all duration-300 ease-out"
                    style={{ width: `${fakeProgress}%` }}
                  />
                </div>

                {/* Status readout */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative h-3 w-3">
                      <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
                      <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[#B0FBCD]/50" />
                    </div>
                    <span
                      className="text-[10px] text-white/30 transition-opacity duration-300"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {isLoading ? LOADING_MESSAGES[loadingMsgIndex] : "Almost there..."}
                    </span>
                  </div>
                  <span
                    className="text-[10px] text-white/15 tabular-nums"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {Math.round(fakeProgress)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-5" />
            )}

            {/* Action button */}
            <div className="flex justify-center">
              <button
                onClick={onComplete}
                disabled={!isReady}
                className={`relative group px-10 py-3 rounded-lg text-sm tracking-wider uppercase transition-all duration-500 ${
                  isReady
                    ? "bg-[#B0FBCD]/[0.08] hover:bg-[#B0FBCD]/[0.14] border border-[#B0FBCD]/20 hover:border-[#B0FBCD]/35 text-[#B0FBCD]/80 hover:text-[#B0FBCD] cursor-pointer"
                    : "bg-white/[0.02] border border-white/[0.04] text-white/15 cursor-not-allowed"
                }`}
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {/* Hover glow */}
                {isReady && (
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ boxShadow: "0 0 40px rgba(176, 251, 205, 0.08)" }}
                  />
                )}
                <span className="relative">
                  {isReady ? "Enter Panorama" : "Rendering..."}
                </span>
              </button>
            </div>
          </div>

          {/* Film grain overlay on card */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03] rounded-xl"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
            }}
          />
        </div>
      </div>

      {/* Gesture timer animation keyframes */}
      <style jsx>{`
        @keyframes gestureTimer {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>

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
