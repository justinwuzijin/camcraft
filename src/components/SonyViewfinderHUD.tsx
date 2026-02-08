"use client";

import { useState, useEffect, useRef } from "react";

interface SonyViewfinderHUDProps {
  /** Whether the AI focus is currently processing */
  focusLoading?: boolean;
  /** Whether a focused image is ready (focus confirmed) */
  focusConfirmed?: boolean;
  /** Camera specs to display */
  cameraSpecs?: {
    shutterSpeed?: string;
    aperture?: string;
    iso?: string;
    focalLength?: string;
    whiteBalance?: string;
  };
}

// Simulated shooting values that feel authentic
const DEFAULT_SPECS = {
  shutterSpeed: "1/125",
  aperture: "2.8",
  iso: "400",
  focalLength: "35mm",
  whiteBalance: "AWB",
};

export default function SonyViewfinderHUD({
  focusLoading = false,
  focusConfirmed = false,
  cameraSpecs,
}: SonyViewfinderHUDProps) {
  const specs = { ...DEFAULT_SPECS, ...cameraSpecs };
  const [focusLocked, setFocusLocked] = useState(false);
  const [showFocusFlash, setShowFocusFlash] = useState(false);
  const [evValue] = useState(() => {
    const vals = ["-2", "-1.7", "-1.3", "-1", "-0.7", "-0.3", "0", "+0.3", "+0.7", "+1"];
    return vals[Math.floor(Math.random() * vals.length)];
  });
  const [shotCount] = useState(() => Math.floor(Math.random() * 400) + 100);
  const [batteryLevel] = useState(() => Math.floor(Math.random() * 40) + 60);
  const prevFocusConfirmed = useRef(false);

  // Focus lock animation when focus confirms
  useEffect(() => {
    if (focusConfirmed && !prevFocusConfirmed.current) {
      setFocusLocked(true);
      setShowFocusFlash(true);
      const t = setTimeout(() => setShowFocusFlash(false), 600);
      return () => clearTimeout(t);
    }
    if (!focusConfirmed) {
      setFocusLocked(false);
    }
    prevFocusConfirmed.current = focusConfirmed;
  }, [focusConfirmed]);

  // Scanning animation for focus brackets when loading
  const [scanPhase, setScanPhase] = useState(0);
  useEffect(() => {
    if (!focusLoading) {
      setScanPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setScanPhase((p) => (p + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, [focusLoading]);

  const bracketColor = focusLocked
    ? "#4ADE80"
    : focusLoading
    ? "#FFFFFF"
    : "rgba(255,255,255,0.7)";

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* Sony-style viewfinder CSS */}
      <style>{`
        .sony-vf {
          font-family: "SST", "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }
        .sony-vf-mono {
          font-family: "SST Condensed", "Geist Mono", "SF Mono", "Menlo", monospace;
          letter-spacing: 0.02em;
        }
        @keyframes sony-focus-scan {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.92); }
        }
        @keyframes sony-focus-lock {
          0% { transform: scale(1.15); opacity: 0.5; }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sony-focus-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sony-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes sony-scan-line {
          0% { top: 20%; }
          50% { top: 75%; }
          100% { top: 20%; }
        }
        .sony-focus-scanning {
          animation: sony-focus-scan 0.6s ease-in-out infinite;
        }
        .sony-focus-locked {
          animation: sony-focus-lock 0.3s ease-out forwards;
        }
        .sony-blink {
          animation: sony-blink 1s ease-in-out infinite;
        }
      `}</style>

      {/* ── Top-left: Shooting mode + Drive mode ── */}
      <div className="sony-vf absolute top-[6%] left-[5%] flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-[3px] px-[6px] py-[1px]"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <span
            className="text-[11px] font-bold text-white leading-none"
            style={{ letterSpacing: "0.05em" }}
          >
            M
          </span>
        </div>
        {/* Drive mode icon - single shot */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="opacity-80">
          <rect x="1" y="2" width="12" height="6" rx="1" stroke="white" strokeWidth="1" />
          <rect x="4" y="4" width="6" height="2" fill="white" fillOpacity="0.6" />
        </svg>
      </div>

      {/* ── Top-right: Battery + Card slots ── */}
      <div className="sony-vf absolute top-[6%] right-[5%] flex items-center gap-3">
        {/* Card slot indicators */}
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-white/60 font-medium" style={{ letterSpacing: "0.03em" }}>
            1
          </span>
          <div
            className="w-[14px] h-[10px] rounded-[2px]"
            style={{
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <span className="text-[8px] text-white/40 font-medium ml-1" style={{ letterSpacing: "0.03em" }}>
            2
          </span>
          <div
            className="w-[14px] h-[10px] rounded-[2px]"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
            }}
          />
        </div>
        {/* Battery indicator */}
        <div className="flex items-center gap-1">
          <div className="relative">
            <div
              className="w-[22px] h-[11px] rounded-[2px]"
              style={{ border: "1.5px solid rgba(255,255,255,0.7)" }}
            >
              <div
                className="absolute top-[2px] left-[2px] bottom-[2px] rounded-[1px]"
                style={{
                  width: `${Math.max(2, (batteryLevel / 100) * 16)}px`,
                  background:
                    batteryLevel > 20
                      ? "rgba(255,255,255,0.8)"
                      : "#EF4444",
                }}
              />
            </div>
            <div
              className="absolute right-[-3px] top-[3px] w-[2px] h-[5px] rounded-r-[1px]"
              style={{ background: "rgba(255,255,255,0.7)" }}
            />
          </div>
          <span className="sony-vf-mono text-[9px] text-white/60">{batteryLevel}%</span>
        </div>
      </div>

      {/* ── Center: Focus brackets ── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative ${
            focusLoading ? "sony-focus-scanning" : focusLocked ? "sony-focus-locked" : ""
          }`}
          style={{ width: "18%", aspectRatio: "4/3" }}
        >
          {/* Corner brackets */}
          {[
            // top-left
            { top: 0, left: 0, borderTop: `1.5px solid ${bracketColor}`, borderLeft: `1.5px solid ${bracketColor}` },
            // top-right
            { top: 0, right: 0, borderTop: `1.5px solid ${bracketColor}`, borderRight: `1.5px solid ${bracketColor}` },
            // bottom-left
            { bottom: 0, left: 0, borderBottom: `1.5px solid ${bracketColor}`, borderLeft: `1.5px solid ${bracketColor}` },
            // bottom-right
            { bottom: 0, right: 0, borderBottom: `1.5px solid ${bracketColor}`, borderRight: `1.5px solid ${bracketColor}` },
          ].map((style, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: "22%",
                height: "28%",
                transition: "border-color 0.2s ease",
                ...style,
              }}
            />
          ))}

          {/* Center cross-hair (small) */}
          {!focusLoading && !focusLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[10px] h-[10px]">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40" />
              </div>
            </div>
          )}

          {/* Focus scanning effect */}
          {focusLoading && (
            <>
              {/* Horizontal scan line */}
              <div
                className="absolute left-[10%] right-[10%] h-px"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                  animation: "sony-scan-line 1.2s ease-in-out infinite",
                }}
              />
              {/* Pulsing center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-2 h-2 rounded-full sony-blink"
                  style={{ background: "rgba(255,255,255,0.8)" }}
                />
              </div>
            </>
          )}

          {/* Focus lock flash */}
          {showFocusFlash && (
            <div
              className="absolute inset-0"
              style={{
                border: `2px solid #4ADE80`,
                animation: "sony-focus-flash 0.6s ease-out forwards",
              }}
            />
          )}

          {/* Focus confirmed indicator */}
          {focusLocked && !showFocusFlash && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[10px] h-[10px]">
                <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: "#4ADE80" }} />
                <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "#4ADE80" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Focus status text ── */}
      {focusLoading && (
        <div className="sony-vf absolute top-[38%] left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span
            className="text-[10px] text-white/80 sony-blink uppercase tracking-widest"
          >
            Focusing
          </span>
        </div>
      )}

      {/* ── Bottom: Exposure info bar ── */}
      <div className="sony-vf absolute bottom-[5%] left-[5%] right-[5%]">
        {/* EV scale */}
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-0">
            {/* EV compensation scale: -3 to +3 */}
            {Array.from({ length: 13 }, (_, i) => {
              const val = (i - 6) / 2;
              const isMajor = val === Math.floor(val);
              const evNum = parseFloat(evValue);
              const isActive = Math.abs(val - evNum) < 0.3;
              return (
                <div key={i} className="flex flex-col items-center" style={{ width: "6px" }}>
                  <div
                    className="rounded-full"
                    style={{
                      width: isActive ? "4px" : isMajor ? "2px" : "1px",
                      height: isActive ? "4px" : isMajor ? "6px" : "4px",
                      background: isActive
                        ? "#FBBF24"
                        : `rgba(255,255,255,${isMajor ? 0.5 : 0.25})`,
                      transition: "all 0.2s ease",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <span className="sony-vf-mono text-[8px] text-white/40 ml-1">EV</span>
        </div>

        {/* Main shooting info */}
        <div className="flex items-center justify-between">
          {/* Left group: Focus mode + metering */}
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-medium px-[4px] py-[1px] rounded-[2px]"
              style={{
                color: focusLocked ? "#4ADE80" : "rgba(255,255,255,0.6)",
                border: `1px solid ${focusLocked ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.2)"}`,
                transition: "all 0.3s ease",
              }}
            >
              AF-C
            </span>
            {/* Metering icon - matrix */}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
              <rect x="1" y="1" width="4" height="4" stroke="white" strokeWidth="0.8" />
              <rect x="7" y="1" width="4" height="4" stroke="white" strokeWidth="0.8" />
              <rect x="1" y="7" width="4" height="4" stroke="white" strokeWidth="0.8" />
              <rect x="7" y="7" width="4" height="4" stroke="white" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Center group: Shutter + Aperture + ISO */}
          <div className="flex items-center gap-3">
            <span className="sony-vf-mono text-[13px] text-white font-medium tracking-tight">
              {specs.shutterSpeed}
            </span>
            <span className="sony-vf-mono text-[13px] text-white font-medium tracking-tight">
              F{specs.aperture}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-white/40">ISO</span>
              <span className="sony-vf-mono text-[13px] text-white font-medium tracking-tight">
                {specs.iso}
              </span>
            </div>
          </div>

          {/* Right group: WB + shots remaining */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-white/50 font-medium">
              {specs.whiteBalance}
            </span>
            <span className="sony-vf-mono text-[10px] text-white/40">
              [{shotCount}]
            </span>
          </div>
        </div>
      </div>

      {/* ── Left side: Focus area indicator ── */}
      <div className="sony-vf absolute left-[5%] top-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center gap-1">
          {/* Vertical level indicator */}
          <div className="w-[3px] h-[40px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="w-full rounded-full transition-all duration-500"
              style={{
                height: "30%",
                marginTop: "35%",
                background: "rgba(255,255,255,0.5)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Right side: Focal length ── */}
      <div className="sony-vf-mono absolute right-[5%] top-1/2 -translate-y-1/2">
        <span className="text-[9px] text-white/40 [writing-mode:vertical-lr]">
          {specs.focalLength}
        </span>
      </div>

      {/* ── Top center: Recording format indicator ── */}
      <div className="sony-vf absolute top-[6%] left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-[8px] text-white/30 font-medium tracking-wider">
          RAW+J
        </span>
        <span className="text-[8px] text-white/30">|</span>
        <span className="text-[8px] text-white/30 font-medium tracking-wider">
          33M
        </span>
      </div>

      {/* ── Rule of thirds grid (subtle) ── */}
      <div className="absolute inset-0" style={{ opacity: 0.08 }}>
        <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
      </div>
    </div>
  );
}
