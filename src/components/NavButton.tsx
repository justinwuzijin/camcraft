import { forwardRef } from "react";
import Link from "next/link";

// ── SVG Icons ─────────────────────────────────────────────────
const BackArrow = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
  >
    <path
      d="M10 12L6 8L10 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GalleryGrid = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <rect x="1" y="1" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
    <rect x="8" y="1" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
    <rect x="1" y="8" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
    <rect x="8" y="8" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const HomeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <path
      d="M2 7L7 2.5L12 7M3.5 6V11.5H5.75V8.75H8.25V11.5H10.5V6"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GenerateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M7 4.5V9.5M4.5 7H9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const NAV_ICONS = {
  back: BackArrow,
  gallery: GalleryGrid,
  home: HomeIcon,
  generate: GenerateIcon,
} as const;

// ── Variants ──────────────────────────────────────────────────
//
// "header"  — used in the sticky headers of /generate and /gallery.
//             Subtle text link, no background fill.
//
// "overlay" — used floating over pano/viewer full-screen content.
//             Glass-morphism pill with backdrop blur.

type NavVariant = "header" | "overlay";

type NavButtonProps = {
  href: string;
  icon?: keyof typeof NAV_ICONS;
  label?: string;
  variant?: NavVariant;
  className?: string;
  onClick?: () => void;
  badgeCount?: number;
  badgePulse?: boolean;
};

const VARIANT_CLASSES: Record<NavVariant, string> = {
  header:
    "group relative flex items-center gap-2 text-white/40 transition-all duration-200 hover:text-white/70",
  overlay:
    "group relative flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/[0.08] px-4 py-2 text-[13px] tracking-wide text-white/70 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.14] hover:text-white/90",
};

function Badge({ count, pulse }: { count: number; pulse?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={`absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#B0FBCD] px-1 text-[10px] font-bold leading-none text-[#060608] shadow-[0_0_8px_rgba(176,251,205,0.4)]${pulse ? " animate-[badgePulse_0.4s_ease-out]" : ""}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export const NavButton = forwardRef<HTMLAnchorElement | HTMLButtonElement, NavButtonProps>(
  function NavButton(
    { href, icon, label, variant = "header", className = "", onClick, badgeCount, badgePulse },
    ref,
  ) {
    const Icon = icon ? NAV_ICONS[icon] : null;

    const badge = badgeCount != null && badgeCount > 0
      ? <Badge count={badgeCount} pulse={badgePulse} />
      : null;

    // When onClick is provided without href navigation (e.g. "Back" as a button)
    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          onClick={onClick}
          className={`${VARIANT_CLASSES[variant]} ${className}`}
        >
          {Icon && <Icon />}
          {label && (
            <span
              className="text-sm tracking-wide"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {label}
            </span>
          )}
          {badge}
        </button>
      );
    }

    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={`${VARIANT_CLASSES[variant]} ${className}`}
      >
        {Icon && <Icon />}
        {label && (
          <span
            className="text-sm tracking-wide"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {label}
          </span>
        )}
        {badge}
      </Link>
    );
  },
);
