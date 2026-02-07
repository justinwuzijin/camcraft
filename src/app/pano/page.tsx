"use client";

import { useRef } from "react";
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

  return (
    <div className="relative w-full min-h-screen bg-black">
      <PanoViewer gestureDeltaRef={gestureDeltaRef} />
      <HandOverlay gestureDeltaRef={gestureDeltaRef} />
    </div>
  );
}
