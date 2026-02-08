"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import CityAutocomplete from "./CityAutocomplete";
import HandOverlay from "@/app/pano/HandOverlay";
import SonyViewfinderHUD from "@/components/SonyViewfinderHUD";
import GestureTutorial from "@/components/GestureTutorial";
import { addGalleryEntry } from "@/lib/galleryStore";
import type { GalleryEntry } from "@/lib/galleryStore";

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
  const isRandom = value === null;

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
            onClick={() => onChange(null)}
            className="text-[10px] tracking-wider uppercase text-white/20 hover:text-white/40 transition-colors"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Clear
          </button>
        )}
        {isRandom && (
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
              onClick={() => onChange(selected ? null : opt.toLowerCase())}
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
      </div>
    </div>
  );
}

const SHUTTER_SOUND = "/sony_shutter.mp3";
const FOCUS_SOUND = "/focus.mp3";

// Viewfinder screen area as fractions of the camera overlay image
const VF_LEFT = 0.2;
const VF_TOP = 0.37;
const VF_WIDTH = 0.4;
const VF_HEIGHT = 0.5;

// ── Main page ─────────────────────────────────────────────────
export default function GeneratePage() {
  // Parameter state (null = random)
  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<[number, number] | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<number | null>(null);
  const [decade, setDecade] = useState<number | null>(null);
  const [placeType, setPlaceType] = useState<string | null>(null);
  const [weather, setWeather] = useState<number | null>(null);
  const [crowd, setCrowd] = useState<number | null>(null);

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
  const [flash, setFlash] = useState(false);
  const [cameraOverlayActive, setCameraOverlayActive] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusImage, setFocusImage] = useState<string | null>(null);
  // Base64 data of the focused image (kept in memory until captured)
  const focusBase64Ref = useRef<{ data: string; mimeType: string } | null>(null);

  const focusImageRef = useRef<string | null>(null);
  focusImageRef.current = focusImage;
  const focusLoadingRef = useRef(false);
  focusLoadingRef.current = focusLoading;

  const onPictureFrame = useCallback(() => {
    const img = focusImageRef.current;
    const base64 = focusBase64Ref.current;
    if (!img || !base64) return; // only save when focused

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
      // ignore if audio fails
    }

    // Download the focused image locally
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
              body: "Sony α7 IV",
              lens: "FE 24-70mm f/2.8 GM",
              focalLength: "24-70mm",
              iso: "100-51200",
              sensor: "35mm Full-Frame BSI",
              resolution: "33 Megapixels",
            },
          };
          addGalleryEntry(entry);
        }
      })
      .catch((err) => console.error("Failed to save photo:", err));

    // Clear the focus image after capturing
    setFocusImage(null);
    focusBase64Ref.current = null;
  }, [resolvedParams]);

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
      const cropX = Math.round(img.width * VF_LEFT);
      const cropY = Math.round(img.height * VF_TOP);
      const cropW = Math.round(img.width * VF_WIDTH);
      const cropH = Math.round(img.height * VF_HEIGHT);

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
  }, [resolvedParams]);

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
  }, [location, timeOfDay, decade, placeType, weather, crowd, panoUrl]);

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
          <div className="relative">
            {/* Flash effect in viewfinder screen */}
            {flash && (
              <div
                className="absolute bg-white/80"
                style={{
                  left: `${VF_LEFT * 100}%`,
                  top: `${VF_TOP * 100}%`,
                  width: `${VF_WIDTH * 100}%`,
                  height: `${VF_HEIGHT * 100}%`,
                }}
                aria-hidden
              />
            )}
            {/* Focus loading / result in viewfinder screen */}
            {(focusLoading || focusImage) && (
              <div
                className="absolute overflow-hidden"
                style={{
                  left: `${VF_LEFT * 100}%`,
                  top: `${VF_TOP * 100}%`,
                  width: `${VF_WIDTH * 100}%`,
                  height: `${VF_HEIGHT * 100}%`,
                }}
              >
                {focusLoading && (
                  <div className="absolute inset-0 bg-black/70">
                    <SonyViewfinderHUD focusLoading={true} focusConfirmed={false} />
                  </div>
                )}
                {focusImage && !focusLoading && (
                  <>
                    <img
                      src={focusImage}
                      alt="Focused shot"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <SonyViewfinderHUD focusLoading={false} focusConfirmed={true} />
                  </>
                )}
              </div>
            )}
            {/* Sony viewfinder HUD — always visible on the viewfinder */}
            {!focusLoading && !focusImage && (
              <div
                className="absolute overflow-hidden"
                style={{
                  left: `${VF_LEFT * 100}%`,
                  top: `${VF_TOP * 100}%`,
                  width: `${VF_WIDTH * 100}%`,
                  height: `${VF_HEIGHT * 100}%`,
                }}
              >
                <SonyViewfinderHUD />
              </div>
            )}
            <img
              src="/camera_pov.png"
              alt=""
              className="relative z-[1] h-[90vh] w-auto max-w-[95vw] object-contain"
            />
          </div>
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
        <img
          src="/camera_pov.png"
          alt=""
          className="pointer-events-none absolute bottom-8 left-1/2 z-10 w-48 -translate-x-1/2 object-contain"
          aria-hidden
        />

        {/* Back button */}
        <button
          onClick={() => setShowViewer(false)}
          className="absolute top-5 left-5 z-30 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-black/80 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {/* Gallery button */}
        <Link
          href="/gallery"
          className="absolute top-5 left-[120px] z-30 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-black/80 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <rect x="1" y="3" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="7" y="3" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="7" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          Gallery
        </Link>

        {/* Scene info panel */}
        {resolvedParams && Object.keys(resolvedParams).length > 0 && (
          <div className="absolute top-5 right-5 z-30 rounded-xl border border-white/15 bg-black/60 backdrop-blur-md p-4 text-xs text-white/60 space-y-1 max-w-[240px]">
            <div className="text-white/90 font-medium text-sm mb-2">Scene Details</div>
            {resolvedParams.location && <div><span className="text-white/40">Location:</span> {resolvedParams.location}</div>}
            {resolvedParams.timeOfDay && <div><span className="text-white/40">Time:</span> {resolvedParams.timeOfDay}</div>}
            {resolvedParams.decade && <div><span className="text-white/40">Era:</span> {resolvedParams.decade}</div>}
            {resolvedParams.placeType && <div><span className="text-white/40">Setting:</span> {resolvedParams.placeType}</div>}
            {resolvedParams.weather && <div><span className="text-white/40">Weather:</span> {resolvedParams.weather}</div>}
            {resolvedParams.crowd && <div><span className="text-white/40">Crowd:</span> {resolvedParams.crowd}</div>}
          </div>
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
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group flex items-center gap-2 text-white/40 transition-colors hover:text-white/70"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                className="transition-transform group-hover:-translate-x-0.5"
              >
                <path
                  d="M11 13L7 9L11 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm tracking-wide">Back</span>
            </Link>
            <div className="h-4 w-px bg-white/[0.08]" />
            <h1
              className="text-sm tracking-[0.25em] uppercase text-white/70"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Generate
            </h1>
          </div>

          <Link
            href="/gallery"
            className="flex items-center gap-2 text-white/30 transition-colors hover:text-white/60"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <rect x="1" y="3" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
              <rect x="7" y="3" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
              <rect x="1" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
              <rect x="7" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span
              className="text-xs tracking-wider"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Gallery
            </span>
          </Link>
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
            <div className="w-full max-w-[340px] mt-4">
              {/* Crosshair divider */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.06]" />
                <div className={`relative h-2.5 w-2.5 rounded-full transition-all duration-700 ${
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
                    className={`text-[9px] tracking-[0.3em] uppercase transition-colors duration-500 ${
                      locationCoords ? "text-[#B0FBCD]/50" : "text-white/15"
                    }`}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {locationCoords ? "Locked" : "Standby"}
                  </span>
                </div>

                {/* Coordinates */}
                <div
                  className="text-[10px] tracking-wider text-white/20 transition-colors duration-500"
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
                    className="text-xs tracking-[0.15em] uppercase text-white/50"
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
