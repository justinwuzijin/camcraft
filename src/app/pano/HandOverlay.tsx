"use client";

import { useEffect, useRef, useState } from "react";
import {
  detectPinch,
  detectPictureFrame,
  getPictureFrameDebug,
  detectFist,
  detectOpenHand,
  getFistOpenDebug,
  detectFocus,
  getFocusDebug,
  PINCH_DISTANCE_THRESHOLD,
  ROTATE_SENSITIVITY,
  PINCH_DEAD_ZONE,
  PICTURE_FRAME_HOLD_MS,
  PICTURE_FRAME_COOLDOWN_MS,
  FOCUS_HOLD_MS,
  FOCUS_COOLDOWN_MS,
  FIST_TO_OPEN_WINDOW_MS,
  FIST_TO_OPEN_COOLDOWN_MS,
} from "./gestures";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const PREVIEW_WIDTH = 370;
const PREVIEW_HEIGHT = 240;

// Module-level singleton — MediaPipe's WASM runtime is shared and closing/reopening
// an instance corrupts it. Keeping one instance alive across React re-mounts is safe.
type LandmarkerHandle = {
  detectForVideo: (
    image: HTMLVideoElement,
    timestamp: number
  ) => { landmarks: { x: number; y: number }[][]; handedness?: { categoryName?: string }[][] };
  HAND_CONNECTIONS: { start: number; end: number }[];
};
let _landmarker: LandmarkerHandle | null = null;
let _landmarkerPromise: Promise<LandmarkerHandle> | null = null;

async function getHandLandmarker(): Promise<LandmarkerHandle> {
  if (_landmarker) return _landmarker;
  if (_landmarkerPromise) return _landmarkerPromise;
  _landmarkerPromise = (async () => {
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    const hl = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
    });
    _landmarker = {
      detectForVideo: (img, ts) => hl.detectForVideo(img, ts),
      HAND_CONNECTIONS: HandLandmarker.HAND_CONNECTIONS,
    };
    return _landmarker;
  })();
  return _landmarkerPromise;
}

export type GestureDeltaRef = React.MutableRefObject<{
  deltaAzimuth: number;
  deltaPolar: number;
} | null>;

type HandOverlayProps = {
  gestureDeltaRef?: GestureDeltaRef;
  onPictureFrame?: () => void;
  onFistOpen?: () => void;
  onFocus?: () => void;
  cameraOverlayActive?: boolean;
};

