"use client";

import { useState } from "react";

// Equipment slot types
export type EquipmentSlot = {
  id: string;
  name: string;
  icon: string | null; // Path to snapshot image or data URL
  modelPath?: string; // Path to GLB model for icon generation
  equipped: boolean;
  stats?: {
    label: string;
    value: string;
  }[];
};

export type CameraLoadout = {
  body: EquipmentSlot;
  lens: EquipmentSlot;
  accessory1: EquipmentSlot;
  accessory2: EquipmentSlot;
};

// Default camera loadout
const DEFAULT_LOADOUT: CameraLoadout = {
  body: {
    id: "sony-a7iv",
    name: "Sony α7 IV",
    icon: null,
    modelPath: "/a7iv.glb",
    equipped: true,
    stats: [
      { label: "Sensor", value: "33MP Full-Frame" },
      { label: "ISO", value: "100-51200" },
    ],
  },
  lens: {
    id: "fe-24-70",
    name: "FE 24-70mm f/2.8 GM",
    icon: null,
    modelPath: "/a7iv.glb", // Uses same model, will show lens part
    equipped: true,
    stats: [
      { label: "Focal", value: "24-70mm" },
      { label: "Aperture", value: "f/2.8" },
    ],
  },
  accessory1: {
    id: "none",
    name: "Empty Slot",
    icon: null,
    equipped: false,
  },
  accessory2: {
    id: "none",
    name: "Empty Slot",
    icon: null,
    equipped: false,
  },
};

// Empty slot placeholder
const EmptySlotIcon = () => (
  <div className="w-full h-full flex items-center justify-center">
    <svg
      className="w-6 h-6 text-white/20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
    </svg>
  </div>
);

// SVG icons for equipment types - pixelated Minecraft style
const EquipmentIcons = {
  body: (
    <svg className="w-8 h-8" viewBox="0 0 16 16" fill="currentColor" style={{ imageRendering: "pixelated" }}>
      {/* Camera body - pixelated */}
      <rect x="1" y="4" width="14" height="9" fill="#4a4a4a" />
      <rect x="2" y="5" width="12" height="7" fill="#3a3a3a" />
      <rect x="5" y="6" width="6" height="5" fill="#222" />
      <rect x="6" y="7" width="4" height="3" fill="#111" />
      <rect x="11" y="2" width="3" height="3" fill="#4a4a4a" />
      <rect x="2" y="5" width="2" height="2" fill="#666" />
    </svg>
  ),
  lens: (
    <svg className="w-8 h-8" viewBox="0 0 16 16" fill="currentColor" style={{ imageRendering: "pixelated" }}>
      {/* Lens - pixelated circles */}
      <rect x="3" y="3" width="10" height="10" fill="#333" />
      <rect x="4" y="4" width="8" height="8" fill="#222" />
      <rect x="5" y="5" width="6" height="6" fill="#111" />
      <rect x="6" y="6" width="4" height="4" fill="#1a3a5a" />
      <rect x="7" y="7" width="2" height="2" fill="#2a5a8a" />
    </svg>
  ),
  accessory: (
    <svg className="w-8 h-8" viewBox="0 0 16 16" fill="currentColor" style={{ imageRendering: "pixelated" }}>
      {/* Flash/accessory - pixelated */}
      <rect x="5" y="2" width="6" height="3" fill="#666" />
      <rect x="4" y="5" width="8" height="8" fill="#4a4a4a" />
      <rect x="5" y="6" width="6" height="6" fill="#3a3a3a" />
      <rect x="6" y="7" width="4" height="4" fill="#ffcc00" />
    </svg>
  ),
};

