"use client";

import { useState, type PointerEvent } from "react";
import {
  Activity,
  Fingerprint,
  Layers3,
  Link2,
  ShieldCheck,
} from "lucide-react";

type EvidenceStage = "manifest" | "witness" | "anchor";

interface StageDefinition {
  id: EvidenceStage;
  label: string;
  title: string;
  value: string;
  description: string;
  icon: typeof ShieldCheck;
  tone: "teal" | "green" | "amber";
}

const STAGES: StageDefinition[] = [
  {
    id: "manifest",
    label: "Manifest",
    title: "Frozen election context",
    value: "8f2d 34ac 91e7",
    description: "The development fixture binds the election rules, roster commitment, and candidate order before the evidence path begins.",
    icon: Fingerprint,
    tone: "teal",
  },
  {
    id: "witness",
    label: "Witness",
    title: "Merkle checkpoint",
    value: "3,120 leaves",
    description: "The local witness emulator records an ordered checkpoint. Its signature is test evidence, not independent operator custody.",
    icon: Layers3,
    tone: "green",
  },
  {
    id: "anchor",
    label: "Anchor",
    title: "Chain commitment",
    value: "Local fixture",
    description: "The development chain adapter records a non identifying checkpoint commitment. Public chain finality remains a release gate.",
    icon: Link2,
    tone: "amber",
  },
];

const toneClasses = {
  teal: {
    text: "text-[#7DE3EF]",
    border: "border-[#157E92]/60",
    fill: "bg-[#157E92]/20",
    dot: "bg-[#38BDF8]",
  },
  green: {
    text: "text-[#8BE4B7]",
    border: "border-[#15805D]/60",
    fill: "bg-[#15805D]/20",
    dot: "bg-[#34D399]",
  },
  amber: {
    text: "text-[#F8C66D]",
    border: "border-[#AA6C0B]/70",
    fill: "bg-[#AA6C0B]/20",
    dot: "bg-[#FBBF24]",
  },
} as const;

