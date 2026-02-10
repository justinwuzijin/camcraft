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

- `GEMINI_API_KEY` in `.env` (or `.env.local`) — used by all `/api/*` routes that call Google Gemini.
- `NEXT_PUBLIC_MAPBOX_TOKEN` (optional) — used by `CityAutocomplete` on `/generate` for location search.

## Architecture

Next.js 16 app (App Router) with TypeScript, Tailwind CSS 4 (PostCSS-based), and Three.js for 3D rendering. Uses Bun as the package manager/runtime.

### Routes

**`/` — Landing Page**
- `src/app/page.tsx`: Scroll-based marketing page with hero section, film strip, feature cards, workflow steps, and CTA. Preloads GLB camera models in the background via `preloadModels.ts`. Shutter-close transition navigates to `/create`.

**`/create` — 3D Camera Carousel**
- `src/app/create/page.tsx`: Shutter-open overlay, then renders `CameraCarousel` (dynamically imported, `ssr: false`).
- `src/components/CameraCarousel.tsx`: R3F carousel with four camera models (Handycam → Digital → Fujifilm X-T2 → Sony A7IV) on an oval path. Each has a `CAMERAS` config (id, GLB path, scale, date) and `CAMERA_SPECS`. Navigation via arrows, keyboard, touch swipe, or trackpad scroll. "Explode" button triggers per-model explosion animations (A7IV has hardcoded part names like `Object_4003` for lens separation; others use generic radial explosion). All animations use GSAP. Mouse-drag rotation on active model (custom, not OrbitControls). Timeline at bottom shows camera eras.
- `src/components/ExplodedModel.tsx`: Per-camera explosion animation logic.
- `src/components/ModelViewer.tsx`: Single camera model display.

**`/generate` — AI Panorama Generator**
- `src/app/generate/page.tsx`: Configuration UI with sliders/chips for location, time of day, era, setting, weather, crowd level. Unset params are randomized server-side. POSTs to `/api/generate-pano`, receives base64 image, then renders `PanoViewer` + `HandOverlay` with camera overlay, gesture controls, flash effect, and shutter sound.
- `src/app/generate/CityAutocomplete.tsx`: Mapbox-powered location search autocomplete.
- `src/components/RotatingEarth.tsx`: Three.js globe with location targeting for the generate UI.

**`/pano` — Panorama Viewer with Hand Gesture Control**
- `src/app/pano/PanoViewer.tsx`: Raw Three.js (not R3F) equirectangular panorama renderer. Sphere mesh with inverted normals + OrbitControls. Accepts optional `panoUrl` prop; defaults to `/pano_test2.png`. Reads rotation deltas from a shared ref each frame.
- `src/app/pano/HandOverlay.tsx`: MediaPipe HandLandmarker (CDN-loaded) on webcam feed. Runs detection each frame, processes gestures, draws skeleton overlay, shows debug log.
- `src/app/pano/page.tsx`: Creates the shared `gestureDeltaRef` and manages camera flash on picture-frame gesture.
- `src/components/SonyViewfinderHUD.tsx`: Viewfinder overlay with focus/confirmation states.

**`/gallery` — Contact Sheet / Photo Gallery**
- `src/app/gallery/page.tsx`: Contact-sheet grid with lightbox, metadata sidebar, download, delete. Merges localStorage metadata (`galleryStore`) with server-side files (`/api/gallery`).
- `src/components/ImageAnalysisPanel.tsx`: AI analysis of captured photos in the lightbox.

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-pano` | POST | Gemini `gemini-3-pro-image-preview` — generates 4K equirectangular panoramas. Saves to `public/generated/panos/`. |
| `/api/focus-image` | POST | Gemini — enhances a viewport crop as if shot with Sony A7IV 85mm f/1.4. |
| `/api/analyze-image` | POST | Gemini — AI analysis of captured photos. |
| `/api/save-photo` | POST | Saves base64 image to `public/generated/photos/` with slug filenames. |
| `/api/gallery` | GET | Scans `public/generated/photos/` (and legacy `public/generated/focus_*`) for saved images. |
| `/api/generate-gesture-video` | POST | Gemini Veo — generates gesture tutorial video loops. |
| `/api/generate-equipment-icons` | POST | Gemini — generates equipment HUD icons. |

### Gesture System (`src/app/pano/gestures/`)

Gesture logic is separated from rendering/detection. Barrel export via `index.ts`.
- `types.ts`: `Landmark`/`HandLandmarks` types, `dist()` helper, `HAND_LANDMARKS` index constants.
- `pinch.ts`: Thumb-to-index pinch → panorama rotation deltas via `ROTATE_SENSITIVITY`.
- `pictureFrame.ts`: Two-handed frame gesture (thumb+index extended, others curled). Hold for `PICTURE_FRAME_HOLD_MS` (400ms) with cooldown.
- `openHand.ts`: Fist-to-open-hand transition → toggles camera overlay. `FIST_TO_OPEN_WINDOW_MS` (800ms) window + cooldown.
- `focus.ts`: Left-hand-only picture frame → triggers AI enhancement via `/api/focus-image`.

### Communication Pattern

Parent page creates `gestureDeltaRef` (mutable ref with `deltaAzimuth`/`deltaPolar`). `HandOverlay` writes deltas; `PanoViewer` reads and zeroes each frame. Avoids React re-renders for 60fps gesture data.

### Key Patterns

- **Dynamic imports with `ssr: false`**: All Three.js components use `next/dynamic` since Three.js/R3F require browser APIs.
- **Two Three.js approaches**: `/create` uses React Three Fiber (`@react-three/fiber` + `@react-three/drei`). `/pano` and `/generate` use raw Three.js. Be consistent with the target route's approach.
- **Two animation libraries**: GSAP for Three.js/3D animations (carousel, explosions). Framer Motion for page transitions and UI animations. Don't mix them in the same context.
- **MediaPipe loaded from CDN**: WASM and model files from `cdn.jsdelivr.net` and `storage.googleapis.com` at runtime, not bundled.
- **GLB models in `public/`**: Camera GLB files with model-specific part names (discovered by inspecting GLB). `Object_4002` is hidden on the A7IV.
- **Gallery dual storage**: Metadata in localStorage (client, key `camcraft_gallery`), image files in `public/generated/photos/` (server). Gallery page merges both.
- **Generated files in `public/generated/`**: Photos in `photos/`, panoramas in `panos/`. This directory is gitignored.
- **Page transitions**: Shutter-close animation on `/` navigates to `/create`, which plays shutter-open. `PageTransition.tsx` provides reusable shutter/fade variants.

### Design System

- **Brand color**: `#B0FBCD` / `rgba(176,251,205,...)` — used for accents, glows, and interactive elements throughout.
- **Background**: `#050507` — near-black base.
- **Fonts**: `var(--font-geist-sans)` for headings, `var(--font-geist-mono)` for labels/metadata. Applied via inline `style={{ fontFamily }}`.
- **Aesthetic**: Camera/photography metaphors — viewfinder corners, film strips, aperture rings, shutter animations, exposure info bars.

### Utilities

- `src/lib/galleryStore.ts`: localStorage wrapper for `GalleryEntry` metadata.
- `src/lib/galleryBadgeStore.ts`: Unseen photo counter for gallery badge.
- `src/utils/preloadModels.ts`: Background preloading of GLB camera models via prefetch links.

## Path Alias

`@/*` maps to `./src/*`
