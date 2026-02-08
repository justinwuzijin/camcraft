"use client";

import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, useGLTF, Html } from "@react-three/drei";
import { Vector3, Object3D, Group } from "three";
import gsap from "gsap";
import Link from "next/link";
import dynamic from "next/dynamic";

const CameraEquipmentHUD = dynamic(
  () => import("@/components/CameraEquipmentHUD"),
  { ssr: false }
);

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

// Equipment loadouts for each camera (for the Minecraft-style HUD)
import type { CameraLoadout } from "@/components/CameraEquipmentHUD";

const CAMERA_EQUIPMENT: Record<string, CameraLoadout> = {
  "sony-handycam": {
    body: {
      id: "sony-handycam",
      name: "Sony DCR-TRV900",
      icon: null,
      modelPath: "/sony_handycam_scan_4k8k.glb",
      equipped: true,
      stats: [
        { label: "Sensor", value: '1/3" 3-CCD' },
        { label: "Resolution", value: "530 lines" },
      ],
    },
    lens: {
      id: "zeiss-vario",
      name: "Carl Zeiss Vario-Sonnar",
      icon: null,
      modelPath: "/sony_handycam_scan_4k8k.glb",
      equipped: true,
      stats: [
        { label: "Focal", value: "4.3-43mm" },
        { label: "Zoom", value: "10x Optical" },
      ],
    },
    accessory1: {
      id: "tape",
      name: "MiniDV Tape",
      icon: null,
      equipped: true,
      stats: [{ label: "Duration", value: "60 min" }],
    },
    accessory2: { id: "none", name: "Empty Slot", icon: null, equipped: false },
  },
  "digital-camera": {
    body: {
      id: "digital-camera",
      name: "Compact Digital",
      icon: null,
      modelPath: "/digital_camera.glb",
      equipped: true,
      stats: [
        { label: "Sensor", value: '1/2.3" CCD' },
        { label: "Resolution", value: "5 MP" },
      ],
    },
    lens: {
      id: "builtin",
      name: "Built-in Zoom",
      icon: null,
      modelPath: "/digital_camera.glb",
      equipped: true,
      stats: [
        { label: "Focal", value: "35-105mm" },
        { label: "Zoom", value: "3x" },
      ],
    },
    accessory1: {
      id: "flash",
      name: "Built-in Flash",
      icon: null,
      equipped: true,
      stats: [{ label: "Range", value: "3m" }],
    },
    accessory2: { id: "none", name: "Empty Slot", icon: null, equipped: false },
  },
  "fujifilm-xt2": {
    body: {
      id: "fujifilm-xt2",
      name: "Fujifilm X-T2",
      icon: null,
      modelPath: "/fujifilm_x-t2_camera.glb",
      equipped: true,
      stats: [
        { label: "Sensor", value: "24.3MP APS-C" },
        { label: "ISO", value: "200-12800" },
      ],
    },
    lens: {
      id: "xf-18-55",
      name: "XF 18-55mm f/2.8-4",
      icon: null,
      modelPath: "/fujifilm_x-t2_camera.glb",
      equipped: true,
      stats: [
        { label: "Focal", value: "18-55mm" },
        { label: "Aperture", value: "f/2.8-4" },
      ],
    },
    accessory1: { id: "none", name: "Empty Slot", icon: null, equipped: false },
    accessory2: { id: "none", name: "Empty Slot", icon: null, equipped: false },
  },
  "sony-a7iv": {
    body: {
      id: "sony-a7iv",
      name: "Sony α7 IV",
      icon: null,
      modelPath: "/a7iv.glb",
      equipped: true,
      stats: [
        { label: "Sensor", value: "33MP FF" },
        { label: "ISO", value: "100-51200" },
      ],
    },
    lens: {
      id: "fe-24-70",
      name: "FE 24-70mm f/2.8 GM",
      icon: null,
      modelPath: "/a7iv.glb",
      equipped: true,
      stats: [
        { label: "Focal", value: "24-70mm" },
        { label: "Aperture", value: "f/2.8" },
      ],
    },
    accessory1: { id: "none", name: "Empty Slot", icon: null, equipped: false },
    accessory2: { id: "none", name: "Empty Slot", icon: null, equipped: false },
  },
};

