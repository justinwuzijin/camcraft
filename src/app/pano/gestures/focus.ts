import { HandLandmarks, dist, HAND_LANDMARKS } from "./types";
import {
  PICTURE_FRAME_INDEX_EXTEND_MIN,
  PICTURE_FRAME_INDEX_EXTEND_MAX,
  PICTURE_FRAME_THUMB_EXTEND_MIN,
  PICTURE_FRAME_OTHER_CURL_MAX,
  PICTURE_FRAME_THUMB_INDEX_SPREAD_MIN,
  type PictureFrameHandDebug,
} from "./pictureFrame";

export const FOCUS_HOLD_MS = 400;
export const FOCUS_COOLDOWN_MS = 1500;

function evaluateFocusHand(
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

function isFocusHand(landmarks: HandLandmarks): boolean {
  const ev = evaluateFocusHand(landmarks);
  return ev !== null && ev.pass;
}

/**
 * Detects focus gesture — same hand shape as picture frame but on the LEFT hand only.
 */
export function detectFocus(
  hands: HandLandmarks[],
  handedness?: string[]
): boolean {
  if (hands.length === 0) return false;
  if (handedness && handedness.length === hands.length) {
    const leftIndex = handedness.findIndex(
      (h) => h.toLowerCase() === "left"
    );
    if (leftIndex === -1) return false;
    return isFocusHand(hands[leftIndex]);
  }
  return false;
}

export function getFocusDebug(
  hands: HandLandmarks[],
  handedness?: string[]
): PictureFrameHandDebug | null {
  if (!handedness || handedness.length !== hands.length) return null;
  const leftIndex = handedness.findIndex(
    (h) => h.toLowerCase() === "left"
  );
  if (leftIndex === -1) return null;
  return evaluateFocusHand(hands[leftIndex]);
}
