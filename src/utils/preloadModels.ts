// Preload 3D camera models for faster loading
// This can be called from any page to start loading models in the background

const MODEL_PATHS = [
  "/sony_handycam_scan_4k8k.glb",
  "/digital_camera.glb",
  "/fujifilm_x-t2_camera.glb",
  "/a7iv.glb",
];

let preloaded = false;

export function preloadCameraModels() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;

  // Use native fetch to preload models into browser cache
  MODEL_PATHS.forEach((path) => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = path;
    link.as = "fetch";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  });

  // Also start loading with fetch to warm the cache
  MODEL_PATHS.forEach((path) => {
    fetch(path, { mode: "cors" })
      .then((res) => res.blob())
      .catch(() => {}); // Silently ignore errors
  });
}

// Preload on hover - useful for buttons
export function preloadOnHover(element: HTMLElement | null) {
  if (!element) return;
  
  const handler = () => {
    preloadCameraModels();
    element.removeEventListener("mouseenter", handler);
  };
  
  element.addEventListener("mouseenter", handler);
  return () => element.removeEventListener("mouseenter", handler);
}
