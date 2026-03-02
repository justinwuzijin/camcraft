"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { motion } from "framer-motion";
import { NavButton } from "@/components/NavButton";
import { WorldCard } from "@/components/WorldPickerModal";
import type { WorldEntry } from "@/lib/worldStore";

export default function WorldsPage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/worlds")
      .then((res) => res.json())
      .then((data) => {
        const fetched: WorldEntry[] = data.worlds ?? [];
        if (fetched.length === 0) {
          router.replace("/generate");
          return;
        }
        setWorlds(fetched);
        setLoading(false);
      })
      .catch(() => {
        router.replace("/generate");
      });
  }, [router]);

  const handleSelectWorld = useCallback(
    (world: WorldEntry) => {
      router.push(`/generate?pano=${encodeURIComponent(world.panoPath)}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    (world: WorldEntry) => {
      setWorlds((prev) => {
        const next = prev.filter((w) => w.id !== world.id);
        if (next.length === 0) setTimeout(() => router.push("/create"), 300);
        return next;
      });
      fetch("/api/worlds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panoPath: world.panoPath }),
      }).catch(() => {
        setWorlds((prev) =>
          [world, ...prev].sort((a, b) => b.createdAt - a.createdAt)
        );
      });
    },
    [router]
  );

  if (loading) {
    return <div className="min-h-screen bg-[#050507]" />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050507]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Home" className="relative shrink-0">
              <div
                className="absolute inset-0 blur-lg opacity-25 rounded-full"
                style={{ background: "rgba(176,251,205,0.4)", transform: "scale(1.6)" }}
              />
              <NextImage
                src="/logo.png"
                alt="CamCraft"
                width={28}
                height={28}
                className="relative h-7 w-7 object-contain drop-shadow-[0_0_10px_rgba(176,251,205,0.15)]"
              />
            </Link>
            <div className="h-4 w-px bg-white/[0.08]" />
            <NavButton href="/create" icon="back" label="Back" variant="header" />
          </div>

          <h1
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-sm tracking-[0.25em] uppercase text-white/70"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            World Library
          </h1>

          <button
            onClick={() => router.push("/generate")}
            className="group flex items-center gap-2 rounded-lg border border-[#B0FBCD]/20 bg-[#B0FBCD]/[0.06] px-4 py-2 text-xs tracking-[0.2em] uppercase text-[#B0FBCD]/70 transition-all duration-300 hover:border-[#B0FBCD]/40 hover:bg-[#B0FBCD]/[0.12] hover:text-[#B0FBCD]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="transition-transform duration-300 group-hover:rotate-90"
            >
              <path
                d="M6 1V11M1 6H11"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            Generate New
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 sm:px-10">
        {/* Sub-label */}
        <div className="mt-8 mb-6 flex items-end justify-between">
          <div>
            <h2
              className="text-xl text-white/85 leading-tight mb-1"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Choose a World
            </h2>
            <p
              className="text-xs text-white/30"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {worlds.length} saved world{worlds.length !== 1 ? "s" : ""} —
              click any to enter
            </p>
          </div>
        </div>

        {/* World grid */}
        <div className="pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {worlds.map((world, i) => (
              <motion.div
                key={world.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.08 + i * 0.04,
                  ease: "easeOut",
                }}
              >
                <WorldCard
                  world={world}
                  onClick={() => handleSelectWorld(world)}
                  onDelete={() => handleDelete(world)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
