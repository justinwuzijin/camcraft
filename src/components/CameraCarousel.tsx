"use client";

import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { Vector3, Object3D, Group } from "three";
import gsap from "gsap";
import Link from "next/link";

// Camera specs data for the exploded view panel
const CAMERA_SPECS: Record<string, { body: string; lens: string; focalLength: string; iso: string; sensor: string; resolution: string }> = {
  "sony-handycam": {
    body: "Sony DCR-TRV900",
    lens: "Carl Zeiss Vario-Sonnar",
    focalLength: "4.3-43mm",
    iso: "N/A (Gain control)",
    sensor: '1/3" 3-CCD',
    resolution: "530 TV lines",
  },
  "digital-camera": {
    body: "Compact Digital",
    lens: "Built-in zoom lens",
    focalLength: "35-105mm equiv.",
    iso: "100-400",
    sensor: '1/2.3" CCD',
    resolution: "5 Megapixels",
  },
  "fujifilm-xt2": {
    body: "Fujifilm X-T2",
    lens: "XF 18-55mm f/2.8-4",
    focalLength: "18-55mm",
    iso: "200-12800",
    sensor: "23.6x15.6mm X-Trans",
    resolution: "24.3 Megapixels",
  },
  "sony-a7iv": {
    body: "Sony α7 IV",
    lens: "FE 24-70mm f/2.8 GM",
    focalLength: "24-70mm",
    iso: "100-51200",
    sensor: "35mm Full-Frame BSI",
    resolution: "33 Megapixels",
  },
};

// Camera data in chronological order (oldest to newest)
// Initial rotations are set to match the screenshot orientations
const CAMERAS = [
  {
    id: "sony-handycam",
    name: "Sony Handycam",
    modelPath: "/sony_handycam_scan_4k8k.glb",
    date: "1995",
    description: "Camcorder",
    baseScale: 0.5,
    initialRotation: [0.1, -0.3, 0] as [number, number, number], // Slight angle
  },
  {
    id: "digital-camera",
    name: "Digital Camera",
    modelPath: "/digital_camera.glb",
    date: "2005",
    description: "Compact digital",
    baseScale: 1.4,
    initialRotation: [0.15, Math.PI - 0.4, 0] as [number, number, number], // Slight 3/4 angle
  },
  {
    id: "fujifilm-xt2",
    name: "Fujifilm X-T2",
    modelPath: "/fujifilm_x-t2_camera.glb",
    date: "2016",
    description: "APS-C mirrorless",
    baseScale: 4.5,
    initialRotation: [0.2, Math.PI / 3, 0] as [number, number, number], // Front facing with lens visible
  },
  {
    id: "sony-a7iv",
    name: "Sony A7IV",
    modelPath: "/a7iv.glb",
    date: "2021",
    description: "Full-frame mirrorless",
    baseScale: 0.5,
    initialRotation: [0.2, -0.5, 0] as [number, number, number], // Angled view with lens to left
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
  visible = true,
  initialRotation = [0, 0, 0],
}: {
  modelPath: string;
  position: [number, number, number];
  scale: number;
  opacity: number;
  baseScale?: number;
  onClick?: () => void;
  visible?: boolean;
  initialRotation?: [number, number, number];
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
            mat.opacity = visible ? opacity : 0;
            mat.needsUpdate = true;
          });
        }
      }
    });
  }, [clonedScene, opacity, visible]);

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

  if (!visible) return null;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={initialRotation}
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

