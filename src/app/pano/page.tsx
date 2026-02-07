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
  const [cameraOverlayActive, setCameraOverlayActive] = useState(false);

  const onPictureFrame = useCallback(() => {
    setFlash(true);
  }, []);

  const onFistOpen = useCallback(() => {
    setCameraOverlayActive((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 200);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="relative w-full min-h-screen bg-black">
      <PanoViewer gestureDeltaRef={gestureDeltaRef} />
      {/* Big camera overlay — toggled by fist→open gesture */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-all duration-500 ${
          cameraOverlayActive
            ? "scale-100 opacity-100"
            : "scale-90 opacity-0"
        }`}
        aria-hidden
      >
        <div className="relative">
          {flash && (
            <div
              className="absolute bg-white/80"
              style={{
                left: "20%",
                top: "37%",
                width: "40%",
                height: "50%",
              }}
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
    </div>
  );
}
