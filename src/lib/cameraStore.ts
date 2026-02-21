// Camera selection store - persists active camera across pages

const STORAGE_KEY = "camcraft_active_camera";
const DEFAULT_CAMERA = "sony-a7iv";

export type CameraId = "sony-handycam" | "digital-camera" | "fujifilm-xt2" | "sony-a7iv";

export const CAMERA_IDS: CameraId[] = [
  "sony-handycam",
  "digital-camera",
  "fujifilm-xt2",
  "sony-a7iv",
];

export function getActiveCamera(): CameraId {
  if (typeof window === "undefined") return DEFAULT_CAMERA;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && CAMERA_IDS.includes(stored as CameraId)) {
    return stored as CameraId;
  }
  return DEFAULT_CAMERA;
}

export function setActiveCamera(cameraId: CameraId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, cameraId);
}

// Camera specs for gallery entries and HUD display
export const CAMERA_SPECS: Record<CameraId, {
  body: string;
  lens: string;
  focalLength: string;
  iso: string;
  sensor: string;
  resolution: string;
}> = {
  "sony-handycam": {
    body: "Sony DCR-TRV900",
    lens: "Carl Zeiss Vario-Sonnar",
    focalLength: "4.3-43mm",
    iso: "N/A (Gain control)",
    sensor: '1/3" 3-CCD',
    resolution: "530 TV lines",
  },
  "digital-camera": {
    body: "Compact Digital",
    lens: "Built-in zoom lens",
    focalLength: "35-105mm equiv.",
    iso: "100-400",
    sensor: '1/2.3" CCD',
    resolution: "5 Megapixels",
  },
  "fujifilm-xt2": {
    body: "Fujifilm X-T2",
    lens: "XF 18-55mm f/2.8-4",
    focalLength: "18-55mm",
    iso: "200-12800",
    sensor: "23.6x15.6mm X-Trans",
    resolution: "24.3 Megapixels",
  },
  "sony-a7iv": {
    body: "Sony α7 IV",
    lens: "FE 24-70mm f/2.8 GM",
    focalLength: "24-70mm",
    iso: "100-51200",
    sensor: "35mm Full-Frame BSI",
    resolution: "33 Megapixels",
  },
};
