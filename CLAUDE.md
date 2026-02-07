# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start development server (http://localhost:3000)
bun run build    # Build for production
bun run lint     # Run ESLint
bun start        # Start production server
```

No test framework is configured.

## Architecture

Next.js 16 app (App Router) with TypeScript, Tailwind CSS 4, and Three.js for 3D rendering. Uses Bun as the package manager/runtime.

### Routes

**`/` — 3D Exploded Camera Model Viewer**
- `src/components/ModelViewer.tsx`: R3F (React Three Fiber) Canvas with OrbitControls, lighting, and environment map. Renders the `ExplodedModel` with a toggle button.
- `src/components/ExplodedModel.tsx`: Loads a GLB model (`/a7iv.glb`) via `useGLTF`, stores original positions once, then animates specific named mesh parts (lens hood, barrel) along the z-axis using GSAP. Part names like `Object_4003` are hardcoded to the specific GLB.

**`/pano` — Panorama Viewer with Hand Gesture Control**
- `src/app/pano/PanoViewer.tsx`: Raw Three.js (not R3F) equirectangular panorama renderer. Uses a sphere mesh with inverted normals and OrbitControls. Reads rotation deltas from a shared ref each animation frame.
- `src/app/pano/HandOverlay.tsx`: Initializes MediaPipe HandLandmarker (loaded from CDN at runtime) on the webcam feed. Runs hand detection each frame, processes gestures, draws skeleton overlay on a full-screen canvas, and shows a debug log box.
- `src/app/pano/page.tsx`: Creates the shared `gestureDeltaRef` and manages the camera flash effect when a picture frame gesture fires.

### Gesture System (`src/app/pano/gestures/`)

Gesture logic is separated from the rendering/detection code:
- `types.ts`: `Landmark`/`HandLandmarks` types, `dist()` helper, and `HAND_LANDMARKS` index constants.
- `pinch.ts`: Detects thumb-to-index pinch. When pinching, hand movement translates to panorama rotation deltas via `ROTATE_SENSITIVITY`.
- `pictureFrame.ts`: Detects a two-handed "picture frame" gesture (thumb+index extended, other fingers curled on both hands). Requires holding the pose for `PICTURE_FRAME_HOLD_MS` (400ms) with a cooldown.

### Communication Pattern

The parent page creates a `gestureDeltaRef` (mutable ref object with `deltaAzimuth`/`deltaPolar`). HandOverlay writes gesture deltas into it; PanoViewer reads and zeroes them each frame. This avoids React re-renders for 60fps gesture data.

### Key Patterns

- **Dynamic imports with `ssr: false`**: Both `ModelViewer` and `PanoViewer` use `next/dynamic` since Three.js/R3F require browser APIs.
- **Two Three.js approaches**: Home page uses React Three Fiber (`@react-three/fiber` + `@react-three/drei`). Pano page uses raw Three.js directly. Be consistent with whichever approach the target route uses.
- **MediaPipe loaded from CDN**: WASM and model files are loaded from `cdn.jsdelivr.net` and `storage.googleapis.com` at runtime, not bundled.

## Path Alias

`@/*` maps to `./src/*`
