"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CitySuggestion {
  id: string;
  city: string;
  fullName: string;
  coordinates: [number, number]; // [lng, lat]
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function CityAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onCoordinatesChange?: (coords: [number, number] | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCities = useCallback(async (query: string) => {
    if (query.length < 2 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
          new URLSearchParams({
            access_token: MAPBOX_TOKEN,
            types: "place",
            autocomplete: "true",
            limit: "5",
          })
      );
      if (!res.ok) return;
      const data = await res.json();
      const results: CitySuggestion[] = data.features.map(
        (f: { id: string; text: string; place_name: string; center: [number, number] }) => ({
          id: f.id,
          city: f.text,
          fullName: f.place_name,
          coordinates: f.center,
        })
      );
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIdx(-1);
    } catch {
      // silently fail — user can still type freely
    }
  }, []);

  const handleChange = (text: string) => {
    onChange(text);
    onCoordinatesChange?.(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCities(text), 300);
  };

  const selectSuggestion = (s: CitySuggestion) => {
    onChange(s.fullName);
    onCoordinatesChange?.(s.coordinates);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Tokyo, Paris, New York..."
        className="w-full rounded-lg border border-white/[0.20] bg-white/[0.06] px-4 py-3 text-sm text-white/90 placeholder-white/40 outline-none focus:border-[#B0FBCD]/40 focus:bg-white/[0.09] transition-all"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-white/[0.15] bg-[#0c0c0e] shadow-xl shadow-black/60 backdrop-blur-xl">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              onMouseDown={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === activeIdx
                  ? "bg-[#B0FBCD]/[0.07] text-[#B0FBCD]/90"
                  : "text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              <span className="font-medium text-white/80">{s.city}</span>
              {s.fullName !== s.city && (
                <span className="text-white/55">
                  {s.fullName.slice(s.city.length)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