// Interactive camera model with A7-specific explosion
const InteractiveCameraModel = ({
  modelPath,
  isExploded,
  isA7 = false,
  initialRotation = [0, 0, 0],
}: {
  modelPath: string;
  isExploded: boolean;
  isA7?: boolean;
  initialRotation?: [number, number, number];
}) => {
  const gltf = useGLTF(modelPath);
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<Group>(null);
  const explosionDataRef = useRef<Map<string, { original: Vector3; displaced: Vector3 }> | null>(null);
  const initializedRef = useRef(false);
  
  // Mouse drag state
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: initialRotation[0], y: initialRotation[1] });

  // Ensure full opacity on all materials (except hide Object_4002 for A7)
  useEffect(() => {
    clonedScene.traverse((object: Object3D) => {
      // Hide problematic parts for A7
      if (isA7 && object.name === "Object_4002") {
        object.visible = false;
        return;
      }
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
  }, [clonedScene, isA7]);

  // Initialize explosion data
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const data = new Map<string, { original: Vector3; displaced: Vector3 }>();

    if (isA7) {
      // A7-specific explosion: lens hood and barrel move forward
      const lensHoodParts = ["Object_4003", "Object_4004", "Object_4005"];
      const lensBarrelParts = ["Object_4007"];
      const explosionFactor = 2.5;

      clonedScene.traverse((object: Object3D) => {
        if (lensHoodParts.includes(object.name) || lensBarrelParts.includes(object.name)) {
          const originalPosition = object.position.clone();
          const displacement = originalPosition.clone();

          if (lensHoodParts.includes(object.name)) {
            displacement.z += explosionFactor * 4;
          } else if (lensBarrelParts.includes(object.name)) {
            displacement.z += explosionFactor * 2;
          }

          data.set(object.uuid, {
            original: originalPosition,
            displaced: displacement,
          });
        }
      });
    } else {
      // Generic explosion for other cameras
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
    }

    explosionDataRef.current = data;
  }, [clonedScene, isA7]);

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
        duration: 1.5,
        ease: "power2.inOut",
      });
    });
  }, [isExploded, clonedScene]);

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
      rotation={[rotation.current.x, rotation.current.y, initialRotation[2]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDragging.current = true;
        previousMouse.current = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = "grabbing";
      }}
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
  const groupRef = useRef<Group>(null);

  // Oval carousel parameters
  const radiusX = 5;
  const radiusZ = 2.5;
  const centerZ = -9;

  // Calculate positions for each camera in the oval
  const getCarouselPosition = (index: number, activeIndex: number, exploded: boolean) => {
    const totalItems = CAMERAS.length;
    const relativePos = (index - activeIndex + totalItems) % totalItems;
    const angle = (relativePos / totalItems) * Math.PI * 2;

    let x = Math.sin(angle) * radiusX;
    let z = Math.cos(angle) * radiusZ + centerZ;

    // When exploded, move active camera to the right and make it bigger
    if (exploded && relativePos === 0) {
      x = 4; // Move more to the right to accommodate larger size
      z = centerZ + 1; // Move slightly forward
    }

    const depthFactor = (1 - Math.cos(angle)) / 2;

    let scale: number;
    let opacity: number;

    if (relativePos === 0) {
      scale = exploded ? 1.2 : 0.7; // Much bigger when exploded
      opacity = 1;
    } else if (relativePos === 2) {
      scale = 0.35;
      opacity = 0.2;
    } else {
      scale = 0.45;
      opacity = 0.4;
    }

    const y = exploded && relativePos === 0 ? 0 : depthFactor * 0.5 - 0.3;

    return { position: [x, y, z] as [number, number, number], scale, opacity, depthFactor };
  };

  // Sort cameras by depth for rendering order
  const sortedCameras = useMemo(() => {
    return CAMERAS.map((cam, index) => ({
      ...cam,
      index,
      ...getCarouselPosition(index, currentIndex, isExploded),
    })).sort((a, b) => b.depthFactor - a.depthFactor);
  }, [currentIndex, isExploded]);

  // Set camera position
  useEffect(() => {
    camera.position.set(0, 0.5, 2);
    camera.lookAt(0, 0, -9);
  }, [camera]);

  const currentCam = CAMERAS[currentIndex];

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 5]} intensity={0.5} />
      <Environment preset="city" />

      {/* Render non-active cameras (hidden when exploded) */}
      {!isExploded && sortedCameras
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
            visible={!isExploded}
            initialRotation={cam.initialRotation}
          />
        ))}

      {/* Render active camera */}
      {sortedCameras
        .filter((cam) => cam.index === currentIndex)
        .map((cam) => {
          const finalScale = cam.scale * cam.baseScale;
          const isA7 = cam.id === "sony-a7iv";
          return (
            <group key={cam.id} position={cam.position} scale={[finalScale, finalScale, finalScale]}>
              <InteractiveCameraModel modelPath={cam.modelPath} isExploded={isExploded} isA7={isA7} initialRotation={cam.initialRotation} />
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

// Specs Panel Component
const SpecsPanel = ({ cameraId, visible }: { cameraId: string; visible: boolean }) => {
  const specs = CAMERA_SPECS[cameraId];
  if (!specs) return null;

  return (
    <div
      className={`absolute left-8 top-1/2 -translate-y-1/2 w-72 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-500 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 pointer-events-none"
      }`}
    >
      <h3 className="text-lg font-semibold text-white mb-4">Specifications</h3>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Camera Body</p>
          <p className="text-sm text-white">{specs.body}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Lens</p>
          <p className="text-sm text-white">{specs.lens}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Focal Length</p>
          <p className="text-sm text-white">{specs.focalLength}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">ISO Range</p>
          <p className="text-sm text-white">{specs.iso}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Sensor</p>
          <p className="text-sm text-white">{specs.sensor}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Resolution</p>
          <p className="text-sm text-white">{specs.resolution}</p>
        </div>
      </div>
    </div>
  );
};

export const CameraCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExploded, setIsExploded] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelTime = useRef(0);

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

  // Horizontal scroll (two-finger trackpad) handler
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only respond to horizontal scroll
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
      const now = Date.now();
      if (now - lastWheelTime.current > 300) { // Debounce
        lastWheelTime.current = now;
        if (e.deltaX > 0) {
          goNext();
        } else {
          goPrev();
        }
      }
    }
  }, [goNext, goPrev]);

  // Keyboard and wheel navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [goNext, goPrev, handleWheel]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-[#0A0A0A]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid background with low opacity */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-repeat opacity-20"
        style={{ backgroundImage: 'url(/grid-background.png)' }}
      />
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0.5, 2], fov: 55 }}>
        <Suspense fallback={null}>
          <CarouselScene currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} isExploded={isExploded} />
        </Suspense>
      </Canvas>

      {/* Specs Panel (visible when exploded) */}
      <SpecsPanel cameraId={currentCamera.id} visible={isExploded} />

      {/* Back button (top left, only when exploded) */}
      {isExploded && (
        <button
          onClick={() => setIsExploded(false)}
          className="absolute top-8 left-8 px-6 py-2.5 bg-[#B0FBCD]/10 hover:bg-[#B0FBCD]/20 border border-[#B0FBCD]/30 rounded-full text-[#B0FBCD] text-sm font-medium transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Camera name overlay (always visible, repositioned when exploded) */}
      <div className={`absolute text-center pointer-events-none transition-all duration-500 ${
        isExploded 
          ? "top-8 right-8 text-right" 
          : "top-24 left-1/2 -translate-x-1/2"
      }`}>
        <h1 className={`font-semibold text-white tracking-tight transition-all duration-300 ${
          isExploded ? "text-2xl" : "text-3xl md:text-4xl"
        }`}>
          {currentCamera.name}
        </h1>
        <p className="text-white/50 text-sm mt-1">{currentCamera.description}</p>
      </div>

      {/* Navigation arrows (hide when exploded) - just arrows, no background */}
      {!isExploded && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-2 hover:opacity-100 opacity-60 transition-opacity"
            aria-label="Previous camera"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={goNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:opacity-100 opacity-60 transition-opacity"
            aria-label="Next camera"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Explode button (when not exploded) / Try out button (when exploded) */}
      <div className="absolute bottom-40 left-1/2 -translate-x-1/2">
        {isExploded ? (
          <Link
            href="/generate"
            className="px-12 py-4 bg-[#B0FBCD]/20 hover:bg-[#B0FBCD]/30 border border-[#B0FBCD]/40 rounded-full text-[#B0FBCD] text-lg font-semibold transition-all duration-300 inline-block"
          >
            Try out
          </Link>
        ) : (
          <button
            onClick={() => setIsExploded(true)}
            className="px-8 py-3 bg-[#B0FBCD]/10 hover:bg-[#B0FBCD]/20 border border-[#B0FBCD]/30 rounded-full text-[#B0FBCD] text-sm font-medium transition-all duration-300"
          >
            Explode
          </button>
        )}
      </div>

      {/* Horizontal Timeline (hide when exploded) */}
      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-8 transition-opacity duration-300 ${isExploded ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="relative">
          <div className="absolute top-[10px] left-8 right-8 h-[1px] bg-white/20" />
          <div
            className="absolute top-[10px] left-8 h-[1px] bg-white/40 transition-all duration-500"
            style={{ width: `calc(${(currentIndex / (CAMERAS.length - 1)) * 100}% * 0.85)` }}
          />

          <div className="relative flex justify-between px-4">
            {CAMERAS.map((camera, index) => (
              <button
                key={camera.id}
                onClick={() => goToCamera(index)}
                className="flex flex-col items-center group"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-white scale-125"
                      : "bg-white/30 group-hover:bg-white/50"
                  }`}
                />
                <span
                  className={`mt-3 text-sm font-medium transition-all duration-300 ${
                    index === currentIndex ? "text-white" : "text-white/40 group-hover:text-white/60"
                  }`}
                >
                  {camera.date}
                </span>
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
