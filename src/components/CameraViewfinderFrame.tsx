"use client";

import type { CameraId } from "@/lib/cameraStore";
import { ReactNode } from "react";

export type ViewfinderDimensions = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Camera back images mapping (images have transparent LCD areas)
export const CAMERA_BACK_IMAGES: Record<CameraId, string> = {
  "sony-a7iv": "/camera_back_a7iv.png",
  "fujifilm-xt2": "/camera_back_fujifilm.png",
  "digital-camera": "/camera_back_digital.png",
  "sony-handycam": "/camera_back_handycam.png",
};

// Viewfinder screen position for each camera (where the transparent LCD area is)
// Measured from alpha channel boundaries, expanded 4px outward to fully cover the
// transparent area. Overshoot is hidden by the camera image rendering at z-[1].
export const VIEWFINDER_DIMENSIONS: Record<CameraId, ViewfinderDimensions> = {
  "sony-a7iv": { left: 0.1650, top: 0.4020, width: 0.3792, height: 0.3995 },
  "fujifilm-xt2": { left: 0.1683, top: 0.3750, width: 0.4069, height: 0.4216 },
  "digital-camera": { left: 0.1977, top: 0.2696, width: 0.3562, height: 0.5000 },
  "sony-handycam": { left: 0.2647, top: 0.4730, width: 0.3039, height: 0.2770 },
};

interface CameraViewfinderFrameProps {
  cameraId: CameraId;
  className?: string;
  children?: ReactNode;
}

export default function CameraViewfinderFrame({
  cameraId,
  className = "",
  children,
}: CameraViewfinderFrameProps) {
  const dims = VIEWFINDER_DIMENSIONS[cameraId];
  const imageSrc = CAMERA_BACK_IMAGES[cameraId];

  return (
    <div className={`relative ${className}`}>
      {/* Children (focus image, flash, etc.) rendered in the viewfinder area */}
      {children && (
        <div
          className="absolute overflow-hidden z-0"
          style={{
            left: `${dims.left * 100}%`,
            top: `${dims.top * 100}%`,
            width: `${dims.width * 100}%`,
            height: `${dims.height * 100}%`,
          }}
        >
          {children}
        </div>
      )}
      {/* Camera back image with transparent LCD area - renders on top */}
      <img
        src={imageSrc}
        alt=""
        className="relative z-[1] h-[85vh] w-auto max-w-[90vw] object-contain pointer-events-none"
      />
    </div>
  );
}

// Mini version of the camera frame for the bottom overlay
interface MiniCameraFrameProps {
  cameraId: CameraId;
  className?: string;
}

export function MiniCameraFrame({ cameraId, className = "" }: MiniCameraFrameProps) {
  const imageSrc = CAMERA_BACK_IMAGES[cameraId];

  return (
    <img
      src={imageSrc}
      alt=""
      className={`w-48 h-auto object-contain ${className}`}
    />
  );
}
