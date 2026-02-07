# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start development server (http://localhost:3000)
bun run build    # Build for production
bun run lint     # Run ESLint
bun start        # Start production server
```

## Architecture

This is a Next.js 16 app using the App Router with TypeScript, Tailwind CSS 4, and Three.js for 3D rendering.

### Key Feature: Panorama Viewer with Hand Gesture Control

The main feature (`/pano` route) is an interactive 360-degree panorama viewer controlled by hand gestures via webcam:

- **PanoViewer** (`src/app/pano/PanoViewer.tsx`): Three.js-based equirectangular panorama renderer using a sphere mesh with OrbitControls. Accepts a `gestureDeltaRef` to receive rotation deltas from hand tracking.

- **HandOverlay** (`src/app/pano/HandOverlay.tsx`): Uses MediaPipe's HandLandmarker (via `@mediapipe/tasks-vision`) to detect hand landmarks from webcam. Implements pinch detection (thumb tip to index tip distance) to control panorama rotation. Renders hand skeleton overlay on a canvas.

- **Communication Pattern**: The parent page component creates a shared ref (`gestureDeltaRef`) that HandOverlay writes gesture deltas to and PanoViewer reads from during its animation loop.

### Dynamic Import

PanoViewer is dynamically imported with `ssr: false` since Three.js requires browser APIs.

## Path Alias

`@/*` maps to `./src/*`
