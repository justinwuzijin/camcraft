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

## Environment

Requires `GEMINI_API_KEY` in `.env` (or `.env.local`) for the `/generate` route's panorama generation API.

## Architecture

Next.js 16 app (App Router) with TypeScript, Tailwind CSS 4, and Three.js for 3D rendering. Uses Bun as the package manager/runtime.

### Routes

**`/` — 3D Camera Carousel**
- `src/components/CameraCarousel.tsx`: R3F carousel displaying four camera models (Handycam → Digital → Fujifilm X-T2 → Sony A7IV) on an oval path. Each camera has a `CAMERAS` config (id, GLB path, scale, date) and matching `CAMERA_SPECS` for the specs panel. Navigation via arrows, keyboard, touch swipe, or trackpad horizontal scroll. The "Explode" button triggers per-model explosion animations: A7IV has hardcoded part names (`Object_4003`, etc.) for lens separation, other models use a generic radial explosion from mesh centroid. All animations use GSAP. The active model supports mouse-drag rotation (custom, not OrbitControls). A horizontal timeline at the bottom shows camera eras.
- `src/app/page.tsx`: Dynamically imports `CameraCarousel` with `ssr: false`.

**`/generate` — AI Panorama Generator**
- `src/app/generate/page.tsx`: Configuration UI with sliders/chips for location, time of day, era, setting, weather, and crowd level. Any parameter left unset is randomized server-side. POSTs to `/api/generate-pano`, receives base64 image, converts to blob URL, then renders the same `PanoViewer` + `HandOverlay` combo used by `/pano` (with camera overlay, gesture controls, flash effect, and shutter sound).
- `src/app/api/generate-pano/route.ts`: Next.js API route that calls the Gemini image generation API (`gemini-3-pro-image-preview`). Builds an equirectangular panorama prompt from resolved parameters. Returns `{ image, mimeType, prompt, parameters }`.

**`/pano` — Panorama Viewer with Hand Gesture Control**
- `src/app/pano/PanoViewer.tsx`: Raw Three.js (not R3F) equirectangular panorama renderer. Uses a sphere mesh with inverted normals and OrbitControls. Accepts an optional `panoUrl` prop (used by `/generate`); defaults to `/pano_test2.png`. Reads rotation deltas from a shared ref each animation frame.
- `src/app/pano/HandOverlay.tsx`: Initializes MediaPipe HandLandmarker (loaded from CDN at runtime) on the webcam feed. Runs hand detection each frame, processes gestures, draws skeleton overlay on a full-screen canvas, and shows a debug log box.
- `src/app/pano/page.tsx`: Creates the shared `gestureDeltaRef` and manages the camera flash effect when a picture frame gesture fires.

### Gesture System (`src/app/pano/gestures/`)

Gesture logic is separated from the rendering/detection code:
- `types.ts`: `Landmark`/`HandLandmarks` types, `dist()` helper, and `HAND_LANDMARKS` index constants.
- `pinch.ts`: Detects thumb-to-index pinch. When pinching, hand movement translates to panorama rotation deltas via `ROTATE_SENSITIVITY`.
- `pictureFrame.ts`: Detects a two-handed "picture frame" gesture (thumb+index extended, other fingers curled on both hands). Requires holding the pose for `PICTURE_FRAME_HOLD_MS` (400ms) with a cooldown.
- `openHand.ts`: Detects fist-to-open-hand transition. Used to toggle the camera overlay in the pano viewer. Has a `FIST_TO_OPEN_WINDOW_MS` (800ms) window and cooldown.

### Communication Pattern

The parent page creates a `gestureDeltaRef` (mutable ref object with `deltaAzimuth`/`deltaPolar`). HandOverlay writes gesture deltas into it; PanoViewer reads and zeroes them each frame. This avoids React re-renders for 60fps gesture data.

### Key Patterns

- **Dynamic imports with `ssr: false`**: All Three.js components (`CameraCarousel`, `PanoViewer`) use `next/dynamic` since Three.js/R3F require browser APIs.
- **Two Three.js approaches**: Home page uses React Three Fiber (`@react-three/fiber` + `@react-three/drei`). Pano page uses raw Three.js directly. Be consistent with whichever approach the target route uses.
- **MediaPipe loaded from CDN**: WASM and model files are loaded from `cdn.jsdelivr.net` and `storage.googleapis.com` at runtime, not bundled.
- **GLB models in `public/`**: Four camera GLB files. Part names (e.g., `Object_4003`) are specific to each model and discovered by inspecting the GLB. `Object_4002` is hidden on the A7IV.

## Path Alias

`@/*` maps to `./src/*`
