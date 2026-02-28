"use client";

import type { CameraId } from "@/lib/cameraStore";

interface ViewfinderHUDProps {
  cameraId: CameraId;
  focusLoading?: boolean;
  focusConfirmed?: boolean;
}

export default function ViewfinderHUD({
  cameraId: _cameraId,
  focusLoading = false,
  focusConfirmed: _focusConfirmed = false,
}: ViewfinderHUDProps) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {focusLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white text-sm animate-pulse">Focusing...</span>
        </div>
      )}
    </div>
  );
}
