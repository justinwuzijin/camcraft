"use client";

import React, { useState, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────────── */

type AnalysisScores = {
  composition: number;
  lighting: number;
  colorTone: number;
  exposure: number;
  subjectStory: number;
  technicalQuality: number;
};

type AnalysisResult = {
  scores: AnalysisScores;
  overall: number;
  compositionTips: string[];
  rigTips: string[];
  summary: string;
};

type Props = {
  imagePath: string;
  scene?: Record<string, string | undefined>;
  camera?: Record<string, string>;
};

/* ── Score criteria labels ─────────────────────────────────── */

const CRITERIA: { key: keyof AnalysisScores; label: string; icon: React.ReactNode }[] = [
  {
    key: "composition",
    label: "Composition",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5" y1="1" x2="5" y2="13" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <line x1="9" y1="1" x2="9" y2="13" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: "lighting",
    label: "Lighting",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 1V2.5M7 11.5V13M1 7H2.5M11.5 7H13M3 3L4 4M10 10L11 11M11 3L10 4M3 11L4 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "colorTone",
    label: "Color & Tone",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: "exposure",
    label: "Exposure",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 7H10M7 4V10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "subjectStory",
    label: "Subject & Story",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L8.5 5H12.5L9.5 7.5L10.5 11.5L7 9L3.5 11.5L4.5 7.5L1.5 5H5.5L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "technicalQuality",
    label: "Technical",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 3.5V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/* ── Score color helper ────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 80) return "#B0FBCD";
  if (score >= 60) return "#FBE8B0";
  if (score >= 40) return "#FBC8B0";
  return "#FBB0B0";
}

function scoreGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
}

/* ── Score bar component ───────────────────────────────────── */

function ScoreBar({
  label,
  score,
  icon,
  delay,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  delay: number;
}) {
  const color = scoreColor(score);

  return (
    <div
      className="space-y-1.5"
      style={{
        animation: `analysisFadeIn 0.4s ease-out ${delay}ms both`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/40">
          {icon}
          <span className="text-xs text-white/50">{label}</span>
        </div>
        <span
          className="text-xs tabular-nums"
          style={{ color, fontFamily: "var(--font-geist-mono)" }}
        >
          {score}
        </span>
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: color,
            opacity: 0.7,
            animation: `analysisBarGrow 0.8s ease-out ${delay + 100}ms both`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */

export default function ImageAnalysisPanel({ imagePath, scene, camera }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Fetch the image and convert to base64
      const imgRes = await fetch(imagePath);
      const blob = await imgRes.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const mimeType = blob.type || "image/jpeg";

      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType,
          scene: scene || {},
          camera: camera || {},
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis failed (${res.status})`);
      }

      const data: AnalysisResult = await res.json();
      setAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [imagePath, scene, camera]);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="text-[10px] tracking-[0.25em] uppercase text-white/25"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          AI Analysis
        </div>
        {analysis && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/20 hover:text-white/40 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
            >
              <path
                d="M3 5L7 9L11 5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Not yet analyzed */}
      {!analysis && !loading && !error && (
        <button
          onClick={runAnalysis}
          className="group flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#B0FBCD]/20 bg-[#B0FBCD]/[0.04] px-4 py-3 text-sm text-[#B0FBCD]/70 transition-all hover:border-[#B0FBCD]/35 hover:bg-[#B0FBCD]/[0.08] hover:text-[#B0FBCD]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform duration-300 group-hover:rotate-12"
          >
            <path
              d="M8 1V3M8 13V15M1 8H3M13 8H15M3.05 3.05L4.46 4.46M11.54 11.54L12.95 12.95M12.95 3.05L11.54 4.46M4.46 11.54L3.05 12.95"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Analyze Photo
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[#B0FBCD]/60" />
          </div>
          <span
            className="text-[10px] tracking-[0.2em] uppercase text-white/30"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Analyzing
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs text-red-400/80">
            {error}
          </div>
          <button
            onClick={runAnalysis}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/50 transition-all hover:border-white/20 hover:text-white/70"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {analysis && expanded && (
        <div className="space-y-5" style={{ animation: "analysisFadeIn 0.3s ease-out both" }}>
          {/* Overall score ring */}
          <div
            className="flex items-center gap-4"
            style={{ animation: "analysisFadeIn 0.4s ease-out both" }}
          >
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              {/* Background ring */}
              <svg className="absolute inset-0 h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="4"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={scoreColor(analysis.overall)}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(analysis.overall / 100) * 175.9} 175.9`}
                  style={{
                    opacity: 0.8,
                    animation: "analysisRingGrow 1s ease-out 0.2s both",
                  }}
                />
              </svg>
              {/* Score text */}
              <div className="text-center">
                <div
                  className="text-lg font-medium tabular-nums leading-none"
                  style={{ color: scoreColor(analysis.overall) }}
                >
                  {analysis.overall}
                </div>
                <div
                  className="mt-0.5 text-[8px] tracking-wider uppercase"
                  style={{
                    color: scoreColor(analysis.overall),
                    fontFamily: "var(--font-geist-mono)",
                    opacity: 0.6,
                  }}
                >
                  {scoreGrade(analysis.overall)}
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-white/60 leading-relaxed">{analysis.summary}</div>
            </div>
          </div>

          {/* Criteria scores */}
          <div className="space-y-3">
            {CRITERIA.map((c, i) => (
              <ScoreBar
                key={c.key}
                label={c.label}
                score={analysis.scores[c.key]}
                icon={c.icon}
                delay={i * 60}
              />
            ))}
          </div>

          {/* Improvement tips */}
          {analysis.compositionTips.length > 0 && (
            <div
              className="space-y-2.5"
              style={{ animation: "analysisFadeIn 0.4s ease-out 400ms both" }}
            >
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#B0FBCD]/50">
                  <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1" />
                  <line x1="4" y1="1" x2="4" y2="11" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
                  <line x1="8" y1="1" x2="8" y2="11" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
                </svg>
                <span
                  className="text-[10px] tracking-[0.15em] uppercase text-white/30"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  Composition Tips
                </span>
              </div>
              <div className="space-y-2 pl-0.5">
                {analysis.compositionTips.map((tip, i) => (
                  <div key={i} className="flex gap-2.5 text-xs leading-relaxed text-white/45">
                    <span className="mt-0.5 shrink-0 text-[#B0FBCD]/40">&#8227;</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.rigTips.length > 0 && (
            <div
              className="space-y-2.5"
              style={{ animation: "analysisFadeIn 0.4s ease-out 500ms both" }}
            >
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#FBE8B0]/50">
                  <path d="M2 4H10V9.5C10 10.052 9.552 10.5 9 10.5H3C2.448 10.5 2 10.052 2 9.5V4Z" stroke="currentColor" strokeWidth="1" />
                  <path d="M4 4V3C4 2.448 4.448 2 5 2H7C7.552 2 8 2.448 8 3V4" stroke="currentColor" strokeWidth="1" />
                  <circle cx="6" cy="7" r="1.5" stroke="currentColor" strokeWidth="0.8" />
                </svg>
                <span
                  className="text-[10px] tracking-[0.15em] uppercase text-white/30"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  Camera Rig Tips
                </span>
              </div>
              <div className="space-y-2 pl-0.5">
                {analysis.rigTips.map((tip, i) => (
                  <div key={i} className="flex gap-2.5 text-xs leading-relaxed text-white/45">
                    <span className="mt-0.5 shrink-0 text-[#FBE8B0]/40">&#8227;</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Re-analyze button */}
          <button
            onClick={runAnalysis}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[11px] tracking-wider text-white/30 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white/50"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1.5 6C1.5 3.515 3.515 1.5 6 1.5C8.485 1.5 10.5 3.515 10.5 6C10.5 8.485 8.485 10.5 6 10.5C4.615 10.5 3.385 9.87 2.55 8.88"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path d="M1.5 10V7H4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Re-analyze
          </button>
        </div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes analysisFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes analysisBarGrow {
          from {
            width: 0%;
          }
        }
        @keyframes analysisRingGrow {
          from {
            stroke-dasharray: 0 175.9;
          }
        }
      `}</style>
    </div>
  );
}
