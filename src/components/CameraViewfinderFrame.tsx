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
// Values are fractions (0-1) of the image dimensions - calibrated to actual images
export const VIEWFINDER_DIMENSIONS: Record<CameraId, ViewfinderDimensions> = {
  "sony-a7iv": { left: 0.08, top: 0.20, width: 0.56, height: 0.65 },
  "fujifilm-xt2": { left: 0.055, top: 0.20, width: 0.59, height: 0.68 },
  "digital-camera": { left: 0.09, top: 0.115, width: 0.51, height: 0.76 },
  "sony-handycam": { left: 0.05, top: 0.22, width: 0.50, height: 0.62 },
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
      {/* Children (HUD, flash, focus image) rendered in the viewfinder area */}
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
        className="relative z-[1] h-[90vh] w-auto max-w-[95vw] object-contain pointer-events-none"
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
