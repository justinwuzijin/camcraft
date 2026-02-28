"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import NextImage from "next/image";
import { NavButton } from "@/components/NavButton";
import PhotoFlyAnimation from "@/components/PhotoFlyAnimation";
import CityAutocomplete from "./CityAutocomplete";
import HandOverlay from "@/app/pano/HandOverlay";
import CameraViewfinderFrame, { VIEWFINDER_DIMENSIONS, MiniCameraFrame } from "@/components/CameraViewfinderFrame";

import GestureTutorial from "@/components/GestureTutorial";
import { addGalleryEntry } from "@/lib/galleryStore";
import type { GalleryEntry } from "@/lib/galleryStore";
import { getUnseenCount, incrementUnseen } from "@/lib/galleryBadgeStore";
import { getActiveCamera, CAMERA_SPECS } from "@/lib/cameraStore";
import type { CameraId } from "@/lib/cameraStore";

const PanoViewer = dynamic(() => import("@/app/pano/PanoViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
      Loading panorama viewer...
    </div>
  ),
});

const RotatingEarth = dynamic(() => import("@/components/RotatingEarth"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-white/30 text-sm">
      Loading globe...
    </div>
  ),
});

// ── Option arrays ──────────────────────────────────────────────
const TIME_OPTIONS = ["Dawn", "Morning", "Noon", "Golden Hour", "Dusk", "Night"];
const DECADE_OPTIONS = ["1900s", "1920s", "1950s", "1970s", "1990s", "2000s", "Today", "Future"];
const PLACE_TYPES = [
  "Street", "Station", "Harbor", "Factory", "Fairground",
  "Diner", "Cinema", "Park", "Rooftop", "Market", "Cathedral", "Library",
];
const WEATHER_OPTIONS = ["Clear", "Hazy", "Fog", "Rain", "Snow"];
const CROWD_OPTIONS = ["Empty", "Few People", "Moderate", "Busy"];

