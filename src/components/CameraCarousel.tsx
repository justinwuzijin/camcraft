"use client";

import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { Vector3, Object3D, Group } from "three";
import gsap from "gsap";

// Camera data in chronological order (oldest to newest)
const CAMERAS = [
  {
    id: "sony-handycam",
    name: "Sony Handycam",
    modelPath: "/sony_handycam_scan_4k8k.glb",
    date: "1995",
    description: "Camcorder",
    baseScale: 0.5,
  },
  {
    id: "digital-camera",
    name: "Digital Camera",
    modelPath: "/digital_camera.glb",
    date: "2005",
    description: "Compact digital",
    baseScale: 2.0,
  },
  {
    id: "fujifilm-xt2",
    name: "Fujifilm X-T2",
    modelPath: "/fujifilm_x-t2_camera.glb",
    date: "2016",
    description: "APS-C mirrorless",
    baseScale: 2.5,
  },
  {
    id: "sony-a7iv",
    name: "Sony A7IV",
    modelPath: "/a7iv.glb",
    date: "2021",
    description: "Full-frame mirrorless",
    baseScale: 0.4,
  },
];

// Static camera model (no interaction, but clickable to select)
const StaticCameraModel = ({
  modelPath,
  position,
  scale,
  opacity,
  baseScale = 1,
  onClick,
}: {
  modelPath: string;
  position: [number, number, number];
  scale: number;
  opacity: number;
  baseScale?: number;
  onClick?: () => void;
}) => {
  const finalScale = scale * baseScale;
  const gltf = useGLTF(modelPath);
  const groupRef = useRef<Group>(null);
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Set opacity on all materials
  useEffect(() => {
    clonedScene.traverse((object: Object3D) => {
      if ((object as any).isMesh) {
        const mesh = object as any;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat: any) => {
            mat.transparent = true;
            mat.opacity = opacity;
            mat.needsUpdate = true;
          });
        }
      }
    });
  }, [clonedScene, opacity]);

  // Animate position and scale
  useEffect(() => {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration: 0.8,
      ease: "power2.out",
    });
    gsap.to(groupRef.current.scale, {
      x: finalScale,
      y: finalScale,
      z: finalScale,
      duration: 0.8,
      ease: "power2.out",
    });
  }, [position, finalScale]);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={[finalScale, finalScale, finalScale]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

// Interactive camera model (rotatable with mouse, explosion capability)
const InteractiveCameraModel = ({
  modelPath,
  isExploded,
}: {
  modelPath: string;
  isExploded: boolean;
}) => {
  const gltf = useGLTF(modelPath);
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<Group>(null);
  const explosionDataRef = useRef<Map<string, { original: Vector3; displaced: Vector3 }> | null>(null);
  const initializedRef = useRef(false);
  
  // Mouse drag state
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0, y: 0 });

  // Ensure full opacity on all materials
  useEffect(() => {
    clonedScene.traverse((object: Object3D) => {
      if ((object as any).isMesh) {
        const mesh = object as any;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat: any) => {
            mat.transparent = false;
            mat.opacity = 1;
            mat.needsUpdate = true;
          });
        }
      }
    });
  }, [clonedScene]);

  // Initialize explosion data
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const data = new Map<string, { original: Vector3; displaced: Vector3 }>();
    const meshes: Object3D[] = [];

    clonedScene.traverse((object: Object3D) => {
      if ((object as any).isMesh) {
        meshes.push(object);
      }
    });

    const center = new Vector3();
    meshes.forEach((mesh) => center.add(mesh.position));
    center.divideScalar(meshes.length || 1);

    meshes.forEach((mesh) => {
      const originalPosition = mesh.position.clone();
      const direction = originalPosition.clone().sub(center).normalize();
      if (direction.length() === 0) {
        direction.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      }
      const displaced = originalPosition.clone().add(direction.multiplyScalar(1.5));
      data.set(mesh.uuid, { original: originalPosition.clone(), displaced });
    });

    explosionDataRef.current = data;
  }, [clonedScene]);

  // Animate explosion
  useEffect(() => {
    const animationData = explosionDataRef.current;
    if (!animationData || animationData.size === 0) return;

    clonedScene.traverse((object: Object3D) => {
      const target = animationData.get(object.uuid);
      if (!target) return;
      const targetPosition = isExploded ? target.displaced : target.original;
      gsap.killTweensOf(object.position);
      gsap.to(object.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 1.2,
        ease: "power2.inOut",
      });
    });
  }, [isExploded, clonedScene]);

  // Handle mouse events for rotation
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    previousMouse.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = "grabbing";
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    document.body.style.cursor = "grab";
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current || !groupRef.current) return;
    
    const deltaX = e.clientX - previousMouse.current.x;
    const deltaY = e.clientY - previousMouse.current.y;
    
    rotation.current.y += deltaX * 0.01;
    rotation.current.x += deltaY * 0.01;
    
    // Clamp vertical rotation
    rotation.current.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotation.current.x));
    
    groupRef.current.rotation.y = rotation.current.y;
    groupRef.current.rotation.x = rotation.current.x;
    
    previousMouse.current = { x: e.clientX, y: e.clientY };
  };

  // Add global mouse event listeners
  useEffect(() => {
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "auto";
      }
    };
    
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !groupRef.current) return;
      
      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;
      
      rotation.current.y += deltaX * 0.01;
      rotation.current.x += deltaY * 0.01;
      rotation.current.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotation.current.x));
      
      groupRef.current.rotation.y = rotation.current.y;
      groupRef.current.rotation.x = rotation.current.x;
      
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={() => {
        if (!isDragging.current) document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (!isDragging.current) document.body.style.cursor = "auto";
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

// Carousel scene with all cameras
const CarouselScene = ({
  currentIndex,
  setCurrentIndex,
  isExploded,
}: {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  isExploded: boolean;
}) => {
  const { camera } = useThree();

  // Oval carousel parameters
  const radiusX = 5;
  const radiusZ = 2.5;
  const centerZ = -9;

  // Calculate positions for each camera in the oval
  const getCarouselPosition = (index: number, activeIndex: number) => {
    const totalItems = CAMERAS.length;
    const relativePos = (index - activeIndex + totalItems) % totalItems;
    const angle = (relativePos / totalItems) * Math.PI * 2;

    const x = Math.sin(angle) * radiusX;
    const z = Math.cos(angle) * radiusZ + centerZ;

    // Depth factor: 0 = front, 1 = back
    const depthFactor = (1 - Math.cos(angle)) / 2;

    // Scale and opacity based on position (matching Figma opacities)
    let scale: number;
    let opacity: number;

    if (relativePos === 0) {
      // Front/active
      scale = 0.7;
      opacity = 1;
    } else if (relativePos === 2) {
      // Back
      scale = 0.35;
      opacity = 0.2;
    } else {
      // Sides (left and right)
      scale = 0.45;
      opacity = 0.4;
    }

    const y = depthFactor * 0.5 - 0.3;

    return { position: [x, y, z] as [number, number, number], scale, opacity, depthFactor };
  };

  // Sort cameras by depth for rendering order
  const sortedCameras = useMemo(() => {
    return CAMERAS.map((cam, index) => ({
      ...cam,
      index,
      ...getCarouselPosition(index, currentIndex),
    })).sort((a, b) => b.depthFactor - a.depthFactor); // Back first, front last
  }, [currentIndex]);

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 0.5, 2);
    camera.lookAt(0, 0, -9);
  }, [camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 5]} intensity={0.5} />
      <Environment preset="city" />

      {/* Render non-active cameras (static but clickable) */}
      {sortedCameras
        .filter((cam) => cam.index !== currentIndex)
        .map((cam) => (
          <StaticCameraModel
            key={cam.id}
            modelPath={cam.modelPath}
            position={cam.position}
            scale={cam.scale}
            opacity={cam.opacity}
            baseScale={cam.baseScale}
            onClick={() => setCurrentIndex(cam.index)}
          />
        ))}

      {/* Render active camera (interactive - can be rotated with mouse) */}
      {sortedCameras
        .filter((cam) => cam.index === currentIndex)
        .map((cam) => {
          const finalScale = cam.scale * cam.baseScale;
          return (
            <group key={cam.id} position={cam.position} scale={[finalScale, finalScale, finalScale]}>
              <InteractiveCameraModel modelPath={cam.modelPath} isExploded={isExploded} />
            </group>
          );
        })}
    </>
  );
};

