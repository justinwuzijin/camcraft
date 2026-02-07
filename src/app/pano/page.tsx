"use client";

import dynamic from "next/dynamic";

const PanoViewer = dynamic(() => import("./PanoViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
      Loading panorama...
    </div>
  ),
});

export default function PanoPage() {
  return (
    <div className="relative w-full min-h-screen bg-black">
      <PanoViewer />
    </div>
  );
}
