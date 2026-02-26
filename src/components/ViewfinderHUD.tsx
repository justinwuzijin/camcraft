"use client";

import { useState, useEffect, useRef } from "react";
import type { CameraId } from "@/lib/cameraStore";

interface ViewfinderHUDProps {
  cameraId: CameraId;
  focusLoading?: boolean;
  focusConfirmed?: boolean;
}

export default function ViewfinderHUD({
  cameraId,
  focusLoading = false,
  focusConfirmed = false,
}: ViewfinderHUDProps) {
  switch (cameraId) {
    case "sony-a7iv":
      return <SonyA7HUD focusLoading={focusLoading} focusConfirmed={focusConfirmed} />;
    case "fujifilm-xt2":
      return <FujifilmHUD focusLoading={focusLoading} focusConfirmed={focusConfirmed} />;
    case "digital-camera":
      return <DigitalCameraHUD focusLoading={focusLoading} focusConfirmed={focusConfirmed} />;
    case "sony-handycam":
      return <HandycamHUD focusLoading={focusLoading} focusConfirmed={focusConfirmed} />;
    default:
      return <SonyA7HUD focusLoading={focusLoading} focusConfirmed={focusConfirmed} />;
  }
}

function SonyA7HUD({
  focusLoading = false,
  focusConfirmed = false,
}: {
  focusLoading?: boolean;
  focusConfirmed?: boolean;
}) {
  const [focusLocked, setFocusLocked] = useState(false);
  const [showFocusFlash, setShowFocusFlash] = useState(false);
  const [evValue] = useState(() => {
    const vals = ["-2", "-1.7", "-1.3", "-1", "-0.7", "-0.3", "0", "+0.3", "+0.7", "+1"];
    return vals[Math.floor(Math.random() * vals.length)];
  });
  const [shotCount] = useState(() => Math.floor(Math.random() * 400) + 100);
  const [batteryLevel] = useState(() => Math.floor(Math.random() * 40) + 60);
  const prevFocusConfirmed = useRef(false);

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
      <style>{`
        .sony-vf { font-family: "SST", "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        .sony-vf-mono { font-family: "SST Condensed", "Geist Mono", "SF Mono", "Menlo", monospace; letter-spacing: 0.02em; }
        @keyframes sony-focus-scan { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.92); } }
        @keyframes sony-focus-lock { 0% { transform: scale(1.15); opacity: 0.5; } 50% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes sony-focus-flash { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes sony-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes sony-scan-line { 0% { top: 20%; } 50% { top: 75%; } 100% { top: 20%; } }
        .sony-focus-scanning { animation: sony-focus-scan 0.6s ease-in-out infinite; }
        .sony-focus-locked { animation: sony-focus-lock 0.3s ease-out forwards; }
        .sony-blink { animation: sony-blink 1s ease-in-out infinite; }
      `}</style>

      {/* Top-left: Mode */}
      <div className="sony-vf absolute top-[6%] left-[5%] flex items-center gap-2">
        <div className="flex items-center justify-center rounded-[3px] px-[6px] py-[1px]" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
          <span className="text-[11px] font-bold text-white leading-none" style={{ letterSpacing: "0.05em" }}>M</span>
        </div>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="opacity-80">
          <rect x="1" y="2" width="12" height="6" rx="1" stroke="white" strokeWidth="1" />
          <rect x="4" y="4" width="6" height="2" fill="white" fillOpacity="0.6" />
        </svg>
      </div>

      {/* Top-right: Battery + Cards */}
      <div className="sony-vf absolute top-[6%] right-[5%] flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-white/60 font-medium">1</span>
          <div className="w-[14px] h-[10px] rounded-[2px]" style={{ border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)" }} />
          <span className="text-[8px] text-white/40 font-medium ml-1">2</span>
          <div className="w-[14px] h-[10px] rounded-[2px]" style={{ border: "1px solid rgba(255,255,255,0.2)" }} />
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <div className="w-[22px] h-[11px] rounded-[2px]" style={{ border: "1.5px solid rgba(255,255,255,0.7)" }}>
              <div className="absolute top-[2px] left-[2px] bottom-[2px] rounded-[1px]" style={{ width: `${Math.max(2, (batteryLevel / 100) * 16)}px`, background: batteryLevel > 20 ? "rgba(255,255,255,0.8)" : "#EF4444" }} />
            </div>
            <div className="absolute right-[-3px] top-[3px] w-[2px] h-[5px] rounded-r-[1px]" style={{ background: "rgba(255,255,255,0.7)" }} />
          </div>
          <span className="sony-vf-mono text-[9px] text-white/60">{batteryLevel}%</span>
        </div>
      </div>

      {/* Center: Focus brackets */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`relative ${focusLoading ? "sony-focus-scanning" : focusLocked ? "sony-focus-locked" : ""}`} style={{ width: "18%", aspectRatio: "4/3" }}>
          {[
            { top: 0, left: 0, borderTop: `1.5px solid ${bracketColor}`, borderLeft: `1.5px solid ${bracketColor}` },
            { top: 0, right: 0, borderTop: `1.5px solid ${bracketColor}`, borderRight: `1.5px solid ${bracketColor}` },
            { bottom: 0, left: 0, borderBottom: `1.5px solid ${bracketColor}`, borderLeft: `1.5px solid ${bracketColor}` },
            { bottom: 0, right: 0, borderBottom: `1.5px solid ${bracketColor}`, borderRight: `1.5px solid ${bracketColor}` },
          ].map((style, i) => (
            <div key={i} className="absolute" style={{ width: "22%", height: "28%", transition: "border-color 0.2s ease", ...style }} />
          ))}
          {!focusLoading && !focusLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[10px] h-[10px]">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40" />
              </div>
            </div>
          )}
          {focusLoading && (
            <>
              <div className="absolute left-[10%] right-[10%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)", animation: "sony-scan-line 1.2s ease-in-out infinite" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full sony-blink" style={{ background: "rgba(255,255,255,0.8)" }} />
              </div>
            </>
          )}
          {showFocusFlash && <div className="absolute inset-0" style={{ border: "2px solid #4ADE80", animation: "sony-focus-flash 0.6s ease-out forwards" }} />}
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

      {focusLoading && (
        <div className="sony-vf absolute top-[38%] left-1/2 -translate-x-1/2">
          <span className="text-[10px] text-white/80 sony-blink uppercase tracking-widest">Focusing</span>
        </div>
      )}

      {/* Bottom: Exposure bar */}
      <div className="sony-vf absolute bottom-[5%] left-[5%] right-[5%]">
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-0">
            {Array.from({ length: 13 }, (_, i) => {
              const val = (i - 6) / 2;
              const isMajor = val === Math.floor(val);
              const evNum = parseFloat(evValue);
              const isActive = Math.abs(val - evNum) < 0.3;
              return (
                <div key={i} className="flex flex-col items-center" style={{ width: "6px" }}>
                  <div className="rounded-full" style={{ width: isActive ? "4px" : isMajor ? "2px" : "1px", height: isActive ? "4px" : isMajor ? "6px" : "4px", background: isActive ? "#FBBF24" : `rgba(255,255,255,${isMajor ? 0.5 : 0.25})` }} />
                </div>
              );
            })}
          </div>
          <span className="sony-vf-mono text-[8px] text-white/40 ml-1">EV</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-medium px-[4px] py-[1px] rounded-[2px]" style={{ color: focusLocked ? "#4ADE80" : "rgba(255,255,255,0.6)", border: `1px solid ${focusLocked ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.2)"}` }}>AF-C</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="sony-vf-mono text-[13px] text-white font-medium">1/125</span>
            <span className="sony-vf-mono text-[13px] text-white font-medium">F2.8</span>
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-white/40">ISO</span>
              <span className="sony-vf-mono text-[13px] text-white font-medium">400</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-white/50 font-medium">AWB</span>
            <span className="sony-vf-mono text-[10px] text-white/40">[{shotCount}]</span>
          </div>
        </div>
      </div>

      {/* Top center: Format */}
      <div className="sony-vf absolute top-[6%] left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-[8px] text-white/30 font-medium tracking-wider">RAW+J</span>
        <span className="text-[8px] text-white/30">|</span>
        <span className="text-[8px] text-white/30 font-medium tracking-wider">33M</span>
      </div>

      {/* Rule of thirds */}
      <div className="absolute inset-0" style={{ opacity: 0.08 }}>
        <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
      </div>
    </div>
  );
}

