"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

type PhotoFlyAnimationProps = {
  imageUrl: string;
  fromRect: DOMRect;
  toRef: React.RefObject<HTMLElement | null>;
  onComplete: () => void;
};

function FlyingPhoto({ imageUrl, fromRect, toRef, onComplete }: PhotoFlyAnimationProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    const target = toRef.current;
    if (!el || !target) {
      onComplete();
      return;
    }

    const toRect = target.getBoundingClientRect();

    // Start at the viewfinder position
    gsap.set(el, {
      position: "fixed",
      left: fromRect.left,
      top: fromRect.top,
      width: fromRect.width,
      height: fromRect.height,
      borderRadius: 4,
      border: "3px solid rgba(255,255,255,0.9)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      zIndex: 9999,
      pointerEvents: "none",
      overflow: "hidden",
    });

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete();
      },
    });

    // Brief hold + slight scale up (polaroid eject feel)
    tl.to(el, {
      scale: 1.05,
      duration: 0.1,
      ease: "power1.out",
    });

    // Fly to gallery button
    tl.to(el, {
      left: toRect.left + toRect.width / 2 - 12,
      top: toRect.top + toRect.height / 2 - 12,
      width: 24,
      height: 24,
      borderRadius: 12,
      scale: 1,
      opacity: 0.6,
      border: "2px solid rgba(176,251,205,0.8)",
      boxShadow: "0 0 16px rgba(176,251,205,0.4)",
      duration: 0.55,
      ease: "power2.inOut",
    });

    // Final flash/fade
    tl.to(el, {
      opacity: 0,
      scale: 0.5,
      duration: 0.15,
      ease: "power2.in",
    });

    return () => {
      tl.kill();
    };
  }, [fromRect, toRef, onComplete]);

  return (
    <div ref={elRef} style={{ position: "fixed", zIndex: 9999, pointerEvents: "none" }}>
      <img
        src={imageUrl}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}

export default function PhotoFlyAnimation(props: PhotoFlyAnimationProps) {
  if (typeof window === "undefined") return null;
  return createPortal(<FlyingPhoto {...props} />, document.body);
}
