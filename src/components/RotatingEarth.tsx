"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
  targetLocation?: [number, number] | null // [lng, lat]
}

export default function RotatingEarth({ width = 800, height = 600, className = "", targetLocation = null }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mutable state shared between the main effect and the targetLocation effect
  const stateRef = useRef({
    rotation: [0, 0] as [number, number],
    autoRotate: true,
    targetLngLat: null as [number, number] | null,
    panAnimation: null as {
      interpolate: (t: number) => [number, number, number]
      startTime: number
      duration: number
    } | null,
    projection: null as d3.GeoProjection | null,
    renderFn: null as (() => void) | null,
  })

  // Main setup effect
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    const containerWidth = Math.min(width, window.innerWidth - 40)
    const containerHeight = Math.min(height, window.innerHeight - 100)
    const radius = Math.min(containerWidth, containerHeight) / 2.5

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    stateRef.current.projection = projection

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }
      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry
      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        if (!pointInPolygon(point, coordinates[0])) return false
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) return true
          }
        }
        return false
      }
      return false
    }

    const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds
      const stepSize = dotSpacing * 0.08

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
          }
        }
      }
      return dots
    }

    interface DotData {
      lng: number
      lat: number
    }

    const allDots: DotData[] = []
    let landFeatures: any

    const render = () => {
      const state = stateRef.current
      context.clearRect(0, 0, containerWidth, containerHeight)
      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      // Ocean (globe background)
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "#000000"
      context.fill()
      context.strokeStyle = "#ffffff"
      context.lineWidth = 2 * scaleFactor
      context.stroke()

      if (landFeatures) {
        // Graticule
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.globalAlpha = 0.25
        context.stroke()
        context.globalAlpha = 1

        // Land outlines
        context.beginPath()
        landFeatures.features.forEach((feature: any) => {
          path(feature)
        })
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Halftone dots
        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath()
            context.arc(projected[0], projected[1], 1.2 * scaleFactor, 0, 2 * Math.PI)
            context.fillStyle = "#999999"
            context.fill()
          }
        })
      }

      // Red flashing dot at target location
      if (state.targetLngLat) {
        const projected = projection(state.targetLngLat)
        if (projected) {
          const time = Date.now()
          const pulse = 0.5 + 0.5 * Math.sin(time / 150)

          // Outer glow ring
          const glowRadius = (8 + 4 * pulse) * scaleFactor
          context.beginPath()
          context.arc(projected[0], projected[1], glowRadius, 0, 2 * Math.PI)
          context.fillStyle = `rgba(255, 40, 40, ${0.1 + 0.12 * pulse})`
          context.fill()

          // Inner dot
          const dotRadius = (3.5 + 1.5 * pulse) * scaleFactor
          context.beginPath()
          context.arc(projected[0], projected[1], dotRadius, 0, 2 * Math.PI)
          context.fillStyle = `rgba(255, 50, 50, ${0.7 + 0.3 * pulse})`
          context.fill()
        }
      }
    }

    stateRef.current.renderFn = render

    const loadWorldData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")

        landFeatures = await response.json()

        landFeatures.features.forEach((feature: any) => {
          const dots = generateDotsInPolygon(feature, 16)
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat })
          })
        })

        render()
        setIsLoading(false)
      } catch {
        setError("Failed to load land map data")
        setIsLoading(false)
      }
    }

    // Rotation and interaction
    const state = stateRef.current
    state.rotation = [0, 0]
    state.autoRotate = true
    const rotationSpeed = 0.15

    const tick = () => {
      if (state.panAnimation) {
        const elapsed = Date.now() - state.panAnimation.startTime
        const t = Math.min(1, elapsed / state.panAnimation.duration)
        // Ease in-out cubic
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const r = state.panAnimation.interpolate(eased)
        state.rotation[0] = r[0]
        state.rotation[1] = r[1]
        projection.rotate([r[0], r[1], r[2]])
        render()
        if (t >= 1) {
          state.panAnimation = null
        }
      } else if (state.autoRotate) {
        state.rotation[0] += rotationSpeed
        projection.rotate(state.rotation)
        render()
      } else if (state.targetLngLat) {
        // Keep rendering for the pulsing dot animation
        render()
      }
    }

    const rotationTimer = d3.timer(tick)

    const handleMouseDown = (event: MouseEvent) => {
      state.autoRotate = false
      state.panAnimation = null
      const startX = event.clientX
      const startY = event.clientY
      const startRotation: [number, number] = [state.rotation[0], state.rotation[1]]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.5
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        state.rotation[0] = startRotation[0] + dx * sensitivity
        state.rotation[1] = startRotation[1] - dy * sensitivity
        state.rotation[1] = Math.max(-90, Math.min(90, state.rotation[1]))
        projection.rotate(state.rotation)
        render()
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        setTimeout(() => {
          // Only resume auto-rotate if not locked onto a target
          if (!state.targetLngLat) {
            state.autoRotate = true
          }
        }, 10)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor))
      projection.scale(newRadius)
      render()
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("wheel", handleWheel)

    loadWorldData()

    const currentState = stateRef.current
    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", handleWheel)
      currentState.projection = null
      currentState.renderFn = null
    }
  }, [width, height])

  // Pan-to-target effect
  useEffect(() => {
    const state = stateRef.current
    if (!state.projection) return

    if (targetLocation) {
      state.autoRotate = false
      state.targetLngLat = targetLocation

      const currentRotation = state.projection.rotate() as [number, number, number]
      const targetRotation: [number, number, number] = [-targetLocation[0], -targetLocation[1], 0]

      state.panAnimation = {
        interpolate: d3.interpolate(currentRotation, targetRotation),
        startTime: Date.now(),
        duration: 1200,
      }
    } else {
      state.targetLngLat = null
      state.panAnimation = null
      state.autoRotate = true
    }
  }, [targetLocation])

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-white/[0.03] p-8 ${className}`}>
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-2">Error loading Earth visualization</p>
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="rounded-2xl"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-white/40">Loading globe...</span>
        </div>
      )}
    </div>
  )
}
