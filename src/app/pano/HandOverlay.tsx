"use client";

import { useEffect, useRef, useState } from "react";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const PREVIEW_WIDTH = 370;
const PREVIEW_HEIGHT = 240;

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_DISTANCE_THRESHOLD = 0.08;
const ROTATE_SENSITIVITY = 4;

export type GestureDeltaRef = React.MutableRefObject<{
  deltaAzimuth: number;
  deltaPolar: number;
} | null>;

type HandOverlayProps = {
  gestureDeltaRef?: GestureDeltaRef;
};

function pinchCenterAndDistance(landmarks: { x: number; y: number }[]) {
  const thumb = landmarks[THUMB_TIP];
  const index = landmarks[INDEX_TIP];
  if (!thumb || !index) return null;
  const dx = thumb.x - index.x;
  const dy = thumb.y - index.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return {
    x: (thumb.x + index.x) / 2,
    y: (thumb.y + index.y) / 2,
    distance,
  };
}

export default function HandOverlay({ gestureDeltaRef }: HandOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const handLandmarkerRef = useRef<{
    detectForVideo: (
      image: HTMLVideoElement,
      timestamp: number
    ) => { landmarks: { x: number; y: number }[][] };
    HAND_CONNECTIONS: { start: number; end: number }[];
  } | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const rafRef = useRef<number>(0);
  const videoTimestampRef = useRef(0);
  const lastLogRef = useRef("");
  const lastRunRef = useRef(0);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function init() {
      try {
        const [{ FilesetResolver, HandLandmarker }] = await Promise.all([
          import("@mediapipe/tasks-vision").then((m) => m),
          (async () => {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT },
            });
            const video = videoRef.current;
            if (!video) return;
            video.srcObject = stream;
            await video.play();
          })(),
        ]);

        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
        });

        handLandmarkerRef.current = {
          detectForVideo: (img: HTMLVideoElement, ts: number) =>
            handLandmarker.detectForVideo(img, ts),
          HAND_CONNECTIONS: HandLandmarker.HAND_CONNECTIONS,
        };
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start camera");
      }
    }

    init();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
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
        videoTimestampRef.current += 33333;
        const ts = videoTimestampRef.current;
        let result: { landmarks: { x: number; y: number }[][] };
        try {
          result = handLandmarker.detectForVideo(video, ts);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (logBoxRef.current && msg !== lastLogRef.current) {
            lastLogRef.current = msg;
            logBoxRef.current.innerHTML = [
              "Hands detected: -",
              "Pinch: -",
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
          const pinch = pinchCenterAndDistance(hand);
          if (pinch && pinch.distance < PINCH_DISTANCE_THRESHOLD) {
            pinching = { x: pinch.x, y: pinch.y };
            break;
          }
        }

        if (gestureDeltaRef?.current) {
          if (pinching) {
            const last = lastPinchCenterRef.current;
            if (last !== null) {
              const deltaX = pinching.x - last.x;
              const deltaY = pinching.y - last.y;
              gestureDeltaRef.current.deltaAzimuth += deltaX * ROTATE_SENSITIVITY;
              gestureDeltaRef.current.deltaPolar += -deltaY * ROTATE_SENSITIVITY;
            }
            lastPinchCenterRef.current = pinching;
          } else {
            lastPinchCenterRef.current = null;
          }
        }

        if (logBoxRef.current) {
          const handsCount = result.landmarks.length;
          const logText = [
            `Hands detected: ${handsCount}`,
            `Pinch: ${pinching ? "yes" : "no"}`,
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
  }, [ready, gestureDeltaRef]);

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
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div
        ref={logBoxRef}
        className="absolute left-4 top-4 rounded-lg border border-white/20 bg-black/80 px-3 py-2 font-mono text-xs text-white shadow-lg"
        aria-live="polite"
      >
        Hands detected: -
        <br />
        Pinch: -
        <br />
        Camera: starting...
      </div>
      <div className="absolute bottom-4 right-4 overflow-hidden rounded-lg border border-white/20 bg-black shadow-lg">
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