// Individual equipment slot component
const EquipmentSlotItem = ({
  slot,
  type,
  isHovered,
  onHover,
  tooltipSide = "right",
}: {
  slot: EquipmentSlot;
  type: "body" | "lens" | "accessory";
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  tooltipSide?: "left" | "right";
}) => {

  return (
    <div
      className="relative group"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Slot container */}
      <div
        className={`
          relative w-12 h-12 
          border-2 rounded-lg overflow-hidden
          transition-all duration-200
          ${
            slot.equipped
              ? "border-[#B0FBCD]/60 bg-black/60"
              : "border-white/20 bg-black/40"
          }
          ${isHovered ? "border-[#B0FBCD] scale-110 z-10" : ""}
        `}
      >
        {/* Equipment icon or empty slot */}
        {slot.equipped ? (
          <div className="w-full h-full flex items-center justify-center text-[#B0FBCD]">
            {EquipmentIcons[type]}
          </div>
        ) : (
          <EmptySlotIcon />
        )}

        {/* Equipped indicator glow */}
        {slot.equipped && (
          <div className="absolute inset-0 bg-[#B0FBCD]/5 pointer-events-none" />
        )}
      </div>

      {/* Tooltip on hover */}
      {isHovered && slot.equipped && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none ${
          tooltipSide === "left" ? "right-full mr-3" : "left-full ml-3"
        }`}>
          <div className="relative min-w-[140px]">
            {/* Viewfinder corner marks */}
            <div className="absolute -top-px -left-px w-2 h-2">
              <div className="absolute top-0 left-0 w-full h-px bg-[#B0FBCD]/25" />
              <div className="absolute top-0 left-0 h-full w-px bg-[#B0FBCD]/25" />
            </div>
            <div className="absolute -top-px -right-px w-2 h-2">
              <div className="absolute top-0 right-0 w-full h-px bg-[#B0FBCD]/25" />
              <div className="absolute top-0 right-0 h-full w-px bg-[#B0FBCD]/25" />
            </div>
            <div className="absolute -bottom-px -left-px w-2 h-2">
              <div className="absolute bottom-0 left-0 w-full h-px bg-[#B0FBCD]/25" />
              <div className="absolute bottom-0 left-0 h-full w-px bg-[#B0FBCD]/25" />
            </div>
            <div className="absolute -bottom-px -right-px w-2 h-2">
              <div className="absolute bottom-0 right-0 w-full h-px bg-[#B0FBCD]/25" />
              <div className="absolute bottom-0 right-0 h-full w-px bg-[#B0FBCD]/25" />
            </div>

            <div className="bg-[#050507]/90 backdrop-blur-md border border-white/[0.06] px-3 py-2.5">
              <p className="text-[11px] tracking-[0.15em] uppercase text-[#B0FBCD]/70 whitespace-nowrap" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                {slot.name}
              </p>
              {slot.stats && (
                <div className="mt-1.5 space-y-1">
                  {slot.stats.map((stat, idx) => (
                    <div key={idx} className="flex justify-between gap-3 text-[10px]" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                      <span className="text-white/25 tracking-wider uppercase">{stat.label}</span>
                      <span className="text-white/50">{stat.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connecting line instead of arrow */}
          <div className={`absolute top-1/2 h-px w-2 bg-[#B0FBCD]/15 ${
            tooltipSide === "left"
              ? "right-0 translate-x-full"
              : "left-0 -translate-x-full"
          }`} style={{ transform: `translateY(-0.5px) ${tooltipSide === "left" ? "translateX(100%)" : "translateX(-100%)"}` }} />
        </div>
      )}
    </div>
  );
};


interface CameraEquipmentHUDProps {
  loadout?: CameraLoadout;
  position?: "left" | "right";
  className?: string;
}

export default function CameraEquipmentHUD({
  loadout = DEFAULT_LOADOUT,
  position = "left",
  className = "",
}: CameraEquipmentHUDProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const positionClasses = {
    left: "left-4 top-1/2 -translate-y-1/2",
    right: "right-4 top-1/2 -translate-y-1/2",
  };

  return (
    <>
      <div
        className={`
          absolute z-20 
          ${positionClasses[position]}
          ${className}
        `}
      >
        {/* HUD Container with Minecraft-style border */}
        <div className="relative">
          {/* Background panel */}
          <div className="absolute inset-0 -m-2 bg-black/50 backdrop-blur-sm rounded-xl border border-white/10" />

          {/* Equipment slots */}
          <div className="relative flex flex-col gap-2 p-1">
            {/* Camera Body */}
            <EquipmentSlotItem
              slot={loadout.body}
              type="body"
              isHovered={hoveredSlot === "body"}
              onHover={(h) => setHoveredSlot(h ? "body" : null)}
              tooltipSide={position === "right" ? "left" : "right"}
            />

            {/* Lens */}
            <EquipmentSlotItem
              slot={loadout.lens}
              type="lens"
              isHovered={hoveredSlot === "lens"}
              onHover={(h) => setHoveredSlot(h ? "lens" : null)}
              tooltipSide={position === "right" ? "left" : "right"}
            />

            {/* Divider */}
            <div className="w-full h-px bg-white/10 my-0.5" />

            {/* Accessory 1 */}
            <EquipmentSlotItem
              slot={loadout.accessory1}
              type="accessory"
              isHovered={hoveredSlot === "accessory1"}
              onHover={(h) => setHoveredSlot(h ? "accessory1" : null)}
              tooltipSide={position === "right" ? "left" : "right"}
            />

            {/* Accessory 2 */}
            <EquipmentSlotItem
              slot={loadout.accessory2}
              type="accessory"
              isHovered={hoveredSlot === "accessory2"}
              onHover={(h) => setHoveredSlot(h ? "accessory2" : null)}
              tooltipSide={position === "right" ? "left" : "right"}
            />
          </div>

          {/* Label */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              Equipment
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
