export type GalleryEntry = {
  id: string;
  /** URL path to the saved image (e.g. /generated/focus_123.jpg) */
  imagePath: string;
  /** URL path to the panorama this was captured from */
  panoPath: string | null;
  /** Timestamp of capture */
  capturedAt: number;
  /** Scene parameters used to generate the panorama */
  scene: {
    location?: string;
    timeOfDay?: string;
    era?: string;
    setting?: string;
    weather?: string;
    crowd?: string;
  };
  /** Camera specs active during capture */
  camera: {
    body: string;
    lens: string;
    focalLength: string;
    iso: string;
    sensor: string;
    resolution: string;
  };
};

const STORAGE_KEY = "camcraft_gallery";

export function getGalleryEntries(): GalleryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GalleryEntry[];
  } catch {
    return [];
  }
}

export function addGalleryEntry(entry: GalleryEntry): void {
  const entries = getGalleryEntries();
  entries.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function removeGalleryEntry(id: string): void {
  const entries = getGalleryEntries().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearGallery(): void {
  localStorage.removeItem(STORAGE_KEY);
}
