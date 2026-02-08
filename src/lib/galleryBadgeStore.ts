const BADGE_KEY = "camcraft_gallery_unseen";

export function getUnseenCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(BADGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function incrementUnseen(): void {
  if (typeof window === "undefined") return;
  try {
    const count = getUnseenCount();
    localStorage.setItem(BADGE_KEY, String(count + 1));
  } catch {
    // ignore
  }
}

export function resetUnseen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BADGE_KEY);
  } catch {
    // ignore
  }
}
