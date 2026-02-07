"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const PANO_PATH = "/pano_test2.png";

export type GestureDeltaRef = React.MutableRefObject<{
  deltaAzimuth: number;
  deltaPolar: number;
} | null>;

type PanoViewerProps = {
  gestureDeltaRef?: GestureDeltaRef;
  panoUrl?: string;
};

const GESTURE_ROTATE_SCALE = 2;

export default function PanoViewer({ gestureDeltaRef, panoUrl }: PanoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureRefRef = useRef(gestureDeltaRef);
  gestureRefRef.current = gestureDeltaRef;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    const textureSrc = panoUrl || PANO_PATH;
    const texture = textureLoader.load(textureSrc, undefined, undefined, (err) => {
      console.error("Failed to load panorama:", err);
    });
    texture.mapping = THREE.EquirectangularReflectionMapping;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 0, -1);

    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    window.addEventListener("resize", onResize);

    const offset = new THREE.Vector3();
    const spherical = new THREE.Spherical();

    let rafId = 0;
    function animate() {
      const ref = gestureRefRef.current?.current;
      if (ref && (ref.deltaAzimuth !== 0 || ref.deltaPolar !== 0)) {
        const scale = GESTURE_ROTATE_SCALE;
        // Compute current spherical position relative to target
        offset.copy(camera.position).sub(controls.target);
        spherical.setFromVector3(offset);
        // Apply gesture deltas directly
        spherical.theta -= ref.deltaAzimuth * scale;
        spherical.phi -= ref.deltaPolar * scale;
        spherical.phi = Math.max(
          controls.minPolarAngle,
          Math.min(controls.maxPolarAngle, spherical.phi)
        );
        spherical.makeSafe();
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        camera.lookAt(controls.target);
        ref.deltaAzimuth = 0;
        ref.deltaPolar = 0;
      }
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      texture.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full min-h-screen"
      style={{ touchAction: "none" }}
    />
  );
}
