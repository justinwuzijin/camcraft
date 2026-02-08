import { HandLandmarks, dist, HAND_LANDMARKS } from "./types";

export const PICTURE_FRAME_INDEX_EXTEND_MIN = 0.03;
export const PICTURE_FRAME_INDEX_EXTEND_MAX = 0.14;
export const PICTURE_FRAME_THUMB_EXTEND_MIN = 0.06;
export const PICTURE_FRAME_OTHER_CURL_MAX = 0.2;
export const PICTURE_FRAME_THUMB_INDEX_SPREAD_MIN = 0.06;
export const PICTURE_FRAME_HOLD_MS = 400;
export const PICTURE_FRAME_COOLDOWN_MS = 1500;

export type PictureFrameHandDebug = {
  indexDist: number;
  thumbDist: number;
  spread: number;
  middleDist: number;
  ringDist: number;
  pinkyDist: number;
  indexExtended: boolean;
  thumbExtended: boolean;
  thumbIndexSpread: boolean;
  middleCurl: boolean;
  ringCurl: boolean;
  pinkyCurl: boolean;
  pass: boolean;
};

function evaluatePictureFrameHand(
  landmarks: HandLandmarks
): PictureFrameHandDebug | null {
  const thumbCmc = landmarks[HAND_LANDMARKS.THUMB_CMC];
  const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
  const indexMcp = landmarks[HAND_LANDMARKS.INDEX_MCP];
  const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
  const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_MCP];
  const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_TIP];
  const ringMcp = landmarks[HAND_LANDMARKS.RING_MCP];
  const ringTip = landmarks[HAND_LANDMARKS.RING_TIP];
  const pinkyMcp = landmarks[HAND_LANDMARKS.PINKY_MCP];
  const pinkyTip = landmarks[HAND_LANDMARKS.PINKY_TIP];

  if (
    !thumbCmc ||
    !thumbTip ||
    !indexMcp ||
    !indexTip ||
    !middleMcp ||
    !middleTip ||
    !ringMcp ||
    !ringTip ||
    !pinkyMcp ||
    !pinkyTip
  ) {
    return null;
  }

  const indexDist = dist(indexMcp, indexTip);
  const thumbDist = dist(thumbCmc, thumbTip);
  const spread = dist(thumbTip, indexTip);
  const middleDist = dist(middleMcp, middleTip);
  const ringDist = dist(ringMcp, ringTip);
  const pinkyDist = dist(pinkyMcp, pinkyTip);

  const indexExtended =
    indexDist >= PICTURE_FRAME_INDEX_EXTEND_MIN &&
    indexDist <= PICTURE_FRAME_INDEX_EXTEND_MAX;
  const thumbExtended = thumbDist >= PICTURE_FRAME_THUMB_EXTEND_MIN;
  const thumbIndexSpread = spread >= PICTURE_FRAME_THUMB_INDEX_SPREAD_MIN;
  const middleCurl = middleDist <= PICTURE_FRAME_OTHER_CURL_MAX;
  const ringCurl = ringDist <= PICTURE_FRAME_OTHER_CURL_MAX;
  const pinkyCurl = pinkyDist <= PICTURE_FRAME_OTHER_CURL_MAX;

  const pass =
    indexExtended &&
    thumbExtended &&
    thumbIndexSpread &&
    middleCurl &&
    ringCurl &&
    pinkyCurl;

  return {
    indexDist,
    thumbDist,
    spread,
    middleDist,
    ringDist,
    pinkyDist,
    indexExtended,
    thumbExtended,
    thumbIndexSpread,
    middleCurl,
    ringCurl,
    pinkyCurl,
    pass,
  };
}

function isPictureFrameHand(landmarks: HandLandmarks): boolean {
  const ev = evaluatePictureFrameHand(landmarks);
  return ev !== null && ev.pass;
}

/**
 * Detects picture-frame gesture. When handedness is provided, only the right hand
 * is required to form the frame. When not provided, any single hand in frame pose counts.
 */
export function detectPictureFrame(
  hands: HandLandmarks[],
  handedness?: string[]
): boolean {
  if (hands.length === 0) return false;
  if (handedness && handedness.length === hands.length) {
    const rightIndex = handedness.findIndex(
      (h) => h.toLowerCase() === "right"
    );
    if (rightIndex === -1) return false;
    return isPictureFrameHand(hands[rightIndex]);
  }
  return hands.length >= 1 && hands.some((hand) => isPictureFrameHand(hand));
}

/**
 * Returns picture-frame debug per hand; array is aligned with hands (null for invalid/missing).
 */
export function getPictureFrameDebug(
  hands: HandLandmarks[]
): (PictureFrameHandDebug | null)[] {
  return hands.map(evaluatePictureFrameHand);
}