export default function HandOverlay({
  gestureDeltaRef,
  onPictureFrame,
  onFistOpen,
  onFocus,
  cameraOverlayActive,
}: HandOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const smoothPinchRef = useRef<{ x: number; y: number } | null>(null);
  const EMA_ALPHA = 0.35; // lower = smoother but laggier
  const pictureFrameHoldStartRef = useRef<number | null>(null);
  const pictureFrameLastFiredRef = useRef<number>(0);
  const focusHoldStartRef = useRef<number | null>(null);
  const focusLastFiredRef = useRef<number>(0);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const handLandmarkerRef = useRef<{
    detectForVideo: (
      image: HTMLVideoElement,
      timestamp: number
    ) => { landmarks: { x: number; y: number }[][]; handedness?: { categoryName?: string }[][] };
    HAND_CONNECTIONS: { start: number; end: number }[];
  } | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const rafRef = useRef<number>(0);
  const lastLogRef = useRef("");
  const lastRunRef = useRef(0);
  const fistSeenRef = useRef<number | null>(null);
  const fistOpenLastFiredRef = useRef<number>(0);
  const onFistOpenRef = useRef(onFistOpen);
  const cameraOverlayActiveRef = useRef(cameraOverlayActive);

  useEffect(() => {
    onFistOpenRef.current = onFistOpen;
    cameraOverlayActiveRef.current = cameraOverlayActive;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let aborted = false;

    async function init() {
      try {
        const [landmarker] = await Promise.all([
          getHandLandmarker(),
          (async () => {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT },
            });
            if (aborted) { stream.getTracks().forEach((t) => t.stop()); return; }
            const video = videoRef.current;
            if (!video) return;
            video.srcObject = stream;
            await video.play();
          })(),
        ]);

        if (aborted) return;

        handLandmarkerRef.current = landmarker;
        setReady(true);
      } catch (e) {
        if (aborted) return;
        setError(e instanceof Error ? e.message : "Failed to start camera");
      }
    }

    const currentVideo = videoRef.current;

    init();
    return () => {
      aborted = true;
      handLandmarkerRef.current = null;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (currentVideo) currentVideo.srcObject = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!ready || !videoRef.current || !overlayCanvasRef.current || !containerRef.current) return;

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const container = containerRef.current;
    const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    function resizeOverlay() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    resizeOverlay();
    const resizeObserver = new ResizeObserver(resizeOverlay);
    resizeObserver.observe(container);

    function getOverlayCoords(
      normX: number,
      normY: number
    ): { x: number; y: number } {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cw = canvas.width;
      const ch = canvas.height;
      if (!vw || !vh) {
        return {
          x: (1 - normX) * cw,
          y: normY * ch,
        };
      }
      const scale = Math.max(cw / vw, ch / vh);
      const scaledW = vw * scale;
      const scaledH = vh * scale;
      const offsetX = (scaledW - cw) / 2;
      const offsetY = (scaledH - ch) / 2;
      const mirrorX = 1 - normX;
      return {
        x: mirrorX * scaledW - offsetX,
        y: normY * scaledH - offsetY,
      };
    }

    function drawLandmarks(
      context: CanvasRenderingContext2D,
      landmarks: { x: number; y: number }[],
      connections: { start: number; end: number }[]
    ) {
      for (const conn of connections) {
        const a = landmarks[conn.start];
        const b = landmarks[conn.end];
        if (!a || !b) continue;
        const pa = getOverlayCoords(a.x, a.y);
        const pb = getOverlayCoords(b.x, b.y);
        context.beginPath();
        context.moveTo(pa.x, pa.y);
        context.lineTo(pb.x, pb.y);
        context.strokeStyle = "#00ff00";
        context.lineWidth = 2;
        context.stroke();
      }
      for (const lm of landmarks) {
        const p = getOverlayCoords(lm.x, lm.y);
        context.beginPath();
        context.arc(p.x, p.y, 6, 0, 2 * Math.PI);
        context.fillStyle = "#e53935";
        context.fill();
      }
    }

    const STALE_VIDEO_MS = 200;

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const handLandmarker = handLandmarkerRef.current;
      if (!handLandmarker || video.readyState < 2) return;

      const videoTimeChanged = video.currentTime !== lastVideoTimeRef.current;
      const now = performance.now();
      const stale = now - lastRunRef.current > STALE_VIDEO_MS;
      const runDetection = videoTimeChanged || (stale && video.readyState >= 2);

      if (runDetection) {
        lastVideoTimeRef.current = video.currentTime;
        lastRunRef.current = now;
        const ts = now;
        let result: {
          landmarks: { x: number; y: number }[][];
          handedness?: { categoryName?: string }[][];
        };
        try {
          result = handLandmarker.detectForVideo(video, ts);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (logBoxRef.current && msg !== lastLogRef.current) {
            lastLogRef.current = msg;
            logBoxRef.current.innerHTML = [
              "Hands detected: -",
              "Pinch: -",
              "Picture frame: -",
              "Camera: on",
              `Error: ${msg}`,
            ].join("<br>");
          }
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const connections = handLandmarker.HAND_CONNECTIONS;
        for (const hand of result.landmarks) {
          drawLandmarks(ctx, hand, connections);
        }

        let pinching: { x: number; y: number } | null = null;
        for (const hand of result.landmarks) {
          const pinch = detectPinch(hand);
          if (pinch && pinch.distance < PINCH_DISTANCE_THRESHOLD) {
            pinching = { x: pinch.x, y: pinch.y };
            break;
          }
        }

        if (gestureDeltaRef?.current) {
          if (pinching) {
            // EMA smooth the raw pinch position to reduce hand jitter
            const prev = smoothPinchRef.current;
            const smoothed = prev
              ? {
                x: prev.x + EMA_ALPHA * (pinching.x - prev.x),
                y: prev.y + EMA_ALPHA * (pinching.y - prev.y),
              }
              : pinching;
            smoothPinchRef.current = smoothed;

            const last = lastPinchCenterRef.current;
            if (last !== null) {
              const deltaX = smoothed.x - last.x;
              const deltaY = smoothed.y - last.y;
              // Dead zone: ignore tiny deltas from jitter
              if (Math.abs(deltaX) > PINCH_DEAD_ZONE)
                gestureDeltaRef.current.deltaAzimuth += deltaX * ROTATE_SENSITIVITY;
              if (Math.abs(deltaY) > PINCH_DEAD_ZONE)
                gestureDeltaRef.current.deltaPolar += -deltaY * ROTATE_SENSITIVITY;
            }
            lastPinchCenterRef.current = smoothed;
          } else {
            lastPinchCenterRef.current = null;
            smoothPinchRef.current = null;
          }
        }

        // ── Fist → Open hand gesture ──
        let anyFist = false;
        let anyOpen = false;
        for (const hand of result.landmarks) {
          if (detectFist(hand)) anyFist = true;
          if (detectOpenHand(hand)) anyOpen = true;
        }

        if (anyFist && fistSeenRef.current === null) {
          fistSeenRef.current = now;
        }

        if (fistSeenRef.current !== null) {
          if (now - fistSeenRef.current > FIST_TO_OPEN_WINDOW_MS) {
            fistSeenRef.current = null;
          } else if (anyOpen) {
            const cooldownOk =
              now - fistOpenLastFiredRef.current >= FIST_TO_OPEN_COOLDOWN_MS;
            if (cooldownOk && onFistOpenRef.current) {
              fistOpenLastFiredRef.current = now;
              onFistOpenRef.current();
            }
            fistSeenRef.current = null;
          }
        }

        // ── Fist/Open debug per hand ──
        const fistOpenDebugArr = result.landmarks.map((hand, i) => {
          const dbg = getFistOpenDebug(hand);
          if (!dbg) return `FO hand ${i}: no data`;
          return `FO hand ${i}: fist=${dbg.isFist ? "Y" : "n"} open=${dbg.isOpen ? "Y" : "n"} (idx=${dbg.indexDist.toFixed(2)} mid=${dbg.middleDist.toFixed(2)} ring=${dbg.ringDist.toFixed(2)} pink=${dbg.pinkyDist.toFixed(2)} thumb=${dbg.thumbDist.toFixed(2)})`;
        });

        // ── Picture frame (only when camera overlay is active); right hand only ──
        const overlayOn = !!cameraOverlayActiveRef.current;
        const handednessLabels =
          result.handedness?.map((h) => h[0]?.categoryName ?? "") ?? [];
        const rightHandPictureFrame =
          overlayOn &&
          detectPictureFrame(result.landmarks, handednessLabels);
        const pictureFrameDebug = getPictureFrameDebug(result.landmarks);
        if (rightHandPictureFrame) {
          if (pictureFrameHoldStartRef.current === null) {
            pictureFrameHoldStartRef.current = now;
          }
          const held = now - pictureFrameHoldStartRef.current;
          const cooldownPassed =
            now - pictureFrameLastFiredRef.current >= PICTURE_FRAME_COOLDOWN_MS;
          if (
            held >= PICTURE_FRAME_HOLD_MS &&
            cooldownPassed &&
            onPictureFrame
          ) {
            pictureFrameLastFiredRef.current = now;
            onPictureFrame();
          }
        } else {
          pictureFrameHoldStartRef.current = null;
        }

        // ── Focus gesture (left hand only, same shape as picture frame; requires overlay) ──
        const leftHandFocus =
          overlayOn && detectFocus(result.landmarks, handednessLabels);
        const focusDebug = getFocusDebug(result.landmarks, handednessLabels);
        if (leftHandFocus) {
          if (focusHoldStartRef.current === null) {
            focusHoldStartRef.current = now;
          }
          const held = now - focusHoldStartRef.current;
          const cooldownPassed =
            now - focusLastFiredRef.current >= FOCUS_COOLDOWN_MS;
          if (held >= FOCUS_HOLD_MS && cooldownPassed) {
            focusLastFiredRef.current = now;
            if (onFocus) onFocus();
          }
        } else {
          focusHoldStartRef.current = null;
        }

        if (logBoxRef.current) {
          const handsCount = result.landmarks.length;
          const rightIdx = handednessLabels.findIndex(
            (h) => h?.toLowerCase() === "right"
          );
          const rightHandDebug =
            rightIdx >= 0 && rightIdx < pictureFrameDebug.length
              ? pictureFrameDebug[rightIdx]
              : null;
          const leftIdx = handednessLabels.findIndex(
            (h) => h?.toLowerCase() === "left"
          );
          const pfLines =
            handsCount === 0
              ? ["PF: (no hands)"]
              : rightIdx === -1
                ? ["PF: (no right hand)"]
                : rightHandDebug === null
                  ? ["PF (right): (no landmarks)"]
                  : (() => {
                    const h = rightHandDebug;
                    const fails: string[] = [];
                    if (!h.indexExtended) fails.push("idx");
                    if (!h.thumbExtended) fails.push("thumb");
                    if (!h.thumbIndexSpread) fails.push("spread");
                    if (!h.middleCurl) fails.push("mid");
                    if (!h.ringCurl) fails.push("ring");
                    if (!h.pinkyCurl) fails.push("pink");
                    const status =
                      fails.length === 0 ? "ok" : `fail: ${fails.join(",")}`;
                    return [
                      `PF (right): ${status} (idx=${h.indexDist.toFixed(2)} thumb=${h.thumbDist.toFixed(2)} spread=${h.spread.toFixed(2)} mid=${h.middleDist.toFixed(2)} ring=${h.ringDist.toFixed(2)} pink=${h.pinkyDist.toFixed(2)})`,
                    ];
                  })();
          const focusLines =
            handsCount === 0
              ? ["Focus (left): (no hands)"]
              : leftIdx === -1
                ? ["Focus (left): (no left hand)"]
                : focusDebug === null
                  ? ["Focus (left): (no landmarks)"]
                  : (() => {
                    const h = focusDebug;
                    const fails: string[] = [];
                    if (!h.indexExtended) fails.push("idx");
                    if (!h.thumbExtended) fails.push("thumb");
                    if (!h.thumbIndexSpread) fails.push("spread");
                    if (!h.middleCurl) fails.push("mid");
                    if (!h.ringCurl) fails.push("ring");
                    if (!h.pinkyCurl) fails.push("pink");
                    const status =
                      fails.length === 0 ? "ok" : `fail: ${fails.join(",")}`;
                    const overlayHint = !overlayOn ? " (needs overlay)" : "";
                    return [
                      `Focus (left): ${status}${overlayHint} (idx=${h.indexDist.toFixed(2)} thumb=${h.thumbDist.toFixed(2)} spread=${h.spread.toFixed(2)} mid=${h.middleDist.toFixed(2)} ring=${h.ringDist.toFixed(2)} pink=${h.pinkyDist.toFixed(2)})`,
                    ];
                  })();
          const fistTrackingStatus = fistSeenRef.current !== null ? " TRACKING" : "";
          const logText = [
            `Hands detected: ${handsCount}`,
            `Pinch: ${pinching ? "yes" : "no"}`,
            `Fist→Open: fist=${anyFist ? "YES" : "no"} open=${anyOpen ? "YES" : "no"}${fistTrackingStatus}`,
            ...fistOpenDebugArr,
            `Camera overlay: ${overlayOn ? "ACTIVE" : "off"}`,
            `Picture frame: ${rightHandPictureFrame ? "yes" : "no"}${!overlayOn ? " (needs overlay)" : ""}`,
            ...pfLines,
            ...focusLines,
            "Camera: on",
          ].join("<br>");
          if (logText !== lastLogRef.current) {
            lastLogRef.current = logText;
            logBoxRef.current.innerHTML = logText;
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, gestureDeltaRef, onPictureFrame, onFocus]);

  if (error) {
    return (
      <div className="absolute bottom-4 right-4 rounded-lg bg-black/80 px-3 py-2 text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 z-20"
        aria-hidden
      >
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div
        ref={logBoxRef}
        className="absolute left-4 bottom-4 z-20 rounded-lg border border-white/20 bg-black/80 px-3 py-2 font-mono text-xs text-white shadow-lg"
        aria-live="polite"
      >
        Hands detected: -
        <br />
        Pinch: -
        <br />
        Picture frame: -
        <br />
        Camera: starting...
      </div>
      <div className="absolute bottom-4 right-4 z-20 overflow-hidden rounded-lg border border-white/20 bg-black shadow-lg">
        <div
          className="relative"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
            playsInline
            muted
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
              Starting camera...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
