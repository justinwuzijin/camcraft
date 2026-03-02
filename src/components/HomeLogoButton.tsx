"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Pages that embed the logo directly in their own headers
const HEADER_PAGES = ["/create", "/generate", "/gallery", "/worlds"];

export default function HomeLogoButton() {
  const pathname = usePathname();
  const hidden = pathname === "/" || HEADER_PAGES.includes(pathname);

  return (
    <Link
      href="/"
      aria-label="Home"
      className={`fixed top-5 left-5 z-[55] transition-all duration-300 sm:top-6 sm:left-6 ${
        hidden
          ? "opacity-0 pointer-events-none"
          : "opacity-100"
      }`}
    >
      <div className="relative">
        <div
          className="absolute inset-0 blur-lg opacity-25 rounded-full"
          style={{ background: "rgba(176,251,205,0.4)", transform: "scale(1.6)" }}
        />
        <Image
          src="/logo.png"
          alt="CamCraft"
          width={32}
          height={32}
          className="relative h-8 w-8 object-contain drop-shadow-[0_0_10px_rgba(176,251,205,0.15)]"
        />
      </div>
    </Link>
  );
}
