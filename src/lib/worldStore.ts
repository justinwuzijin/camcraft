export type WorldEntry = {
  id: string;
  panoPath: string;
  parameters: {
    location: string;
    timeOfDay: string;
    decade: string;
    placeType: string;
    weather: string;
    crowd: string;
  };
  prompt: string;
  createdAt: number;
};

const STORAGE_KEY = "camcraft_worlds";

export function getWorldEntries(): WorldEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorldEntry[];
  } catch {
    return [];
  }
}

export function addWorldEntry(entry: WorldEntry): void {
  const entries = getWorldEntries();
  entries.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function removeWorldEntry(id: string): void {
  const entries = getWorldEntries().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearWorldEntries(): void {
  localStorage.removeItem(STORAGE_KEY);
}