// ── Slider component ──────────────────────────────────────────
function SliderControl({
  label,
  options,
  value,
  onChange,
  defaultIndex,
}: {
  label: string;
  options: string[];
  value: number | null;
  onChange: (v: number | null) => void;
  defaultIndex?: number;
}) {
  const isRandom = value === null;
  const fallback = defaultIndex ?? Math.floor(options.length / 2);
  const displayIdx = value ?? fallback;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] tracking-[0.2em] uppercase text-white/25"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={() => onChange(isRandom ? fallback : null)}
          className={`rounded-full px-3 py-0.5 text-[10px] tracking-wider uppercase transition-all ${
            isRandom
              ? "text-white/20 hover:text-white/40"
              : "text-[#B0FBCD]/60 hover:text-[#B0FBCD]/80"
          }`}
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {isRandom ? "Any" : "Set"}
        </button>
      </div>

      <div className={`transition-opacity duration-300 ${isRandom ? "opacity-25" : "opacity-100"}`}>
        <input
          type="range"
          min={0}
          max={options.length - 1}
          value={displayIdx}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="slider-track w-full"
          disabled={isRandom}
        />
        <div className="mt-1.5 flex justify-between">
          {options.map((opt, i) => (
            <span
              key={opt}
              className={`text-[9px] tracking-wide leading-tight transition-colors duration-200 ${
                i === displayIdx && !isRandom ? "text-[#B0FBCD]/80" : "text-white/20"
              }`}
              style={{ width: `${100 / options.length}%`, textAlign: "center", fontFamily: "var(--font-geist-mono)" }}
            >
              {opt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Chip selector component ───────────────────────────────────
function ChipSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const isRandom = value === null;
  const isPreset = value !== null && options.some((o) => o.toLowerCase() === value);
  const isCustomValue = value !== null && !isPreset;

  // Focus input when entering custom mode
  useEffect(() => {
    if (customMode) customInputRef.current?.focus();
  }, [customMode]);

  const handleClear = () => {
    onChange(null);
    setCustomMode(false);
    setCustomText("");
  };

  const handleOtherClick = () => {
    if (customMode || isCustomValue) {
      // Toggle off
      handleClear();
    } else {
      setCustomMode(true);
      setCustomText("");
      onChange(null);
    }
  };

  const handleCustomSubmit = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onChange(trimmed.toLowerCase());
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] tracking-[0.2em] uppercase text-white/25"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {label}
        </span>
        {!isRandom && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] tracking-wider uppercase text-white/20 hover:text-white/40 transition-colors"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Clear
          </button>
        )}
        {isRandom && !customMode && (
          <span
            className="text-[10px] tracking-wider uppercase text-white/15"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Any
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = value === opt.toLowerCase();
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setCustomMode(false);
                setCustomText("");
                onChange(selected ? null : opt.toLowerCase());
              }}
              className={`rounded-full px-3 py-1.5 text-[11px] tracking-wide border transition-all duration-200 ${
                selected
                  ? "bg-[#B0FBCD]/10 border-[#B0FBCD]/25 text-[#B0FBCD]/90"
                  : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:bg-white/[0.05] hover:text-white/50 hover:border-white/[0.12]"
              }`}
            >
              {opt}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleOtherClick}
          className={`rounded-full px-3 py-1.5 text-[11px] tracking-wide border transition-all duration-200 ${
            customMode || isCustomValue
              ? "bg-[#B0FBCD]/10 border-[#B0FBCD]/25 text-[#B0FBCD]/90"
              : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:bg-white/[0.05] hover:text-white/50 hover:border-white/[0.12]"
          }`}
        >
          {isCustomValue ? value.charAt(0).toUpperCase() + value.slice(1) : "Other\u2026"}
        </button>
      </div>

      {/* Custom input */}
      {customMode && !isCustomValue && (
        <div
          className="flex items-center gap-2"
          style={{ animation: "fadeSlideIn 0.25s ease-out both" }}
        >
          <input
            ref={customInputRef}
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") handleClear();
            }}
            placeholder="Type a custom setting..."
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/70 placeholder-white/15 outline-none transition-all duration-200 focus:border-[#B0FBCD]/20 focus:bg-white/[0.04]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            disabled={!customText.trim()}
            className="shrink-0 rounded-lg border border-[#B0FBCD]/20 bg-[#B0FBCD]/[0.06] px-3 py-2 text-[11px] tracking-wider uppercase text-[#B0FBCD]/70 transition-all hover:bg-[#B0FBCD]/[0.12] hover:text-[#B0FBCD]/90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}

// ── Scene Details Panel (viewer overlay) ─────────────────────
const SCENE_PARAM_META: Record<string, { label: string; icon: React.ReactNode }> = {
  location: {
    label: "Location",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7.25 6 11 6 11C6 11 9.5 7.25 9.5 4.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="4.5" r="1.25" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  timeOfDay: {
    label: "Time",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" />
        <path d="M6 3V6L7.5 7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  decade: {
    label: "Era",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1.5" y="2" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <path d="M4 1.5V3M8 1.5V3M1.5 5H10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  placeType: {
    label: "Setting",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1.5 10.5H10.5M2.5 10.5V4.5L6 2L9.5 4.5V10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="4.5" y="6.5" width="3" height="4" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  weather: {
    label: "Weather",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3.5 8.5C2.12 8.5 1 7.38 1 6C1 4.62 2.12 3.5 3.5 3.5C3.5 2.12 4.62 1 6 1C7.38 1 8.5 2.12 8.5 3.5C9.88 3.5 11 4.62 11 6C11 7.38 9.88 8.5 8.5 8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M4 9.5L3.5 11M6 9.5L5.5 11M8 9.5L7.5 11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  crowd: {
    label: "Crowd",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="4" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1" />
        <circle cx="8" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1" />
        <path d="M1 9.5C1 7.84 2.34 6.5 4 6.5C4.7 6.5 5.34 6.74 5.84 7.14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M6.16 7.14C6.66 6.74 7.3 6.5 8 6.5C9.66 6.5 11 7.84 11 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
};

function SceneDetailsPanel({ resolvedParams }: { resolvedParams: Record<string, string> }) {
  const [collapsed, setCollapsed] = useState(false);

  const entries = Object.entries(resolvedParams).filter(
    ([, v]) => v && v.trim() !== ""
  );
  if (entries.length === 0) return null;

  return (
    <div
      className="absolute top-5 right-5 z-30 transition-all duration-500 ease-out"
      style={{ animation: "fadeSlideIn 0.4s ease-out both" }}
    >
      <div
        className={`relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a0c]/90 backdrop-blur-xl transition-all duration-400 ${
          collapsed ? "w-[48px]" : "w-[260px]"
        }`}
      >
        {/* Accent top edge */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B0FBCD]/20 to-transparent" />

        {/* Header row */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="relative flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
        >
          {/* Aperture icon */}
          <div className={`shrink-0 text-[#B0FBCD]/50 transition-transform duration-300 ${collapsed ? "rotate-90" : "rotate-0"}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="0.8" />
              <path d="M7 1.5V4M7 10V12.5M1.5 7H4M10 7H12.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
          {!collapsed && (
            <span
              className="text-[10px] tracking-[0.25em] uppercase text-white/25 flex-1"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Scene
            </span>
          )}
          {!collapsed && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className="text-white/20 shrink-0"
            >
              <path d="M7.5 4L5 6.5L2.5 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="h-px bg-white/[0.06] mb-3" />
            <div className="space-y-2.5">
              {entries.map(([key, value]) => {
                const meta = SCENE_PARAM_META[key];
                if (!meta) return null;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="shrink-0 text-white/20">
                      {meta.icon}
                    </div>
                    <div className="flex flex-1 items-baseline justify-between gap-3 min-w-0">
                      <span className="text-[10px] text-white/30 shrink-0 uppercase tracking-wider" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-white/70 text-right truncate">
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom accent */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-[#B0FBCD]/10 to-transparent" />
              <div className="h-1 w-1 rounded-full bg-[#B0FBCD]/20" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SHUTTER_SOUND = "/sony_shutter.mp3";
const FOCUS_SOUND = "/focus.mp3";

// ── Main page ─────────────────────────────────────────────────
export default function GeneratePage() {
  // Active camera state
  const [activeCamera, setActiveCameraState] = useState<CameraId>("sony-a7iv");

  useEffect(() => {
    setActiveCameraState(getActiveCamera());
  }, []);

  const vf = VIEWFINDER_DIMENSIONS[activeCamera];
  // Parameter state (null = random)
  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<[number, number] | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<number | null>(null);
  const [decade, setDecade] = useState<number | null>(null);
  const [placeType, setPlaceType] = useState<string | null>(null);
  const [weather, setWeather] = useState<number | null>(null);
  const [crowd, setCrowd] = useState<number | null>(null);
  const [instructions, setInstructions] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panoUrl, setPanoUrl] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<Record<string, string> | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  // Camera overlay state (same as /pano)
  const gestureDeltaRef = useRef<{ deltaAzimuth: number; deltaPolar: number }>({
    deltaAzimuth: 0,
    deltaPolar: 0,
  });
  const captureRef = useRef<(() => string | null) | null>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const focusAudioRef = useRef<HTMLAudioElement | null>(null);
  const galleryBtnRef = useRef<HTMLAnchorElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);
  const [flash, setFlash] = useState(false);
  const [cameraOverlayActive, setCameraOverlayActive] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusImage, setFocusImage] = useState<string | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [badgePulse, setBadgePulse] = useState(false);
  const [flyAnimation, setFlyAnimation] = useState<{
    imageUrl: string;
    fromRect: DOMRect;
  } | null>(null);
  const focusBase64Ref = useRef<{ data: string; mimeType: string } | null>(null);

  const focusImageRef = useRef<string | null>(null);
  focusImageRef.current = focusImage;
  const focusLoadingRef = useRef(false);
  focusLoadingRef.current = focusLoading;

  // Load badge count on mount
  useEffect(() => {
    setBadgeCount(getUnseenCount());
  }, []);

  const handleFlyComplete = useCallback(() => {
    setFlyAnimation(null);
    incrementUnseen();
    setBadgeCount(getUnseenCount());
    setBadgePulse(true);
    setTimeout(() => setBadgePulse(false), 600);
  }, []);

  const onPictureFrame = useCallback(() => {
    const img = focusImageRef.current;
    const base64 = focusBase64Ref.current;
    if (!img || !base64) return;

    const vfRect = viewfinderRef.current?.getBoundingClientRect();
    const capturedImage = img;

    setFlash(true);
    try {
      if (!shutterAudioRef.current) {
        shutterAudioRef.current = new Audio(SHUTTER_SOUND);
      }
      const audio = shutterAudioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // ignore
    }

    const a = document.createElement("a");
    a.href = img;
    a.download = `focus_${Date.now()}.jpg`;
    a.click();

    // Save to server + gallery store
    const sceneData = {
      location: resolvedParams?.location,
      timeOfDay: resolvedParams?.timeOfDay,
      decade: resolvedParams?.decade,
      placeType: resolvedParams?.placeType,
      weather: resolvedParams?.weather,
      crowd: resolvedParams?.crowd,
    };

    fetch("/api/save-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64.data,
        mimeType: base64.mimeType,
        scene: sceneData,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.savedPath) {
          const specs = CAMERA_SPECS[activeCamera];
          const entry: GalleryEntry = {
            id: `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            imagePath: data.savedPath,
            panoPath: null,
            capturedAt: Date.now(),
            scene: {
              location: sceneData.location,
              timeOfDay: sceneData.timeOfDay,
              era: sceneData.decade,
              setting: sceneData.placeType,
              weather: sceneData.weather,
              crowd: sceneData.crowd,
            },
            camera: {
              body: specs.body,
              lens: specs.lens,
              focalLength: specs.focalLength,
              iso: specs.iso,
              sensor: specs.sensor,
              resolution: specs.resolution,
            },
          };
          addGalleryEntry(entry);
        }
      })
      .catch((err) => console.error("Failed to save photo:", err));

    // Clear the focus image after capturing
    setFocusImage(null);
    focusBase64Ref.current = null;

    // Start fly animation after flash fades
    if (vfRect) {
      setTimeout(() => {
        setFlyAnimation({ imageUrl: capturedImage, fromRect: vfRect });
      }, 250);
    }
  }, [resolvedParams, activeCamera]);

  const onFistOpen = useCallback(() => {
    setCameraOverlayActive((prev) => !prev);
  }, []);

  const onFocus = useCallback(() => {
    if (focusLoadingRef.current) return; // don't re-trigger while loading

    // Play focus sound
    try {
      if (!focusAudioRef.current) {
        focusAudioRef.current = new Audio(FOCUS_SOUND);
      }
      const audio = focusAudioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // ignore
    }

    // Capture the canvas
    const dataUrl = captureRef.current?.();
    if (!dataUrl) return;

    // Crop to viewfinder region using an offscreen canvas
    const img = new Image();
    img.onload = async () => {
      const cropX = Math.round(img.width * vf.left);
      const cropY = Math.round(img.height * vf.top);
      const cropW = Math.round(img.width * vf.width);
      const cropH = Math.round(img.height * vf.height);

      const offscreen = document.createElement("canvas");
      offscreen.width = cropW;
      offscreen.height = cropH;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const croppedDataUrl = offscreen.toDataURL("image/jpeg", 0.9);
      const base64 = croppedDataUrl.split(",")[1];

      setFocusLoading(true);
      setFocusImage(null);

      try {
        const res = await fetch("/api/focus-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64,
            mimeType: "image/jpeg",
            scene: resolvedParams || {},
            cameraId: activeCamera,
          }),
        });

        if (!res.ok) {
          console.error("Focus API error:", res.status);
          setFocusLoading(false);
          return;
        }

        const data = await res.json();
        if (data.image && data.mimeType) {
          setFocusImage(`data:${data.mimeType};base64,${data.image}`);
          focusBase64Ref.current = { data: data.image, mimeType: data.mimeType };
        }
      } catch (err) {
        console.error("Focus request failed:", err);
      } finally {
        setFocusLoading(false);
      }
    };
    img.src = dataUrl;
  }, [resolvedParams, vf]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 200);
    return () => clearTimeout(t);
  }, [flash]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (panoUrl) URL.revokeObjectURL(panoUrl);
    };
  }, [panoUrl]);

  // Transition to viewer when panorama is ready and tutorial is dismissed
  useEffect(() => {
    if (panoUrl && tutorialDismissed && !showViewer) {
      setShowTutorial(false);
      setShowViewer(true);
    }
  }, [panoUrl, tutorialDismissed, showViewer]);

  // Handle tutorial dismissal
  const handleTutorialComplete = useCallback(() => {
    setTutorialDismissed(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    const audio = new Audio("/confirm_button.mp3");
    audio.play().catch(() => {});
    setIsGenerating(true);
    setError(null);
    setShowTutorial(true);
    setTutorialDismissed(false);

    const params: Record<string, string | undefined> = {
      location: location.trim() || undefined,
      timeOfDay: timeOfDay !== null ? TIME_OPTIONS[timeOfDay].toLowerCase() : undefined,
      decade: decade !== null ? DECADE_OPTIONS[decade] : undefined,
      placeType: placeType || undefined,
      weather: weather !== null ? WEATHER_OPTIONS[weather].toLowerCase() : undefined,
      crowd: crowd !== null ? CROWD_OPTIONS[crowd].toLowerCase() : undefined,
      instructions: instructions.trim() || undefined,
    };

    try {
      const res = await fetch("/api/generate-pano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const data = await res.json();

      // Convert base64 to blob URL
      const byteChars = atob(data.image);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = URL.createObjectURL(blob);

      if (panoUrl) URL.revokeObjectURL(panoUrl);

      setPanoUrl(url);
      setResolvedParams(data.parameters);
      // If tutorial was already dismissed, go straight to viewer
      if (tutorialDismissed) {
        setShowTutorial(false);
        setShowViewer(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, [location, timeOfDay, decade, placeType, weather, crowd, instructions, panoUrl]);

  // ── Viewer mode ──────────────────────────────────────────
  if (showViewer && panoUrl) {
    return (
      <div className="relative w-full min-h-screen bg-black">
        <PanoViewer key={panoUrl} panoUrl={panoUrl} gestureDeltaRef={gestureDeltaRef} captureRef={captureRef} />

        {/* Big camera overlay — toggled by fist→open gesture */}
        <div
          className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-all duration-500 ${
            cameraOverlayActive ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
          aria-hidden={!cameraOverlayActive}
        >
          <CameraViewfinderFrame cameraId={activeCamera}>
            {/* Flash effect */}
            {flash && (
              <div className="absolute inset-0 bg-white/80" aria-hidden />
            )}
            {/* Processing overlay — semi-transparent so pano shows through */}
            {focusLoading && (
              <div ref={viewfinderRef} className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-sm animate-pulse drop-shadow-lg">Processing...</span>
              </div>
            )}
            {/* Generated image — fills LCD until captured */}
            {focusImage && !focusLoading && (
              <div ref={viewfinderRef} className="absolute inset-0">
                <img
                  src={focusImage}
                  alt="Focused shot"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}
          </CameraViewfinderFrame>
        </div>

        {/* Hand gesture overlay */}
        <HandOverlay
          gestureDeltaRef={gestureDeltaRef}
          onPictureFrame={onPictureFrame}
          onFistOpen={onFistOpen}
          onFocus={onFocus}
          cameraOverlayActive={cameraOverlayActive}
        />

        {/* Small camera overlay — always visible */}
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2" aria-hidden>
          <MiniCameraFrame cameraId={activeCamera} />
        </div>

        {/* Navigation buttons */}
        <div className="absolute top-5 left-5 z-30 flex items-center gap-2 ml-12 sm:ml-14">
          <NavButton
            href=""
            icon="back"
            label="Back"
            variant="overlay"
            onClick={() => {
              setShowViewer(false);
              setTutorialDismissed(false);
              if (panoUrl) URL.revokeObjectURL(panoUrl);
              setPanoUrl(null);
              setResolvedParams(null);
              setFocusImage(null);
              focusBase64Ref.current = null;
              setCameraOverlayActive(false);
            }}
          />
          <NavButton
            ref={galleryBtnRef}
            href="/gallery"
            icon="gallery"
            label="Gallery"
            variant="overlay"
            badgeCount={badgeCount}
            badgePulse={badgePulse}
          />
        </div>

        {/* Photo fly animation */}
        {flyAnimation && (
          <PhotoFlyAnimation
            imageUrl={flyAnimation.imageUrl}
            fromRect={flyAnimation.fromRect}
            toRef={galleryBtnRef}
            onComplete={handleFlyComplete}
          />
        )}

        {/* Scene info panel */}
        {resolvedParams && Object.keys(resolvedParams).length > 0 && (
          <SceneDetailsPanel resolvedParams={resolvedParams} />
        )}
      </div>
    );
  }

  // ── Configure mode ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060608] text-white">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060608]/80 backdrop-blur-xl">
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
            <NavButton href="/create" icon="back" label="Back" variant="header" />
          </div>
          <h1
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-sm tracking-[0.25em] uppercase text-white/70"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Generate
          </h1>
          <NavButton href="/gallery" icon="gallery" label="Gallery" variant="header" badgeCount={badgeCount} />
        </div>
      </header>

      {/* Main content */}
      <main className="relative mx-auto max-w-[1600px] px-6 sm:px-10 py-8">
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-16">
          {/* Left column — form */}
          <div
            className="w-full lg:w-[560px] shrink-0"
            style={{ animation: "fadeSlideIn 0.5s ease-out both" }}
          >
            {/* Section: Location */}
            <div className="mb-8">
              <div
                className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-4"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                Location
              </div>
              <CityAutocomplete value={location} onChange={setLocation} onCoordinatesChange={setLocationCoords} />
            </div>

            <div className="h-px bg-white/[0.06] mb-8" />

            {/* Section: Time & Era */}
            <div
              className="mb-8 space-y-6"
              style={{ animation: "fadeSlideIn 0.5s ease-out 0.05s both" }}
            >
              <SliderControl label="Time of Day" options={TIME_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} />
              <SliderControl label="Era" options={DECADE_OPTIONS} value={decade} onChange={setDecade} defaultIndex={6} />
            </div>

            <div className="h-px bg-white/[0.06] mb-8" />

            {/* Section: Environment */}
            <div
              className="mb-8 space-y-6"
              style={{ animation: "fadeSlideIn 0.5s ease-out 0.1s both" }}
            >
              <ChipSelector label="Setting" options={PLACE_TYPES} value={placeType} onChange={setPlaceType} />
              <SliderControl label="Weather" options={WEATHER_OPTIONS} value={weather} onChange={setWeather} />
              <SliderControl label="Crowd" options={CROWD_OPTIONS} value={crowd} onChange={setCrowd} />
            </div>

            {/* Section: Additional Instructions */}
            <div
              className="mb-8"
              style={{ animation: "fadeSlideIn 0.5s ease-out 0.12s both" }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] tracking-[0.2em] uppercase text-white/25"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    Additional Instructions
                  </span>
                  {instructions.trim() && (
                    <button
                      type="button"
                      onClick={() => setInstructions("")}
                      className="text-[10px] tracking-wider uppercase text-white/20 hover:text-white/40 transition-colors"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Include a red telephone booth, make it a drone shot"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white/70 placeholder-white/15 outline-none transition-all duration-200 focus:border-white/[0.12] focus:bg-white/[0.03]"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                />
              </div>
            </div>

            <div className="h-px bg-white/[0.06] mb-8" />

            {/* Generate button */}
            <div style={{ animation: "fadeSlideIn 0.5s ease-out 0.15s both" }}>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="group relative w-full py-3.5 rounded-lg text-sm tracking-wider uppercase transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-[#B0FBCD]/[0.08] hover:bg-[#B0FBCD]/[0.14] border border-[#B0FBCD]/20 hover:border-[#B0FBCD]/35 text-[#B0FBCD]/80 hover:text-[#B0FBCD]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {/* Subtle glow behind button on hover */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: "0 0 40px rgba(176, 251, 205, 0.06)" }} />
                {isGenerating ? (
                  <span className="relative flex items-center justify-center gap-3">
                    <div className="relative h-4 w-4">
                      <div className="absolute inset-0 rounded-full border border-[#B0FBCD]/20" />
                      <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[#B0FBCD]/60" />
                    </div>
                    Generating&hellip;
                  </span>
                ) : (
                  <span className="relative">Generate Panorama</span>
                )}
              </button>

              {/* Error message */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-500/15 bg-red-500/[0.06] px-4 py-3 text-xs text-red-400/80">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-10 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <span
                className="text-[10px] tracking-[0.3em] uppercase text-white/15"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                Gemini &middot; 360&deg;
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
          </div>

          {/* Right column — globe */}
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center sticky top-24">
            <RotatingEarth width={700} height={700} targetLocation={locationCoords} />

            {/* Targeting readout */}
            <div className="w-full max-w-[500px] mt-6">
              {/* Crosshair divider */}
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.06]" />
                <div className={`relative h-3.5 w-3.5 rounded-full transition-all duration-700 ${
                  locationCoords ? "bg-[#B0FBCD]/60" : "bg-white/[0.08]"
                }`}>
                  {locationCoords && (
                    <div className="absolute inset-0 rounded-full bg-[#B0FBCD]/40 animate-ping" />
                  )}
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.06]" />
              </div>

              <div className={`flex items-center justify-between transition-opacity duration-500 ${
                locationCoords ? "opacity-100" : "opacity-40"
              }`}>
                {/* Status label */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] tracking-[0.3em] uppercase transition-colors duration-500 ${
                      locationCoords ? "text-[#B0FBCD]/50" : "text-white/15"
                    }`}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {locationCoords ? "Locked" : "Standby"}
                  </span>
                </div>

                {/* Coordinates */}
                <div
                  className="text-[12px] tracking-wider text-white/20 transition-colors duration-500"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {locationCoords
                    ? `${Math.abs(locationCoords[1]).toFixed(2)}°${locationCoords[1] >= 0 ? "N" : "S"} ${Math.abs(locationCoords[0]).toFixed(2)}°${locationCoords[0] >= 0 ? "E" : "W"}`
                    : "——.——° —— .——°"
                  }
                </div>
              </div>

              {/* City name */}
              {location && (
                <div
                  className="mt-2 text-center"
                  style={{ animation: "fadeSlideIn 0.4s ease-out both" }}
                >
                  <span
                    className="text-base tracking-[0.15em] uppercase text-white/50"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {location}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Custom slider styling */}
      <style jsx global>{`
        .slider-track {
          -webkit-appearance: none;
          appearance: none;
          height: 2px;
          border-radius: 1px;
          background: rgba(255, 255, 255, 0.06);
          outline: none;
        }
        .slider-track::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #B0FBCD;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(176, 251, 205, 0.25);
        }
        .slider-track::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #B0FBCD;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 12px rgba(176, 251, 205, 0.25);
        }
        .slider-track:disabled::-webkit-slider-thumb {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: none;
        }
        .slider-track:disabled::-moz-range-thumb {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: none;
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Gesture Tutorial Popup - shown during generation */}
      <GestureTutorial
        isVisible={showTutorial}
        onComplete={handleTutorialComplete}
        isLoading={isGenerating}
      />
    </div>
  );
}