// Preload all models
CAMERAS.forEach((camera) => {
  useGLTF.preload(camera.modelPath);
});

export const CameraCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExploded, setIsExploded] = useState(false);

  // Touch handling for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCamera = CAMERAS[currentIndex];

  const goToCamera = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      setIsExploded(false);
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  const goNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % CAMERAS.length;
    goToCamera(nextIndex);
  }, [currentIndex, goToCamera]);

  const goPrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + CAMERAS.length) % CAMERAS.length;
    goToCamera(prevIndex);
  }, [currentIndex, goToCamera]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-[#0A0A0A]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0.5, 2], fov: 55 }}>
        <Suspense fallback={null}>
          <CarouselScene currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} isExploded={isExploded} />
        </Suspense>
      </Canvas>

      {/* Camera name overlay */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
          {currentCamera.name}
        </h1>
        <p className="text-white/50 text-sm mt-1">{currentCamera.description}</p>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10"
        aria-label="Previous camera"
      >
        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goNext}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10"
        aria-label="Next camera"
      >
        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Explode button */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
        <button
          onClick={() => setIsExploded(!isExploded)}
          className="px-8 py-3 bg-[#B0FBCD]/10 hover:bg-[#B0FBCD]/20 border border-[#B0FBCD]/30 rounded-full text-[#B0FBCD] text-sm font-medium transition-all duration-300"
        >
          {isExploded ? "Collapse" : "Explode"}
        </button>
      </div>

      {/* Horizontal Timeline */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-8">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-[10px] left-8 right-8 h-[1px] bg-white/20" />

          {/* Progress line */}
          <div
            className="absolute top-[10px] left-8 h-[1px] bg-[#FBF4B0]/60 transition-all duration-500"
            style={{ width: `calc(${(currentIndex / (CAMERAS.length - 1)) * 100}% * 0.85)` }}
          />

          {/* Timeline dots */}
          <div className="relative flex justify-between px-4">
            {CAMERAS.map((camera, index) => (
              <button
                key={camera.id}
                onClick={() => goToCamera(index)}
                className="flex flex-col items-center group"
              >
                {/* Dot */}
                <div
                  className={`w-5 h-5 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-white scale-125"
                      : "bg-white/30 group-hover:bg-white/50"
                  }`}
                />

                {/* Date label */}
                <span
                  className={`mt-3 text-sm font-medium transition-all duration-300 ${
                    index === currentIndex ? "text-white" : "text-white/40 group-hover:text-white/60"
                  }`}
                >
                  {camera.date}
                </span>

                {/* Camera name - only show for active */}
                {index === currentIndex && (
                  <span className="mt-1 text-xs text-white/60">
                    {camera.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCarousel;