export function EvidenceOrbit() {
  const [activeStage, setActiveStage] = useState<EvidenceStage>("witness");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const active = STAGES.find((stage) => stage.id === activeStage) ?? STAGES[1];
  const ActiveIcon = active.icon;
  const activeTone = toneClasses[active.tone];

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setTilt({ x: Number((x * 7).toFixed(2)), y: Number((y * -6).toFixed(2)) });
  };

  return (
    <section
      aria-labelledby="evidence-orbit-title"
      className="relative mx-auto w-full max-w-[560px]"
    >
      <div
        className="evidence-orbit-stage relative min-h-[470px] overflow-hidden rounded-[2rem] border border-[#2D5577] bg-[#091827] px-5 pb-5 pt-6 text-white shadow-[0_28px_80px_rgba(16,35,63,0.28)] sm:px-7"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(21,126,146,0.28),transparent_36%),radial-gradient(circle_at_20%_86%,rgba(170,108,11,0.16),transparent_34%)]" />
        <div className="evidence-orbit-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-[#8FAFC5]">
              <Activity className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
              <span>Evidence observatory</span>
            </div>
            <h2 id="evidence-orbit-title" className="max-w-[270px] text-2xl font-semibold leading-tight tracking-[-0.03em] text-white [text-wrap:balance]">
              See how a record moves toward review
            </h2>
          </div>
          <span className="rounded-full border border-[#AA6C0B]/50 bg-[#AA6C0B]/15 px-2.5 py-1 text-[11px] font-semibold text-[#F8C66D]">
            Local fixture
          </span>
        </div>

        <div
          className="evidence-orbit-tilt relative z-10 mt-4 min-h-[278px] [perspective:1200px]"
          style={{
            transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          }}
          aria-label="Three dimensional development evidence diagram"
        >
          <div className="absolute left-[8%] right-[8%] top-12 h-[218px] rounded-[1.75rem] border border-[#2D5577] bg-[#0D243A]/95 shadow-[0_24px_45px_rgba(0,0,0,0.3)] [transform:rotateX(58deg)_rotateZ(-8deg)_translateZ(-32px)] [transform-style:preserve-3d]" />
          <div className="absolute left-[15%] right-[15%] top-[68px] h-[160px] rounded-[1.35rem] border border-[#3C6D8B]/70 bg-[#102D47]/90 [transform:rotateX(58deg)_rotateZ(-8deg)_translateZ(-8px)] [transform-style:preserve-3d]">
            <div className="evidence-orbit-signal absolute left-[18%] right-[18%] top-1/2 h-px bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent" />
            <div className="evidence-orbit-signal absolute left-1/2 top-[22%] h-[56%] w-px bg-gradient-to-b from-transparent via-[#34D399] to-transparent" />
          </div>

          <div className="absolute left-1/2 top-[104px] flex h-[112px] w-[112px] -translate-x-1/2 items-center justify-center rounded-full border border-[#34D399]/70 bg-[#0A2134]/95 shadow-[0_0_0_14px_rgba(21,126,146,0.08),0_0_55px_rgba(52,211,153,0.22)] [transform:translateZ(42px)] [transform-style:preserve-3d]">
            <div className="absolute inset-3 rounded-full border border-dashed border-[#34D399]/50" />
            <div className="relative flex flex-col items-center gap-1 text-center">
              <ShieldCheck className="h-6 w-6 text-[#8BE4B7]" aria-hidden="true" />
              <span className="text-[10px] font-semibold tracking-[0.13em] text-[#B6D0DE]">Checkpoint</span>
              <span className="font-mono text-[11px] text-[#8BE4B7]">sha256</span>
            </div>
          </div>

          <div className="absolute left-[7%] top-[38px] w-[175px] rounded-xl border border-[#157E92]/60 bg-[#0E2A43]/95 p-3 shadow-[0_18px_35px_rgba(0,0,0,0.24)] [transform:translateZ(78px)_rotateZ(-3deg)] [transform-style:preserve-3d]">
            <div className="mb-2 flex items-center justify-between text-[10px] text-[#8FAFC5]">
              <span>Manifest digest</span>
              <Fingerprint className="h-3.5 w-3.5 text-[#7DE3EF]" aria-hidden="true" />
            </div>
            <p className="font-mono text-xs font-semibold text-[#D8F7FA]">8f2d 34ac 91e7</p>
            <p className="mt-1 text-[10px] text-[#8FAFC5]">Rules and roster bound</p>
          </div>

          <div className="absolute bottom-[22px] right-[6%] w-[185px] rounded-xl border border-[#AA6C0B]/70 bg-[#2A2730]/95 p-3 shadow-[0_18px_35px_rgba(0,0,0,0.28)] [transform:translateZ(92px)_rotateZ(3deg)] [transform-style:preserve-3d]">
            <div className="mb-2 flex items-center justify-between text-[10px] text-[#B9A6A0]">
              <span>Anchor record</span>
              <Link2 className="h-3.5 w-3.5 text-[#F8C66D]" aria-hidden="true" />
            </div>
            <p className="font-mono text-xs font-semibold text-[#FFF0CF]">Local fixture</p>
            <p className="mt-1 text-[10px] text-[#B9A6A0]">No public finality claim</p>
          </div>
        </div>

        <div className="relative z-10 border-t border-[#2D5577]/80 pt-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-lg border p-2 ${activeTone.border} ${activeTone.fill}`}>
              <ActiveIcon className={`h-4 w-4 ${activeTone.text}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#8FAFC5]">Current layer</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{active.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#AFC4D2]">{active.description}</p>
              <p className={`mt-2 font-mono text-xs font-semibold ${activeTone.text}`}>{active.value}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Evidence layers">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              const isActive = stage.id === activeStage;
              const tone = toneClasses[stage.tone];
              return (
                <button
                  key={stage.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`evidence-panel-${stage.id}`}
                  onClick={() => setActiveStage(stage.id)}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold select-none transition-all duration-75 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7DE3EF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#091827] ${
                    isActive
                      ? `${tone.border} ${tone.fill} ${tone.text}`
                      : "border-[#2D5577] text-[#8FAFC5] hover:border-[#5A86A2] hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{stage.label}</span>
                </button>
              );
            })}
          </div>
          <p id={`evidence-panel-${activeStage}`} className="sr-only" aria-live="polite">
            {active.title}. {active.description}
          </p>
        </div>
      </div>
    </section>
  );
}
