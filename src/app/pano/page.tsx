"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import HandOverlay from "./HandOverlay";

const PanoViewer = dynamic(() => import("./PanoViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
      Loading panorama...
    </div>
  ),
});

export default function PanoPage() {
  const gestureDeltaRef = useRef<{
    deltaAzimuth: number;
    deltaPolar: number;
  }>({ deltaAzimuth: 0, deltaPolar: 0 });
  const [flash, setFlash] = useState(false);

  const onPictureFrame = useCallback(() => {
    setFlash(true);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 200);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="relative w-full min-h-screen bg-black">
      <PanoViewer gestureDeltaRef={gestureDeltaRef} />
      <HandOverlay
        gestureDeltaRef={gestureDeltaRef}
        onPictureFrame={onPictureFrame}
      />
      {flash && (
        <div
          className="pointer-events-none absolute inset-0 bg-white/80"
          aria-hidden
        />
      )}
    </div>
  );
}