function FujifilmHUD({
  focusLoading = false,
  focusConfirmed = false,
}: {
  focusLoading?: boolean;
  focusConfirmed?: boolean;
}) {
  const [focusLocked, setFocusLocked] = useState(false);
  const [shotCount] = useState(() => Math.floor(Math.random() * 300) + 50);
  const [batteryLevel] = useState(() => Math.floor(Math.random() * 40) + 60);
  const prevFocusConfirmed = useRef(false);

  useEffect(() => {
    if (focusConfirmed && !prevFocusConfirmed.current) {
      setFocusLocked(true);
    }
    if (!focusConfirmed) {
      setFocusLocked(false);
    }
    prevFocusConfirmed.current = focusConfirmed;
  }, [focusConfirmed]);

  const bracketColor = focusLocked ? "#4ADE80" : focusLoading ? "#FFFFFF" : "rgba(255,255,255,0.6)";

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <style>{`
        .fuji-vf { font-family: "Helvetica Neue", Arial, sans-serif; }
        .fuji-mono { font-family: "Menlo", "Monaco", monospace; letter-spacing: 0.05em; }
        @keyframes fuji-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .fuji-blink { animation: fuji-blink 0.8s ease-in-out infinite; }
      `}</style>

      {/* Top-left: Film simulation */}
      <div className="fuji-vf absolute top-[5%] left-[4%]">
        <div className="px-2 py-0.5 rounded-sm" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <span className="text-[9px] text-white/80 tracking-wider">PROVIA/STD</span>
        </div>
      </div>

      {/* Top-center: DR mode */}
      <div className="fuji-vf absolute top-[5%] left-1/2 -translate-x-1/2">
        <span className="text-[8px] text-white/40">DR100%</span>
      </div>

      {/* Top-right: Battery */}
      <div className="fuji-vf absolute top-[5%] right-[4%] flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="relative w-[20px] h-[10px] rounded-[2px]" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
            <div className="absolute top-[1px] left-[1px] bottom-[1px] rounded-[1px]" style={{ width: `${(batteryLevel / 100) * 16}px`, background: "rgba(255,255,255,0.7)" }} />
          </div>
        </div>
      </div>

      {/* Center: Simple focus frame */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: "16%", aspectRatio: "4/3" }}>
          <div className="absolute inset-0" style={{ border: `1px solid ${bracketColor}`, transition: "border-color 0.2s" }} />
          {focusLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/80 fuji-blink" />
            </div>
          )}
          {focusLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full" style={{ background: "#4ADE80" }} />
            </div>
          )}
        </div>
      </div>

      {focusLoading && (
        <div className="fuji-vf absolute top-[36%] left-1/2 -translate-x-1/2">
          <span className="text-[9px] text-white/70 fuji-blink">AF</span>
        </div>
      )}

      {/* Left: Histogram hint */}
      <div className="absolute left-[4%] bottom-[20%]">
        <div className="w-12 h-8 rounded-sm" style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.1))", border: "1px solid rgba(255,255,255,0.1)" }} />
      </div>

      {/* Bottom: Settings bar */}
      <div className="fuji-mono absolute bottom-[4%] left-[4%] right-[4%]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/70">S</span>
            <span className="text-[12px] text-white font-medium">1/125</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/70">F</span>
            <span className="text-[12px] text-white font-medium">2.8</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/70">ISO</span>
            <span className="text-[12px] text-white font-medium">400</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/50">WB</span>
            <span className="text-[9px] text-white/70">AUTO</span>
          </div>
          <span className="text-[10px] text-white/40">{shotCount}</span>
        </div>
      </div>

      {/* Right: Focus mode */}
      <div className="fuji-vf absolute right-[4%] top-1/2 -translate-y-1/2">
        <span className="text-[8px] text-white/40 [writing-mode:vertical-lr]" style={{ color: focusLocked ? "#4ADE80" : undefined }}>AF-C</span>
      </div>
    </div>
  );
}

