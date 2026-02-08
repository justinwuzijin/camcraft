"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import CityAutocomplete from "./CityAutocomplete";
import HandOverlay from "@/app/pano/HandOverlay";

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">{label}</span>
        <button
          type="button"
          onClick={() => onChange(isRandom ? fallback : null)}
          className={`rounded-full px-3 py-0.5 text-xs font-medium transition-all ${
            isRandom
              ? "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
              : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
          }`}
        >
          {isRandom ? "Any" : "Set"}
        </button>
      </div>

      <div className={`transition-opacity ${isRandom ? "opacity-30" : "opacity-100"}`}>
        <input
          type="range"
          min={0}
          max={options.length - 1}
          value={displayIdx}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="slider-track w-full"
          disabled={isRandom}
        />
        <div className="mt-1 flex justify-between">
          {options.map((opt, i) => (
            <span
              key={opt}
              className={`text-[10px] leading-tight ${
                i === displayIdx && !isRandom ? "text-[#B0FBCD]" : "text-white/30"
              }`}
              style={{ width: `${100 / options.length}%`, textAlign: "center" }}
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">{label}</span>
        {!isRandom && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full px-3 py-0.5 text-xs font-medium bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 transition-all"
          >
            Clear
          </button>
        )}
        {isRandom && (
          <span className="rounded-full px-3 py-0.5 text-xs font-medium bg-white/5 text-white/40 border border-white/10">
            Any
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.toLowerCase();
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected ? null : opt.toLowerCase())}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                selected
                  ? "bg-[#B0FBCD]/15 border-[#B0FBCD]/40 text-[#B0FBCD]"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
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
  const [showViewer, setShowViewer] = useState(false);

  // Camera overlay state (same as /pano)
  const gestureDeltaRef = useRef<{ deltaAzimuth: number; deltaPolar: number }>({
    deltaAzimuth: 0,
    deltaPolar: 0,
  });
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const [flash, setFlash] = useState(false);
  const [cameraOverlayActive, setCameraOverlayActive] = useState(false);

  // Preload shutter audio once on mount
  useEffect(() => {
    const audio = new Audio(SHUTTER_SOUND);
    audio.preload = "auto";
    shutterAudioRef.current = audio;
    return () => {
      audio.pause();
      shutterAudioRef.current = null;
    };
  }, []);

  const onPictureFrame = useCallback(() => {
    setFlash(true);
    try {
      const src = shutterAudioRef.current;
      if (src) {
        // Clone avoids "removed from document" errors from overlapping play() calls
        const clone = src.cloneNode() as HTMLAudioElement;
        clone.play().catch(() => {});
      }
    } catch {
      // ignore if audio fails
    }
  }, []);

  const onFistOpen = useCallback(() => {
    setCameraOverlayActive((prev) => !prev);
  }, []);

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

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

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
      setShowViewer(true);
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
        <PanoViewer key={panoUrl} panoUrl={panoUrl} gestureDeltaRef={gestureDeltaRef} />

        {/* Big camera overlay — toggled by fist→open gesture */}
        <div
          className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-all duration-500 ${
            cameraOverlayActive ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
          aria-hidden
        >
          <div className="relative">
            {flash && (
              <div
                className="absolute bg-white/80"
                style={{ left: "20%", top: "37%", width: "40%", height: "50%" }}
                aria-hidden
              />
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

        {/* Regenerate button */}
        <button
          onClick={() => setShowViewer(false)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-6 py-2.5 text-sm text-white/80 hover:bg-black/80 transition-all"
        >
          Generate Another
        </button>
      </div>
    );
  }

  // ── Configure mode ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-12">
        {/* Left column — form */}
        <div className="w-full lg:w-1/2 max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Generate Panorama
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Configure your scene or leave fields on Any to let the AI decide
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 sm:p-8 space-y-6">
            {/* Location input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Location</label>
              <CityAutocomplete value={location} onChange={setLocation} onCoordinatesChange={setLocationCoords} />
            </div>

            {/* Sliders */}
            <SliderControl label="Time of Day" options={TIME_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} />
            <SliderControl label="Era" options={DECADE_OPTIONS} value={decade} onChange={setDecade} defaultIndex={6} />
            <ChipSelector label="Setting" options={PLACE_TYPES} value={placeType} onChange={setPlaceType} />
            <SliderControl label="Weather" options={WEATHER_OPTIONS} value={weather} onChange={setWeather} />
            <SliderControl label="Crowd" options={CROWD_OPTIONS} value={crowd} onChange={setCrowd} />

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 rounded-full text-base font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-[#B0FBCD]/10 hover:bg-[#B0FBCD]/20 border border-[#B0FBCD]/30 text-[#B0FBCD]"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Generating... This may take 15-30 seconds
                </span>
              ) : (
                "Generate Panorama"
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <p className="mt-4 text-center lg:text-left text-xs text-white/20">
            Powered by Gemini &middot; Images are generated as equirectangular panoramas for 360&deg; viewing
          </p>
        </div>

        {/* Right column — globe */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <RotatingEarth width={750} height={750} targetLocation={locationCoords} />
        </div>
      </div>

      {/* Custom slider styling */}
      <style jsx>{`
        .slider-track {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
        }
        .slider-track::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #B0FBCD;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(176, 251, 205, 0.4);
        }
        .slider-track::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #B0FBCD;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(176, 251, 205, 0.4);
        }
        .slider-track:disabled::-webkit-slider-thumb {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: none;
        }
        .slider-track:disabled::-moz-range-thumb {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
