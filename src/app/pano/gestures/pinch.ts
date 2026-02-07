import { HandLandmarks, dist, HAND_LANDMARKS } from "./types";

export const PINCH_DISTANCE_THRESHOLD = 0.08;
export const ROTATE_SENSITIVITY = 2;
/** Minimum delta (in normalized coords) to register — filters sub-pixel jitter */
export const PINCH_DEAD_ZONE = 0.003;

export type PinchResult = { x: number; y: number; distance: number };

export function detectPinch(landmarks: HandLandmarks): PinchResult | null {
  const thumb = landmarks[HAND_LANDMARKS.THUMB_TIP];
  const index = landmarks[HAND_LANDMARKS.INDEX_TIP];
  if (!thumb || !index) return null;
  const distance = dist(thumb, index);
  return {
    x: (thumb.x + index.x) / 2,
    y: (thumb.y + index.y) / 2,
    distance,
  };
}

export function isPinching(landmarks: HandLandmarks): boolean {
  const pinch = detectPinch(landmarks);
  return pinch !== null && pinch.distance < PINCH_DISTANCE_THRESHOLD;
}
