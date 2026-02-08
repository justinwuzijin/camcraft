"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { NavButton } from "@/components/NavButton";
import PhotoFlyAnimation from "@/components/PhotoFlyAnimation";
import HandOverlay from "./HandOverlay";
import SonyViewfinderHUD from "@/components/SonyViewfinderHUD";
import { addGalleryEntry } from "@/lib/galleryStore";
import type { GalleryEntry } from "@/lib/galleryStore";
import { getUnseenCount, incrementUnseen } from "@/lib/galleryBadgeStore";

const PanoViewer = dynamic(() => import("./PanoViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
      Loading panorama...
    </div>
  ),
});

const CameraEquipmentHUD = dynamic(
  () => import("@/components/CameraEquipmentHUD"),
  { ssr: false }
);

const SHUTTER_SOUND = "/sony_shutter.mp3";
const FOCUS_SOUND = "/focus.mp3";

// Viewfinder screen area as fractions of the camera overlay image
const VF_LEFT = 0.2;
const VF_TOP = 0.37;
const VF_WIDTH = 0.4;
const VF_HEIGHT = 0.5;

export default function PanoPage() {
  const gestureDeltaRef = useRef<{
    deltaAzimuth: number;
    deltaPolar: number;
  }>({ deltaAzimuth: 0, deltaPolar: 0 });
  const captureRef = useRef<(() => string | null) | null>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);
  const focusAudioRef = useRef<HTMLAudioElement | null>(null);
  const galleryBtnRef = useRef<HTMLAnchorElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);
  const [flash, setFlash] = useState(false);
  const [cameraOverlayActive, setCameraOverlayActive] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusImage, setFocusImage] = useState<string | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [badgePulse, setBadgePulse] = useState(false);
  const [flyAnimation, setFlyAnimation] = useState<{
    imageUrl: string;
    fromRect: DOMRect;
  } | null>(null);
  // Base64 data of the focused image (kept in memory until captured)
  const focusBase64Ref = useRef<{ data: string; mimeType: string } | null>(null);

  const focusImageRef = useRef<string | null>(null);
  focusImageRef.current = focusImage;
  const focusLoadingRef = useRef(false);
  focusLoadingRef.current = focusLoading;

  // Load badge count on mount
  useEffect(() => {
    setBadgeCount(getUnseenCount());
  }, []);

  const handleFlyComplete = useCallback(() => {
    setFlyAnimation(null);
    incrementUnseen();
    setBadgeCount(getUnseenCount());
    setBadgePulse(true);
    setTimeout(() => setBadgePulse(false), 600);
  }, []);

  const onPictureFrame = useCallback(() => {
    const img = focusImageRef.current;
    const base64 = focusBase64Ref.current;
    if (!img || !base64) return; // only save when focused

    // Capture the viewfinder rect before flash clears the image
    const vfRect = viewfinderRef.current?.getBoundingClientRect();
    const capturedImage = img;

    setFlash(true);
    try {
      if (!shutterAudioRef.current) {
        shutterAudioRef.current = new Audio(SHUTTER_SOUND);
      }
      const audio = shutterAudioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // ignore if audio fails (e.g. autoplay policy)
    }

    // Download the focused image locally
    const a = document.createElement("a");
    a.href = img;
    a.download = `focus_${Date.now()}.jpg`;
    a.click();

    // Save to server + gallery store
    fetch("/api/save-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64.data,
        mimeType: base64.mimeType,
        scene: {},
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.savedPath) {
          const entry: GalleryEntry = {
            id: `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            imagePath: data.savedPath,
            panoPath: null,
            capturedAt: Date.now(),
            scene: {},
            camera: {
              body: "Sony α7 IV",
              lens: "FE 24-70mm f/2.8 GM",
              focalLength: "24-70mm",
              iso: "100-51200",
              sensor: "35mm Full-Frame BSI",
              resolution: "33 Megapixels",
            },
          };
          addGalleryEntry(entry);
        }
      })
      .catch((err) => console.error("Failed to save photo:", err));

    // Clear the focus image after capturing
    setFocusImage(null);
    focusBase64Ref.current = null;

    // Start fly animation after flash fades
    if (vfRect) {
      setTimeout(() => {
        setFlyAnimation({ imageUrl: capturedImage, fromRect: vfRect });
      }, 250);
    }
  }, []);

  const onFistOpen = useCallback(() => {
    setCameraOverlayActive((prev) => !prev);
  }, []);

  const onFocus = useCallback(() => {
    if (focusLoadingRef.current) return; // don't re-trigger while loading

    // Play focus sound
    try {
      if (!focusAudioRef.current) {
        focusAudioRef.current = new Audio(FOCUS_SOUND);
      }
      const audio = focusAudioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // ignore
    }

    // Capture the canvas
    const dataUrl = captureRef.current?.();
    if (!dataUrl) return;

    // Crop to viewfinder region using an offscreen canvas
    const img = new Image();
    img.onload = async () => {
      const cropX = Math.round(img.width * VF_LEFT);
      const cropY = Math.round(img.height * VF_TOP);
      const cropW = Math.round(img.width * VF_WIDTH);
      const cropH = Math.round(img.height * VF_HEIGHT);

      const offscreen = document.createElement("canvas");
      offscreen.width = cropW;
      offscreen.height = cropH;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const croppedDataUrl = offscreen.toDataURL("image/jpeg", 0.9);
      const base64 = croppedDataUrl.split(",")[1];

      setFocusLoading(true);
      setFocusImage(null);

      try {
        const res = await fetch("/api/focus-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType: "image/jpeg" }),
        });

        if (!res.ok) {
          console.error("Focus API error:", res.status);
          setFocusLoading(false);
          return;
        }

        const data = await res.json();
        if (data.image && data.mimeType) {
          setFocusImage(`data:${data.mimeType};base64,${data.image}`);
          focusBase64Ref.current = { data: data.image, mimeType: data.mimeType };
        }
      } catch (err) {
        console.error("Focus request failed:", err);
      } finally {
        setFocusLoading(false);
      }
    };
    img.src = dataUrl;
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 200);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="relative w-full min-h-screen bg-black">
      <PanoViewer gestureDeltaRef={gestureDeltaRef} captureRef={captureRef} />
      {/* Big camera overlay — toggled by fist→open gesture */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-all duration-500 ${
          cameraOverlayActive
            ? "scale-100 opacity-100"
            : "scale-90 opacity-0"
        }`}
        aria-hidden={!cameraOverlayActive}
      >
        <div className="relative">
          {/* Flash effect in viewfinder screen */}
          {flash && (
            <div
              className="absolute bg-white/80"
              style={{
                left: `${VF_LEFT * 100}%`,
                top: `${VF_TOP * 100}%`,
                width: `${VF_WIDTH * 100}%`,
                height: `${VF_HEIGHT * 100}%`,
              }}
              aria-hidden
            />
          )}
          {/* Focus loading / result in viewfinder screen */}
          {(focusLoading || focusImage) && (
            <div
              ref={viewfinderRef}
              className="absolute overflow-hidden"
              style={{
                left: `${VF_LEFT * 100}%`,
                top: `${VF_TOP * 100}%`,
                width: `${VF_WIDTH * 100}%`,
                height: `${VF_HEIGHT * 100}%`,
              }}
            >
              {focusLoading && (
                <div className="absolute inset-0 bg-black/70">
                  <SonyViewfinderHUD focusLoading={true} focusConfirmed={false} />
                </div>
              )}
              {focusImage && !focusLoading && (
                <>
                  <img
                    src={focusImage}
                    alt="Focused shot"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <SonyViewfinderHUD focusLoading={false} focusConfirmed={true} />
                </>
              )}
            </div>
          )}
          {/* Sony viewfinder HUD — always visible on the viewfinder */}
          {!focusLoading && !focusImage && (
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${VF_LEFT * 100}%`,
                top: `${VF_TOP * 100}%`,
                width: `${VF_WIDTH * 100}%`,
                height: `${VF_HEIGHT * 100}%`,
              }}
            >
              <SonyViewfinderHUD />
            </div>
          )}
          <img
            src="/camera_pov.png"
            alt=""
            className="relative z-[1] h-[90vh] w-auto max-w-[95vw] object-contain"
          />
        </div>
      </div>
      <HandOverlay
        gestureDeltaRef={gestureDeltaRef}
        onPictureFrame={onPictureFrame}
        onFistOpen={onFistOpen}
        onFocus={onFocus}
        cameraOverlayActive={cameraOverlayActive}
      />

      {/* Camera Equipment HUD - Minecraft-style armor slots */}
      <CameraEquipmentHUD position="left" />

      {/* Gallery button */}
      <NavButton
        ref={galleryBtnRef}
        href="/gallery"
        icon="gallery"
        label="Gallery"
        variant="overlay"
        className="absolute top-5 right-5 z-30"
        badgeCount={badgeCount}
        badgePulse={badgePulse}
      />

      {/* Photo fly animation */}
      {flyAnimation && (
        <PhotoFlyAnimation
          imageUrl={flyAnimation.imageUrl}
          fromRect={flyAnimation.fromRect}
          toRef={galleryBtnRef}
          onComplete={handleFlyComplete}
        />
      )}

      {/* Small camera overlay — always visible */}
      <img
        src="/camera_pov.png"
        alt=""
        className="pointer-events-none absolute bottom-8 left-1/2 z-10 w-48 -translate-x-1/2 object-contain"
        aria-hidden
      />
    </div>
  );
}
