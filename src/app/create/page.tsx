"use client";

import dynamic from "next/dynamic";

// Dynamically import CameraCarousel with SSR disabled
// Three.js requires browser APIs that aren't available during server-side rendering
const CameraCarousel = dynamic(
  () => import("@/components/CameraCarousel").then((mod) => mod.CameraCarousel),
  { ssr: false }
);

export default function CreatePage() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <CameraCarousel />
    </main>
  );
}