// Part labels for exploded view - each camera has labels that track with 3D rotation
const PART_LABELS: Record<string, { name: string; fact: string; position: [number, number, number] }[]> = {
  "sony-a7iv": [
    { name: "Lens Hood", fact: "Reduces lens flare and protects the front element", position: [-0.3, 0.4, 5] },
    { name: "Lens Barrel", fact: "Houses 18 elements in 14 groups for sharp optics", position: [0.3, -0.4, 2] },
    { name: "Camera Body", fact: "33MP full-frame sensor with 5-axis stabilization", position: [1.5, 0.5, -1] },
  ],
  "sony-handycam": [
    { name: "Viewfinder", fact: 'Electronic viewfinder with 0.44" LCD', position: [0.8, 0.8, 0] },
    { name: "Lens Assembly", fact: "Carl Zeiss optics with 10x optical zoom", position: [-1, 0, 1.5] },
    { name: "Tape Deck", fact: "Records to MiniDV tape at 500 lines resolution", position: [1, -0.5, -1] },
  ],
  "digital-camera": [
    { name: "Flash Unit", fact: "Built-in flash with 3m effective range", position: [-0.8, 0.6, 0] },
    { name: "Lens", fact: "3x optical zoom with macro mode", position: [0.8, 0, 1.5] },
    { name: "LCD Screen", fact: "2.5 inch display with 230K dots", position: [1, -0.3, -1] },
  ],
  "fujifilm-xt2": [
    { name: "EVF", fact: "2.36M-dot OLED with 0.77x magnification", position: [-0.8, 0.8, 0] },
    { name: "Lens Mount", fact: "Fujifilm X-mount with 17.7mm flange distance", position: [0.8, 0, 1.5] },
    { name: "Grip", fact: "Deep ergonomic grip for stable handling", position: [1.2, -0.3, -0.5] },
  ],
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
  canExplode = false,
  initialRotation = [0, 0, 0],
  cameraId,
}: {
  modelPath: string;
  isExploded: boolean;
  isA7?: boolean;
  canExplode?: boolean;
  initialRotation?: [number, number, number];
  cameraId: string;
}) => {
  // Get labels for this camera
  const labels = PART_LABELS[cameraId] || [];
  const gltf = useGLTF(modelPath);
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<Group>(null);
  const explosionDataRef = useRef<Map<string, { original: Vector3; displaced: Vector3 }> | null>(null);
  const initializedRef = useRef(false);
  
  // Mouse drag state
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: initialRotation[0], y: initialRotation[1] });
  
  // Exploded view rotation for A7IV (sideways to show lens separation)
  const explodedRotation = { x: 0.1, y: -1.4 };

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

  // Initialize explosion data (only for cameras that can explode)
  useEffect(() => {
    if (initializedRef.current || !canExplode) return;
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
    }

    explosionDataRef.current = data;
  }, [clonedScene, isA7, canExplode]);

  // Animate explosion (only for cameras that can explode)
  useEffect(() => {
    if (!canExplode) return;
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
  }, [isExploded, clonedScene, canExplode]);

  // Animate rotation to sideways view when exploded (A7IV only)
  useEffect(() => {
    if (!canExplode || !groupRef.current) return;
    
    const targetRotation = isExploded ? explodedRotation : { x: initialRotation[0], y: initialRotation[1] };
    
    gsap.to(rotation.current, {
      x: targetRotation.x,
      y: targetRotation.y,
      duration: 1.2,
      ease: "power2.inOut",
      onUpdate: () => {
        if (groupRef.current) {
          groupRef.current.rotation.x = rotation.current.x;
          groupRef.current.rotation.y = rotation.current.y;
        }
      },
    });
  }, [isExploded, canExplode, initialRotation]);

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

      {/* Part labels - only visible when exploded and camera can explode */}
      {isExploded && canExplode && labels.map((label, index) => (
        <Html
          key={index}
          position={label.position}
          center
          distanceFactor={10}
          style={{
            transition: 'opacity 0.5s ease',
            opacity: isExploded ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          <div className="relative min-w-[130px] max-w-[180px]">
            {/* Viewfinder corner marks */}
            <div className="absolute -top-px -left-px w-2.5 h-2.5">
              <div className="absolute top-0 left-0 w-full h-px bg-[#B0FBCD]/30" />
              <div className="absolute top-0 left-0 h-full w-px bg-[#B0FBCD]/30" />
            </div>
            <div className="absolute -top-px -right-px w-2.5 h-2.5">
              <div className="absolute top-0 right-0 w-full h-px bg-[#B0FBCD]/30" />
              <div className="absolute top-0 right-0 h-full w-px bg-[#B0FBCD]/30" />
            </div>
            <div className="absolute -bottom-px -left-px w-2.5 h-2.5">
              <div className="absolute bottom-0 left-0 w-full h-px bg-[#B0FBCD]/30" />
              <div className="absolute bottom-0 left-0 h-full w-px bg-[#B0FBCD]/30" />
            </div>
            <div className="absolute -bottom-px -right-px w-2.5 h-2.5">
              <div className="absolute bottom-0 right-0 w-full h-px bg-[#B0FBCD]/30" />
              <div className="absolute bottom-0 right-0 h-full w-px bg-[#B0FBCD]/30" />
            </div>

            <div className="bg-[#050507]/90 backdrop-blur-md border border-white/[0.06] px-3 py-2.5">
              <p className="text-[11px] tracking-[0.15em] uppercase text-[#B0FBCD]/70" style={{ fontFamily: 'var(--font-geist-mono)' }}>{label.name}</p>
              <p className="text-[10px] leading-relaxed text-white/30 mt-1" style={{ fontFamily: 'var(--font-geist-mono)' }}>{label.fact}</p>
            </div>
          </div>
        </Html>
      ))}
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

    // When exploded, move active camera to center-right and slightly down
    if (exploded && relativePos === 0) {
      x = 2.5; // Move to center-right, aligned better with specs panel
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

    const y = exploded && relativePos === 0 ? -0.2 : depthFactor * 0.5 - 0.3;

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
              <InteractiveCameraModel modelPath={cam.modelPath} isExploded={isExploded} isA7={isA7} canExplode={isA7} initialRotation={cam.initialRotation} cameraId={cam.id} />
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

// Specs Panel Component - larger for exploded view
const SpecsPanel = ({ cameraId, visible }: { cameraId: string; visible: boolean }) => {
  const specs = CAMERA_SPECS[cameraId];
  if (!specs) return null;

  const specRows = [
    { label: "Body", value: specs.body },
    { label: "Lens", value: specs.lens },
    { label: "Focal Length", value: specs.focalLength, mono: true },
    { label: "ISO", value: specs.iso, mono: true },
    { label: "Sensor", value: specs.sensor },
    { label: "Resolution", value: specs.resolution, mono: true },
  ];

  return (
    <div
      className={`absolute left-[8%] top-1/2 -translate-y-1/2 w-[420px] bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/[0.06] rounded-xl p-8 transition-all duration-500 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 pointer-events-none"
      }`}
    >
      <div
        className="text-xs tracking-[0.25em] uppercase text-white/25 mb-6"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        Specifications
      </div>

      <div className="space-y-4">
        {specRows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-6">
              <span className="text-sm text-white/30 shrink-0">{row.label}</span>
              <span
                className="text-base text-white/75 text-right"
                style={row.mono ? { fontFamily: "var(--font-geist-mono)" } : undefined}
              >
                {row.value}
              </span>
            </div>
            {i === 1 && <div className="h-px bg-white/[0.06] mt-4" />}
          </div>
        ))}
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
      className="relative h-screen w-full overflow-hidden bg-[#060608]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
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
          className="absolute top-6 left-6 z-30 ml-12 sm:ml-14 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.06] px-4 py-2 text-sm text-white/60 hover:text-white/80 hover:bg-black/80 transition-all"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-xs tracking-wider"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Back
          </span>
        </button>
      )}

      {/* Camera name overlay (always visible, repositioned when exploded) */}
      <div className={`absolute pointer-events-none transition-all duration-500 ${
        isExploded
          ? "top-24 right-6 text-right"
          : "top-20 left-1/2 -translate-x-1/2 text-center"
      }`}>
        <div
          className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-1.5"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {currentCamera.date}
        </div>
        <h1
          className={`text-white/90 font-light tracking-tight transition-all duration-300 ${
            isExploded ? "text-xl" : "text-2xl md:text-3xl"
          }`}
        >
          {currentCamera.name}
        </h1>
        <p
          className="text-white/30 mt-1 text-[10px] tracking-[0.2em] uppercase"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {currentCamera.description}
        </p>
      </div>

      {/* Camera Equipment HUD - Minecraft-style (visible when exploded) */}
      {isExploded && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 transition-all duration-500 animate-in fade-in slide-in-from-right-4 rounded-xl border border-white/[0.06] bg-[#0a0a0c]/60 backdrop-blur-md">
          <CameraEquipmentHUD
            loadout={CAMERA_EQUIPMENT[currentCamera.id]}
            position="right"
            className="!relative !translate-y-0 !right-0 !left-0"
          />
        </div>
      )}

      {/* Navigation arrows (hide when exploded) */}
      {!isExploded && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full border border-white/[0.06] bg-black/40 p-2.5 text-white/40 backdrop-blur-md transition-all hover:border-white/[0.12] hover:text-white/70 sm:left-6"
            aria-label="Previous camera"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={goNext}
            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-white/[0.06] bg-black/40 p-2.5 text-white/40 backdrop-blur-md transition-all hover:border-white/[0.12] hover:text-white/70 sm:right-6"
            aria-label="Next camera"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {/* Explode button (when not exploded) / Try out button (when exploded) */}
      <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20">
        {isExploded ? (
          <Link
            href="/generate"
            className="group relative inline-block px-10 py-3.5 bg-[#B0FBCD]/[0.08] hover:bg-[#B0FBCD]/[0.14] border border-[#B0FBCD]/20 hover:border-[#B0FBCD]/35 rounded-lg text-[#B0FBCD]/80 hover:text-[#B0FBCD] text-sm tracking-wider uppercase transition-all duration-300"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: "0 0 40px rgba(176, 251, 205, 0.08)" }} />
            <span className="relative">Try Out</span>
          </Link>
        ) : (
          <button
            onClick={() => setIsExploded(true)}
            className="px-8 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-lg text-white/50 hover:text-white/70 text-xs tracking-[0.2em] uppercase transition-all duration-300"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Explode
          </button>
        )}
      </div>

      {/* Horizontal Timeline (hide when exploded) */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-8 transition-opacity duration-300 ${isExploded ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {/* Gradient fade lines */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        <div className="relative">
          {/* Track */}
          <div className="absolute top-[5px] left-8 right-8 h-px bg-white/[0.06]" />
          <div
            className="absolute top-[5px] left-8 h-px bg-[#B0FBCD]/30 transition-all duration-500"
            style={{ width: `calc(${(currentIndex / (CAMERAS.length - 1)) * 100}% * 0.85)` }}
          />

          <div className="relative flex justify-between px-4">
            {CAMERAS.map((camera, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={camera.id}
                  onClick={() => goToCamera(index)}
                  className="flex flex-col items-center group"
                >
                  <div className="relative">
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? "bg-[#B0FBCD] scale-125"
                          : "bg-white/15 group-hover:bg-white/30"
                      }`}
                    />
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-[#B0FBCD]/30 animate-ping" />
                    )}
                  </div>
                  <span
                    className={`mt-3 text-[10px] tracking-[0.15em] transition-all duration-300 ${
                      isActive ? "text-white/70" : "text-white/25 group-hover:text-white/40"
                    }`}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {camera.date}
                  </span>
                  {isActive && (
                    <span
                      className="mt-0.5 text-[9px] tracking-[0.2em] uppercase text-white/30"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {camera.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCarousel;
