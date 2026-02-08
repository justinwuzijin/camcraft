import { NextResponse } from "next/server";

// This API endpoint provides info about available equipment
// The actual snapshots should be generated client-side using the 3D viewer

const EQUIPMENT_DATA = {
  bodies: [
    {
      id: "sony-a7iv",
      name: "Sony α7 IV",
      modelPath: "/a7iv.glb",
      icon: "/equipment/body-a7iv.png",
      stats: [
        { label: "Sensor", value: "33MP Full-Frame" },
        { label: "ISO", value: "100-51200" },
        { label: "Video", value: "4K 60fps" },
      ],
    },
    {
      id: "fujifilm-xt2",
      name: "Fujifilm X-T2",
      modelPath: "/fujifilm_x-t2_camera.glb",
      icon: "/equipment/body-xt2.png",
      stats: [
        { label: "Sensor", value: "24.3MP APS-C" },
        { label: "ISO", value: "200-12800" },
        { label: "Video", value: "4K 30fps" },
      ],
    },
    {
      id: "sony-handycam",
      name: "Sony Handycam",
      modelPath: "/sony_handycam_scan_4k8k.glb",
      icon: "/equipment/body-handycam.png",
      stats: [
        { label: "Sensor", value: '1/3" 3-CCD' },
        { label: "Resolution", value: "530 TV lines" },
        { label: "Format", value: "MiniDV" },
      ],
    },
    {
      id: "digital-camera",
      name: "Compact Digital",
      modelPath: "/digital_camera.glb",
      icon: "/equipment/body-compact.png",
      stats: [
        { label: "Sensor", value: '1/2.3" CCD' },
        { label: "Resolution", value: "5 Megapixels" },
        { label: "Zoom", value: "3x Optical" },
      ],
    },
  ],
  lenses: [
    {
      id: "fe-24-70",
      name: "FE 24-70mm f/2.8 GM",
      icon: "/equipment/lens-2470.png",
      stats: [
        { label: "Focal", value: "24-70mm" },
        { label: "Aperture", value: "f/2.8" },
        { label: "Type", value: "G Master" },
      ],
    },
    {
      id: "xf-18-55",
      name: "XF 18-55mm f/2.8-4",
      icon: "/equipment/lens-1855.png",
      stats: [
        { label: "Focal", value: "18-55mm" },
        { label: "Aperture", value: "f/2.8-4" },
        { label: "Type", value: "Kit Lens" },
      ],
    },
    {
      id: "built-in",
      name: "Built-in Lens",
      icon: "/equipment/lens-builtin.png",
      stats: [
        { label: "Type", value: "Fixed" },
        { label: "Zoom", value: "3x" },
      ],
    },
  ],
  accessories: [
    {
      id: "flash",
      name: "External Flash",
      icon: "/equipment/acc-flash.png",
      stats: [
        { label: "GN", value: "60" },
        { label: "TTL", value: "Yes" },
      ],
    },
    {
      id: "filter-nd",
      name: "ND Filter",
      icon: "/equipment/acc-filter.png",
      stats: [
        { label: "Stops", value: "3-10" },
        { label: "Type", value: "Variable" },
      ],
    },
    {
      id: "grip",
      name: "Battery Grip",
      icon: "/equipment/acc-grip.png",
      stats: [
        { label: "Capacity", value: "2x Battery" },
      ],
    },
  ],
};

export async function GET() {
  return NextResponse.json(EQUIPMENT_DATA);
}
