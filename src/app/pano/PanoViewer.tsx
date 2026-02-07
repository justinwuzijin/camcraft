"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const PANO_PATH = "/pano_test2.png";

export default function PanoViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

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
    const texture = textureLoader.load(PANO_PATH, undefined, undefined, (err) => {
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

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
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
