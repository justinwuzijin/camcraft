"use client";

import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Vector3, Object3D } from "three";
import gsap from "gsap";

interface ExplodedModelProps {
  modelPath: string;
  explosionCenter?: Vector3;
  explosionFactor?: number;
  duration?: number;
  // Names of objects to animate
  includeNames?: string[];
  isExploded: boolean;
}

export const ExplodedModel = ({
  modelPath,
  explosionCenter = new Vector3(0, 0, 0),
  explosionFactor = 2.5,
  duration = 1.5,
  // Lens barrel: Object_4007
  // Lens hood: Object_4003, Object_4004, Object_4005
  // Camera body stays stationary: Object_4, Object_4001, Object_4008, Object_4009
  // Hidden: Object_4002 (floating white button)
  includeNames = ["Object_4003", "Object_4004", "Object_4005", "Object_4007"],
  isExploded,
}: ExplodedModelProps) => {
  const gltf = useGLTF(modelPath);
  const animationDataRef = useRef<Map<string, { original: Vector3; displaced: Vector3 }> | null>(null);
  const initializedRef = useRef(false);

  // Initialize animation data ONCE on first render
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const data = new Map<string, { original: Vector3; displaced: Vector3 }>();
    
    // Hide problematic parts that don't belong
    const partsToHide = ["Object_4002"]; // White button
    gltf.scene.traverse((object: Object3D) => {
      if (partsToHide.includes(object.name)) {
        object.visible = false;
      }
    });
    
    // Define displacement amounts for each part
    const lensHoodParts = ["Object_4003", "Object_4004", "Object_4005"];
    const lensBarrelParts = ["Object_4007"];
    
    gltf.scene.traverse((object: Object3D) => {
      if (includeNames.includes(object.name)) {
        // Store the TRUE original position (only captured once!)
        const originalPosition = object.position.clone();
        const displacement = originalPosition.clone();

        // Lens hood moves furthest forward
        if (lensHoodParts.includes(object.name)) {
          displacement.z += explosionFactor * 4; // Move forward significantly
        }
        // Lens barrel moves forward but less than hood
        else if (lensBarrelParts.includes(object.name)) {
          displacement.z += explosionFactor * 2; // Move forward moderately
        }

        data.set(object.uuid, {
          original: originalPosition,
          displaced: displacement,
        });
      }
    });
    
    animationDataRef.current = data;
  }, [gltf.scene, explosionFactor, includeNames]);

  // Animate explosion/collapse when isExploded changes
  useEffect(() => {
    const animationData = animationDataRef.current;
    if (!animationData || animationData.size === 0) return;
    
    gltf.scene.traverse((object: Object3D) => {
      const target = animationData.get(object.uuid);
      if (!target) return;

      const targetPosition = isExploded ? target.displaced : target.original;

      // Kill any existing animations on this object
      gsap.killTweensOf(object.position);
      
      gsap.to(object.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: duration,
        ease: "power2.inOut",
      });
    });
  }, [isExploded, gltf.scene, duration]);

  return <primitive object={gltf.scene} />;
};

// Preload the model
useGLTF.preload("/a7iv.glb");
