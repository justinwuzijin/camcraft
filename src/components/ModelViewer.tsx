"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import { ExplodedModel } from "./ExplodedModel";
import { Vector3 } from "three";

interface ModelViewerProps {
  modelPath?: string;
  explosionCenter?: Vector3;
  explosionFactor?: number;
  duration?: number;
  includeNames?: string[];
}

export const ModelViewer = ({
  modelPath = "/a7iv.glb",
  explosionCenter,
  explosionFactor = 0.8,
  duration = 2,
  includeNames,
}: ModelViewerProps) => {
  const [isExploded, setIsExploded] = useState(false);

  return (
    <div className="relative h-screen w-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        className="bg-gradient-to-b from-zinc-900 to-zinc-950"
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          
          {/* Environment for reflections */}
          <Environment preset="city" />

          {/* Model with exploded view effect */}
          <Center>
            <ExplodedModel
              modelPath={modelPath}
              explosionCenter={explosionCenter}
              explosionFactor={explosionFactor}
              duration={duration}
              includeNames={includeNames}
              isExploded={isExploded}
            />
          </Center>

          {/* Camera controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={20}
          />
        </Suspense>
      </Canvas>

      {/* UI Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <button
          onClick={() => setIsExploded(!isExploded)}
          className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-all duration-300 shadow-lg"
        >
          {isExploded ? "Collapse" : "Explode"}
        </button>
      </div>

      {/* Info overlay */}
      <div className="absolute top-8 left-8 text-white/70 text-sm">
        <p>Drag to rotate • Scroll to zoom • Shift+drag to pan</p>
      </div>
    </div>
  );
};

export default ModelViewer;