function DigitalCameraHUD({
  focusLoading = false,
  focusConfirmed = false,
}: {
  focusLoading?: boolean;
  focusConfirmed?: boolean;
}) {
  const [focusLocked, setFocusLocked] = useState(false);
  const [shotCount] = useState(() => Math.floor(Math.random() * 200) + 20);
  const [dateStamp] = useState(() => {
    const d = new Date();
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear().toString().slice(-2)}`;
  });
  const prevFocusConfirmed = useRef(false);

  useEffect(() => {
    if (focusConfirmed && !prevFocusConfirmed.current) {
      setFocusLocked(true);
    }
    if (!focusConfirmed) {
      setFocusLocked(false);
    }
    prevFocusConfirmed.current = focusConfirmed;
  }, [focusConfirmed]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <style>{`
        .digi-vf { font-family: "Arial", sans-serif; }
        @keyframes digi-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .digi-blink { animation: digi-blink 0.5s step-end infinite; }
      `}</style>

      {/* Top-left: Scene mode */}
      <div className="digi-vf absolute top-[4%] left-[4%]">
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-sm bg-green-500/80 flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">A</span>
          </div>
        </div>
      </div>

      {/* Top-center: Resolution */}
      <div className="digi-vf absolute top-[4%] left-1/2 -translate-x-1/2">
        <span className="text-[10px] text-orange-400 font-bold">5M</span>
      </div>

      {/* Top-right: Battery */}
      <div className="digi-vf absolute top-[4%] right-[4%]">
        <div className="relative w-[24px] h-[12px] rounded-[1px]" style={{ border: "2px solid rgba(255,255,255,0.8)" }}>
          <div className="absolute top-[1px] left-[1px] bottom-[1px] w-[60%] bg-white/80 rounded-[1px]" />
          <div className="absolute right-[-4px] top-[3px] w-[2px] h-[4px] bg-white/80" />
        </div>
      </div>

      {/* Center: Simple crosshair box */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[20%] aspect-[4/3]" style={{ border: focusLocked ? "2px solid #4ADE80" : focusLoading ? "2px solid #FFFFFF" : "1px solid rgba(255,255,255,0.5)" }}>
          {!focusLoading && !focusLocked && (
            <>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-px bg-white/50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-4 bg-white/50" />
            </>
          )}
          {focusLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold digi-blink">AF</span>
            </div>
          )}
          {focusLocked && (
            <div className="absolute inset-[-2px] border-2 border-green-400" />
          )}
        </div>
      </div>

      {/* Bottom-left: Zoom indicator */}
      <div className="digi-vf absolute bottom-[15%] left-[4%]">
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-white/60">W</span>
          <div className="w-16 h-1.5 rounded-full bg-white/20">
            <div className="w-1/3 h-full rounded-full bg-white/60" />
          </div>
          <span className="text-[8px] text-white/60">T</span>
        </div>
      </div>

      {/* Bottom-right: Shot counter */}
      <div className="digi-vf absolute bottom-[15%] right-[4%]">
        <span className="text-[11px] text-orange-400 font-bold">{shotCount}</span>
      </div>

      {/* Bottom: Date stamp */}
      <div className="digi-vf absolute bottom-[4%] right-[4%]">
        <span className="text-[9px] text-orange-400/80">{dateStamp}</span>
      </div>

      {/* Flash indicator */}
      <div className="digi-vf absolute bottom-[4%] left-[4%]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M9 2L5 9H8L7 14L11 7H8L9 2Z" fill="rgba(255,255,255,0.5)" />
        </svg>
      </div>
    </div>
  );
}

function HandycamHUD({
  focusLoading = false,
  focusConfirmed = false,
}: {
  focusLoading?: boolean;
  focusConfirmed?: boolean;
}) {
  const [isRecording] = useState(false);
  const [timecode, setTimecode] = useState("00:00:00");
  const [tapeCounter] = useState(() => `${Math.floor(Math.random() * 60)}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}`);
  const [batteryMin] = useState(() => Math.floor(Math.random() * 30) + 30);
  const [zoomLevel] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [dateTime] = useState(() => {
    const d = new Date();
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
      time: `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`,
    };
  });
  const [focusLocked, setFocusLocked] = useState(false);
  const prevFocusConfirmed = useRef(false);

  useEffect(() => {
    if (focusConfirmed && !prevFocusConfirmed.current) {
      setFocusLocked(true);
    }
    if (!focusConfirmed) {
      setFocusLocked(false);
    }
    prevFocusConfirmed.current = focusConfirmed;
  }, [focusConfirmed]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimecode((prev) => {
        const parts = prev.split(":").map(Number);
        parts[2]++;
        if (parts[2] >= 60) { parts[2] = 0; parts[1]++; }
        if (parts[1] >= 60) { parts[1] = 0; parts[0]++; }
        return parts.map((p) => p.toString().padStart(2, "0")).join(":");
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <style>{`
        .camcorder-vf { font-family: "Courier New", monospace; }
        @keyframes rec-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .rec-blink { animation: rec-blink 1s step-end infinite; }
        @keyframes focus-hunt { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .focus-hunt { animation: focus-hunt 0.4s ease-in-out infinite; }
      `}</style>

      {/* Top-left: REC indicator */}
      <div className="camcorder-vf absolute top-[5%] left-[4%] flex items-center gap-2">
        {isRecording ? (
          <>
            <div className="w-3 h-3 rounded-full bg-red-500 rec-blink" />
            <span className="text-[12px] text-red-500 font-bold rec-blink">REC</span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full border-2 border-white/60" />
            <span className="text-[12px] text-white/60 font-bold">STBY</span>
          </>
        )}
      </div>

      {/* Top-center: Timecode */}
      <div className="camcorder-vf absolute top-[5%] left-1/2 -translate-x-1/2">
        <span className="text-[14px] text-cyan-400 font-bold tracking-wider">{timecode}</span>
      </div>

      {/* Top-right: Tape counter */}
      <div className="camcorder-vf absolute top-[5%] right-[4%]">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="2" width="10" height="10" rx="1" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            <circle cx="5" cy="7" r="2" fill="rgba(255,255,255,0.4)" />
            <circle cx="9" cy="7" r="2" fill="rgba(255,255,255,0.4)" />
          </svg>
          <span className="text-[10px] text-white/60">{tapeCounter}</span>
        </div>
      </div>

      {/* Center: Focus indicator */}
      {focusLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[25%] aspect-video border border-white/50 focus-hunt flex items-center justify-center">
            <span className="text-[10px] text-white/70">FOCUS</span>
          </div>
        </div>
      )}
      {focusLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[25%] aspect-video border-2 border-green-400 flex items-center justify-center">
            <span className="text-[10px] text-green-400">FOCUS OK</span>
          </div>
        </div>
      )}

      {/* Right: Zoom bar */}
      <div className="camcorder-vf absolute right-[4%] top-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] text-white/60">T</span>
          <div className="w-2 h-20 rounded-full bg-white/20 relative">
            <div className="absolute bottom-0 left-0 right-0 rounded-full bg-cyan-400/80" style={{ height: `${(zoomLevel / 10) * 100}%` }} />
          </div>
          <span className="text-[8px] text-white/60">W</span>
        </div>
      </div>

      {/* Bottom-left: Date/time */}
      <div className="camcorder-vf absolute bottom-[5%] left-[4%]">
        <div className="flex flex-col">
          <span className="text-[9px] text-orange-400">{dateTime.date}</span>
          <span className="text-[11px] text-orange-400">{dateTime.time}</span>
        </div>
      </div>

      {/* Bottom-center: CCD/Gain */}
      <div className="camcorder-vf absolute bottom-[5%] left-1/2 -translate-x-1/2">
        <span className="text-[9px] text-white/50">CCD AUTO</span>
      </div>

      {/* Bottom-right: Battery */}
      <div className="camcorder-vf absolute bottom-[5%] right-[4%]">
        <div className="flex items-center gap-1">
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <rect x="1" y="1" width="12" height="8" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
            <rect x="13" y="3" width="2" height="4" fill="rgba(255,255,255,0.6)" />
            <rect x="2" y="2" width="8" height="6" fill="rgba(255,255,255,0.4)" />
          </svg>
          <span className="text-[9px] text-white/60">{batteryMin}min</span>
        </div>
      </div>

      {/* Gain indicator on left */}
      <div className="camcorder-vf absolute left-[4%] top-1/2 -translate-y-1/2">
        <span className="text-[8px] text-white/40 [writing-mode:vertical-lr]">GAIN 0dB</span>
      </div>
    </div>
  );
}
