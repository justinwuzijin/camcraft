import { HandLandmarks, dist, HAND_LANDMARKS } from "./types";

/** Max tip-to-mcp distance for each finger to count as "curled" (fist) */
export const FIST_CURL_MAX = 0.08;
/** Min tip-to-mcp distance for each finger to count as "extended" (open) */
export const OPEN_EXTEND_MIN = 0.06;
/** Min thumb cmc-to-tip distance for open hand */
export const OPEN_THUMB_EXTEND_MIN = 0.08;
/** Max ms allowed between fist detection and open hand to count as a gesture */
export const FIST_TO_OPEN_WINDOW_MS = 800;
/** Cooldown after the gesture fires before it can fire again */
export const FIST_TO_OPEN_COOLDOWN_MS = 1500;

const FINGER_PAIRS: [number, number][] = [
  [HAND_LANDMARKS.INDEX_MCP, HAND_LANDMARKS.INDEX_TIP],
  [HAND_LANDMARKS.MIDDLE_MCP, HAND_LANDMARKS.MIDDLE_TIP],
  [HAND_LANDMARKS.RING_MCP, HAND_LANDMARKS.RING_TIP],
  [HAND_LANDMARKS.PINKY_MCP, HAND_LANDMARKS.PINKY_TIP],
];

export function detectFist(landmarks: HandLandmarks): boolean {
  // Only check the four fingers — the thumb wraps around the outside of a
  // fist so its CMC-to-TIP distance stays large and isn't a reliable signal.
  for (const [mcp, tip] of FINGER_PAIRS) {
    if (!landmarks[mcp] || !landmarks[tip]) return false;
    if (dist(landmarks[mcp], landmarks[tip]) > FIST_CURL_MAX) return false;
  }
  return true;
}

export function detectOpenHand(landmarks: HandLandmarks): boolean {
  for (const [mcp, tip] of FINGER_PAIRS) {
    if (!landmarks[mcp] || !landmarks[tip]) return false;
    if (dist(landmarks[mcp], landmarks[tip]) < OPEN_EXTEND_MIN) return false;
  }
  const thumbCmc = landmarks[HAND_LANDMARKS.THUMB_CMC];
  const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
  if (!thumbCmc || !thumbTip) return false;
  if (dist(thumbCmc, thumbTip) < OPEN_THUMB_EXTEND_MIN) return false;
  return true;
}

export type FistOpenDebug = {
  indexDist: number;
  middleDist: number;
  ringDist: number;
  pinkyDist: number;
  thumbDist: number;
  isFist: boolean;
  isOpen: boolean;
};

export function getFistOpenDebug(
  landmarks: HandLandmarks
): FistOpenDebug | null {
  const indexMcp = landmarks[HAND_LANDMARKS.INDEX_MCP];
  const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
  const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_MCP];
  const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_TIP];
  const ringMcp = landmarks[HAND_LANDMARKS.RING_MCP];
  const ringTip = landmarks[HAND_LANDMARKS.RING_TIP];
  const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];
  const pinkyTip = landmarks[HAND_LANDMARKS.PINKY_TIP];
  const thumbCmc = landmarks[HAND_LANDMARKS.THUMB_CMC];
  const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];

  if (
    !indexMcp || !indexTip || !middleMcp || !middleTip ||
    !ringMcp || !ringTip || !pinkyMcp || !pinkyTip ||
    !thumbCmc || !thumbTip
  ) {
    return null;
  }

  return {
    indexDist: dist(indexMcp, indexTip),
    middleDist: dist(middleMcp, middleTip),
    ringDist: dist(ringMcp, ringTip),
    pinkyDist: dist(pinkyMcp, pinkyTip),
    thumbDist: dist(thumbCmc, thumbTip),
    isFist: detectFist(landmarks),
    isOpen: detectOpenHand(landmarks),
  };
}
