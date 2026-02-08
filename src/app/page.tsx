"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { preloadCameraModels } from "@/utils/preloadModels";

// ── Scroll-triggered reveal hook ─────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Viewfinder corner marks ─────────────────────────────────
function ViewfinderCorners({ className = "" }: { className?: string }) {
  const stroke = "rgba(176,251,205,0.12)";
  const len = 24;
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <svg className="absolute top-0 left-0" width={len} height={len}>
        <path d={`M0 ${len} L0 0 L${len} 0`} stroke={stroke} strokeWidth="1.5" fill="none" />
      </svg>
      <svg className="absolute top-0 right-0" width={len} height={len}>
        <path d={`M0 0 L${len} 0 L${len} ${len}`} stroke={stroke} strokeWidth="1.5" fill="none" />
      </svg>
      <svg className="absolute bottom-0 left-0" width={len} height={len}>
        <path d={`M0 0 L0 ${len} L${len} ${len}`} stroke={stroke} strokeWidth="1.5" fill="none" />
      </svg>
      <svg className="absolute bottom-0 right-0" width={len} height={len}>
        <path d={`M${len} 0 L${len} ${len} L0 ${len}`} stroke={stroke} strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}

// ── Feature card (with scroll reveal) ────────────────────────
function FeatureCard({
  icon,
  title,
  description,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}) {
  const { ref, visible } = useReveal(0.2);
  return (
    <div
      ref={ref}
      className={`group relative border border-white/[0.06] bg-white/[0.015] p-6 transition-all duration-700 hover:border-[#B0FBCD]/[0.15] hover:bg-[#B0FBCD]/[0.02] ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="absolute top-0 left-0 h-4 w-px" style={{ background: "rgba(176,251,205,0.12)" }} />
      <div className="absolute top-0 left-0 h-px w-4" style={{ background: "rgba(176,251,205,0.12)" }} />

      <div className="mb-4 text-white/30 transition-colors duration-300 group-hover:text-[#B0FBCD]/60">
        {icon}
      </div>
      <h3
        className="mb-2 text-[11px] tracking-[0.2em] uppercase text-white/60"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {title}
      </h3>
      <p className="text-[13px] leading-relaxed text-white/30">
        {description}
      </p>
    </div>
  );
}

// ── Scrolling film strip (infinite horizontal scroll) ────────
const FILM_PHOTOS = [
  "/panos/paris-1920s.jpg",
  "/panos/tokyo.jpg",
  "/panos/istanbul-dawn.jpg",
  "/panos/sydney-dawn.jpg",
  "/panos/milan-night.jpg",
  "/panos/hcmc-golden.jpg",
  "/panos/toronto-night.jpg",
  "/panos/dagestan-dusk.jpg",
  "/panos/balikpapan-night.jpg",
  "/panos/brampton.jpg",
  "/panos/hcmc-night.jpg",
  "/panos/paris-dawn.jpg",
  "/panos/noon-fog.jpg",
];

function FilmStrip() {
  const frames = [...FILM_PHOTOS, ...FILM_PHOTOS];
  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between px-1">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="h-2 w-3 rounded-[1px] bg-white/[0.06]" />
        ))}
      </div>
      <div
        className="flex items-center py-4 animate-[filmScroll_30s_linear_infinite]"
        style={{ width: "max-content" }}
      >
        {frames.map((src, i) => (
          <div
            key={i}
            className="group/frame relative mr-1 h-28 w-48 shrink-0 overflow-hidden rounded-[2px] border border-white/[0.06] bg-white/[0.02]"
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover opacity-40 transition-opacity duration-300 group-hover/frame:opacity-80"
              loading="lazy"
              draggable={false}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between px-1">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="h-2 w-3 rounded-[1px] bg-white/[0.06]" />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-[#050507] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-[#050507] to-transparent" />
    </div>
  );
}

// ── Workflow steps with scroll-triggered stagger ─────────────
function WorkflowSteps() {
  const { ref, visible } = useReveal(0.2);
  const steps = [
    {
      step: "01",
      title: "Explore",
      description: "Browse iconic cameras spanning decades. Inspect every part in an interactive 3D carousel.",
    },
    {
      step: "02",
      title: "Generate",
      description: "AI creates a full 360° panoramic world. Step inside and look around with hand gestures.",
    },
    {
      step: "03",
      title: "Capture",
      description: "Frame your shot through the viewfinder. AI enhances the final image. Save to your gallery.",
    },
  ];

  return (
    <div ref={ref} className="grid gap-12 sm:grid-cols-3">
      {steps.map(({ step, title, description }, i) => (
        <div
          key={step}
          className={`relative transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: `${i * 150}ms` }}
        >
          <div
            className="mb-4 text-[40px] font-extralight tracking-wider text-white/[0.04]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {step}
          </div>
          {i < 2 && (
            <div
              className={`absolute right-0 top-8 hidden sm:block h-px bg-gradient-to-r from-white/[0.06] to-transparent transition-all duration-700 ${
                visible ? "w-12 opacity-100" : "w-0 opacity-0"
              }`}
              style={{ transitionDelay: `${i * 150 + 300}ms` }}
            />
          )}
          <h3
            className="mb-2 text-[12px] tracking-[0.2em] uppercase text-white/50"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {title}
          </h3>
          <p className="text-[13px] leading-relaxed text-white/25">
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Animated counter ─────────────────────────────────────────
function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1200;
          const startTime = performance.now();
          const step = (time: number) => {
            const progress = Math.min((time - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

// ── Floating shutter button (hero CTA) ───────────────────────
function ShutterButton({ onNavigate }: { onNavigate: () => void }) {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setPressed(true);
    onNavigate();
  };

  return (
    <button
      onClick={handleClick}
      className="group relative flex items-center justify-center"
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
    >
      {/* Sonar pulse rings */}
      <div className="absolute h-20 w-20 rounded-full animate-[sonarPing_3s_ease-out_infinite]" style={{ border: "1px solid rgba(176,251,205,0.08)" }} />
      <div className="absolute h-20 w-20 rounded-full animate-[sonarPing_3s_ease-out_1s_infinite]" style={{ border: "1px solid rgba(176,251,205,0.08)" }} />
      {/* Outer ring */}
      <div
        className={`absolute h-16 w-16 rounded-full border-2 transition-all duration-300 ${
          pressed ? "scale-95" : "group-hover:border-white/40"
        }`}
        style={{ borderColor: pressed ? "rgba(176,251,205,0.4)" : "rgba(176,251,205,0.2)" }}
      />
      {/* Inner circle */}
      <div
        className={`h-12 w-12 rounded-full transition-all duration-200 ${
          pressed ? "scale-90" : "group-hover:shadow-[0_0_30px_rgba(176,251,205,0.2)]"
        }`}
        style={{ background: pressed ? "rgba(176,251,205,0.6)" : "rgba(176,251,205,0.85)" }}
      />
    </button>
  );
}

// ── Final CTA with reveal ────────────────────────────────────
function CtaSection({ onNavigate }: { onNavigate: () => void }) {
  const { ref, visible } = useReveal(0.3);
  return (
    <div
      ref={ref}
      className={`relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center transition-all duration-1000 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className={`relative mb-8 transition-all duration-1000 delay-200 ${visible ? "rotate-0 scale-100 opacity-100" : "rotate-12 scale-75 opacity-0"}`}>
        <div
          className="absolute inset-0 blur-xl opacity-25 rounded-full"
          style={{ background: "var(--brand)", transform: "scale(1.8)" }}
        />
        <Image
          src="/logo.png"
          alt=""
          width={56}
          height={56}
          className="relative h-14 w-14 object-contain drop-shadow-[0_0_15px_rgba(176,251,205,0.15)]"
        />
      </div>

      <h2
        className="mb-4 text-[clamp(1.5rem,4vw,2.5rem)] font-light tracking-[0.1em] uppercase leading-tight text-white/70"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        Your darkroom awaits
      </h2>

      <p
        className="mb-12 max-w-sm text-[13px] leading-relaxed text-white/20"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        No camera required. Just your hands, your imagination,
        and an AI that sees the world through your lens.
      </p>

      <button
        onClick={onNavigate}
        className="group relative flex items-center gap-3 rounded-none px-8 py-3.5 transition-all duration-300 overflow-hidden cursor-pointer"
        style={{
          border: "1px solid rgba(176,251,205,0.15)",
          background: "rgba(176,251,205,0.04)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(176,251,205,0.3)";
          e.currentTarget.style.background = "rgba(176,251,205,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(176,251,205,0.15)";
          e.currentTarget.style.background = "rgba(176,251,205,0.04)";
        }}
      >
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" style={{ background: "linear-gradient(to right, transparent, rgba(176,251,205,0.06), transparent)" }} />
        <span
          className="relative text-[11px] tracking-[0.3em] uppercase transition-colors duration-300"
          style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(176,251,205,0.6)" }}
        >
          Start Shooting
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="relative transition-all duration-300 group-hover:translate-x-0.5"
          style={{ color: "rgba(176,251,205,0.3)" }}
        >
          <path
            d="M5 3L9 7L5 11"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

// ── Shutter transition overlay ───────────────────────────────
function ShutterOverlay({ isTransitioning }: { isTransitioning: boolean }) {
  return (
    <AnimatePresence>
      {isTransitioning && (
        <>
          {/* Left shutter blade */}
          <motion.div
            className="fixed inset-y-0 left-0 z-[100] bg-[#050507]"
            initial={{ width: "0%" }}
            animate={{ width: "50%" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          />
          {/* Right shutter blade */}
          <motion.div
            className="fixed inset-y-0 right-0 z-[100] bg-[#050507]"
            initial={{ width: "0%" }}
            animate={{ width: "50%" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          />
          {/* Center aperture ring */}
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                {/* Outer ring */}
                <motion.circle
                  cx="40"
                  cy="40"
                  r="38"
                  stroke="rgba(176,251,205,0.4)"
                  strokeWidth="1.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                />
                {/* Inner aperture */}
                <motion.circle
                  cx="40"
                  cy="40"
                  r="20"
                  stroke="rgba(176,251,205,0.6)"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
                />
                {/* Aperture blades */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.line
                    key={angle}
                    x1="40"
                    y1="40"
                    x2={40 + 18 * Math.cos((angle * Math.PI) / 180)}
                    y2={40 + 18 * Math.sin((angle * Math.PI) / 180)}
                    stroke="rgba(176,251,205,0.3)"
                    strokeWidth="1"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 0.55 + i * 0.05, ease: "easeOut" }}
                  />
                ))}
              </svg>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main landing page ────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleNavigateToCreate = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/create");
    }, 700);
  };

  useEffect(() => {
    setMounted(true);
    // Start preloading 3D models immediately so they're ready when user navigates
    preloadCameraModels();
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const heroOpacity = Math.max(0, 1 - scrollY / 600);

  return (
    <motion.div
      className="relative min-h-screen bg-[#050507] text-white selection:bg-white/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Shutter transition overlay */}
      <ShutterOverlay isTransitioning={isTransitioning} />

      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION — Logo-centered, clean vertical stack
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative flex h-[85vh] flex-col items-center justify-center overflow-hidden">
        {/* Radial vignette */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 48%, transparent 0%, rgba(5,5,7,0.5) 55%, rgba(5,5,7,0.97) 100%)",
          }}
        />

        {/* Soft brand glow behind logo area */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 35% 30% at 50% 42%, rgba(176, 251, 205, 0.035) 0%, transparent 70%)",
          }}
        />

        {/* Subtle grid lines */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
          <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
          <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white" />
        </div>

        {/* Viewfinder corners */}
        <div className="absolute inset-10 sm:inset-16 z-20">
          <ViewfinderCorners />
        </div>

        {/* Lens flare sweep — very subtle */}
        <div
          className="pointer-events-none absolute inset-0 z-[15] animate-[flareSweep_8s_ease-in-out_infinite]"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(176,251,205,0.02) 47%, rgba(255,255,255,0.025) 50%, rgba(176,251,205,0.02) 53%, transparent 60%)",
            backgroundSize: "200% 100%",
          }}
        />

        {/* ── Hero content: vertically stacked, logo dominant ── */}
        <div
          className="relative z-30 flex flex-col items-center px-6 text-center"
          style={{ opacity: heroOpacity }}
        >
          {/* Logo — big, proud, centered */}
          <div
            className={`relative mb-6 transition-all duration-[1200ms] ease-out ${
              mounted
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-90 translate-y-4"
            }`}
          >
            {/* Glow behind logo */}
            <div
              className="absolute inset-0 blur-3xl rounded-full"
              style={{
                background: "rgba(176,251,205,0.15)",
                transform: "scale(2.2)",
              }}
            />
            <Image
              src="/logo.png"
              alt="CamCraft"
              width={200}
              height={200}
              className="relative h-28 w-28 sm:h-36 sm:w-36 object-contain drop-shadow-[0_0_40px_rgba(176,251,205,0.12)]"
              priority
            />
          </div>

          {/* Wordmark — stacked, centered */}
          <h1
            className={`transition-all duration-[1200ms] delay-150 ease-out ${
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <span
              className="block text-[clamp(2.8rem,7vw,6rem)] font-light tracking-[0.15em] uppercase leading-[0.85]"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Cam
            </span>
            <span
              className="block text-[clamp(2.8rem,7vw,6rem)] font-extralight tracking-[0.15em] uppercase leading-[0.85]"
              style={{ fontFamily: "var(--font-geist-sans)", color: "var(--brand)" }}
            >
              Craft
            </span>
          </h1>

          {/* Thin separator line */}
          <div
            className={`mt-6 mb-5 h-px w-12 transition-all duration-1000 delay-300 ${
              mounted ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
            }`}
            style={{ background: "rgba(176,251,205,0.2)" }}
          />

          {/* Tagline */}
          <p
            className={`max-w-sm text-[13px] leading-relaxed text-white/25 transition-all duration-1000 delay-300 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Step behind the lens. Generate worlds.
            <br />
            Capture moments that never existed.
          </p>

          {/* Shutter CTA */}
          <div
            className={`mt-12 transition-all duration-1000 delay-500 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <ShutterButton onNavigate={handleNavigateToCreate} />
          </div>

          {/* Label */}
          <span
            className={`mt-5 text-[9px] tracking-[0.5em] uppercase transition-all duration-1000 delay-700 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(176,251,205,0.2)" }}
          >
            Press to enter
          </span>
        </div>

        {/* Bottom exposure info bar */}
        <div
          className="absolute bottom-8 left-0 right-0 z-30 flex items-center justify-center gap-6 sm:gap-10"
          style={{ opacity: heroOpacity }}
        >
          {[
            { label: "f/2.8", desc: "Aperture" },
            { label: "1/250", desc: "Shutter" },
            { label: "ISO 400", desc: "Sensitivity" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className="text-[11px] tracking-wider text-white/20"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {label}
              </span>
              <span
                className="text-[8px] tracking-[0.3em] uppercase text-white/8"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {desc}
              </span>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-8 right-8 z-30 flex flex-col items-center gap-2 transition-all duration-1000 delay-700 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
          style={{ opacity: heroOpacity }}
        >
          <div className="h-8 w-px" style={{ background: "linear-gradient(to bottom, transparent, rgba(176,251,205,0.15))" }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "rgba(176,251,205,0.3)" }} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FILM STRIP DIVIDER
         ═══════════════════════════════════════════════════════════ */}
      <div className="relative border-y border-white/[0.04] bg-white/[0.01] py-1">
        <FilmStrip />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FEATURES
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <div className="mb-16 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: "linear-gradient(to right, rgba(176,251,205,0.1), transparent)" }} />
            <span
              className="text-[10px] tracking-[0.4em] uppercase"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(176,251,205,0.25)" }}
            >
              System Capabilities
            </span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(to left, rgba(176,251,205,0.1), transparent)" }} />
          </div>

          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              index={0}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.3" />
                  <rect x="14" y="5.5" width="4" height="2" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                </svg>
              }
              title="Camera Museum"
              description="Explore iconic cameras from the 1980s Handycam to the modern Sony A7IV. Inspect every detail in 3D."
            />
            <FeatureCard
              index={1}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" />
                  <path d="M12 3V12L17 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" opacity="0.4" />
                </svg>
              }
              title="AI Panoramas"
              description="Generate 360-degree worlds from text. Pick a decade, location, weather — or let it surprise you."
            />
            <FeatureCard
              index={2}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M7 8C7 5.79 8.79 4 11 4H13C15.21 4 17 5.79 17 8V12C17 14.21 15.21 16 13 16H11C8.79 16 7 14.21 7 12V8Z" stroke="currentColor" strokeWidth="1" />
                  <path d="M9 7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 7L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 7L15 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9 19H15M12 16V19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
              }
              title="Gesture Control"
              description="Pinch to look around. Frame a shot with your hands. No mouse needed — just natural movement."
            />
            <FeatureCard
              index={3}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3L21 3L21 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 21L3 21L3 15" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 3L14 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  <path d="M3 21L10 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
              }
              title="AI Enhancement"
              description="Focus on any part of the panorama. AI enhances resolution and adds photographic detail in real-time."
            />
            <FeatureCard
              index={4}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1" />
                  <rect x="14" y="3" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1" />
                  <rect x="3" y="14" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1" />
                  <rect x="14" y="14" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1" />
                </svg>
              }
              title="Contact Sheet"
              description="Your captures are saved to a gallery contact sheet. Download, review metadata, or reshoot."
            />
            <FeatureCard
              index={5}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" />
                  <path d="M12 5V3M12 21V19M5 12H3M21 12H19M7.05 7.05L5.64 5.64M18.36 18.36L16.95 16.95M7.05 16.95L5.64 18.36M18.36 5.64L16.95 7.05" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
              }
              title="Time Travel"
              description="See the same street in 1920 or 2024. Different eras, lighting, and atmospheres — all generated."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/[0.04] py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <div className="mb-16 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: "linear-gradient(to right, rgba(176,251,205,0.1), transparent)" }} />
            <span
              className="text-[10px] tracking-[0.4em] uppercase"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(176,251,205,0.25)" }}
            >
              Workflow
            </span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(to left, rgba(176,251,205,0.1), transparent)" }} />
          </div>

          <WorkflowSteps />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SPECS BAR
         ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.04] bg-white/[0.01] py-16">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-12 px-6 sm:gap-20">
          {[
            { value: 4, suffix: "", label: "Camera Models" },
            { value: 360, suffix: "°", label: "Panoramic FOV" },
            { value: 8, suffix: "+", label: "Historic Eras" },
            { value: 5, suffix: "", label: "Gesture Controls" },
          ].map(({ value, suffix, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <span
                className="text-2xl font-light tracking-wider"
                style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(176,251,205,0.4)" }}
              >
                <AnimatedCounter end={value} suffix={suffix} />
              </span>
              <span
                className="text-[9px] tracking-[0.3em] uppercase"
                style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(176,251,205,0.15)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-white/[0.04] py-28 sm:py-36">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 40% 50% at 50% 60%, rgba(176, 251, 205, 0.03) 0%, transparent 70%)",
          }}
        />

        <CtaSection onNavigate={handleNavigateToCreate} />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CamCraft"
              width={20}
              height={20}
              className="h-5 w-5 object-contain opacity-40"
            />
            <span
              className="text-[10px] tracking-[0.3em] uppercase text-white/25"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              CamCraft
            </span>
          </div>
          <nav className="flex items-center gap-6">
            {[
              { label: "Cameras", href: "/create" },
              { label: "Generate", href: "/generate" },
              { label: "Gallery", href: "/gallery" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-[10px] tracking-[0.2em] uppercase text-white/15 transition-colors duration-200 hover:text-[#B0FBCD]/40"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </motion.div>
  );
}
