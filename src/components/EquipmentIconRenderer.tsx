"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

// Model component that renders and captures
const ModelCapture = ({
  modelPath,
  onCapture,
  scale = 1,
  rotation = [0.2, -0.5, 0],
}: {
  modelPath: string;
  onCapture: (dataUrl: string) => void;
  scale?: number;
  rotation?: [number, number, number];
}) => {
  const { scene } = useGLTF(modelPath);
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [captured, setCaptured] = useState(false);

  // Center the model
  useEffect(() => {
    if (!groupRef.current) return;
    
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Normalize scale
    const normalizedScale = (2 / maxDim) * scale;
    groupRef.current.scale.setScalar(normalizedScale);
    groupRef.current.position.set(-center.x * normalizedScale, -center.y * normalizedScale, -center.z * normalizedScale);
  }, [scene, scale]);

  // Capture after render
  useFrame(() => {
    if (captured) return;
    
    // Wait a frame for everything to render
    setTimeout(() => {
      const dataUrl = gl.domElement.toDataURL("image/png");
      onCapture(dataUrl);
      setCaptured(true);
    }, 100);
  });

  return (
    <group ref={groupRef} rotation={rotation}>
      <primitive object={scene.clone()} />
    </group>
  );
};

interface EquipmentIconRendererProps {
  modelPath: string;
  onIconGenerated: (dataUrl: string) => void;
  size?: number;
  scale?: number;
  rotation?: [number, number, number];
}

export default function EquipmentIconRenderer({
  modelPath,
  onIconGenerated,
  size = 128,
  scale = 1,
  rotation = [0.2, -0.5, 0],
}: EquipmentIconRendererProps) {
  const [isRendering, setIsRendering] = useState(true);

  const handleCapture = (dataUrl: string) => {
    onIconGenerated(dataUrl);
    setIsRendering(false);
  };

  if (!isRendering) return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "absolute",
        left: -9999,
        top: -9999,
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        camera={{ position: [0, 0, 3], fov: 45 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <Environment preset="studio" />
        <ModelCapture
          modelPath={modelPath}
          onCapture={handleCapture}
          scale={scale}
          rotation={rotation}
        />
      </Canvas>
    </div>
  );
}

// Hook to generate equipment icon
export function useEquipmentIcon(modelPath: string | null) {
  const [icon, setIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!modelPath) return;
    setIsLoading(true);
  }, [modelPath]);

  const handleGenerated = (dataUrl: string) => {
    setIcon(dataUrl);
    setIsLoading(false);
  };

  return { icon, isLoading, handleGenerated };
}
