"use client";

import dynamic from "next/dynamic";

// Dynamically import ModelViewer with SSR disabled
// Three.js requires browser APIs that aren't available during server-side rendering
const ModelViewer = dynamic(
  () => import("@/components/ModelViewer").then((mod) => mod.ModelViewer),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <ModelViewer
        modelPath="/a7iv.glb"
        explosionFactor={2.5}
        duration={1.5}
      />
    </main>
  );
}
