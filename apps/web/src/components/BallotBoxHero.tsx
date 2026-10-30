"use client";

import { useState, type PointerEvent } from "react";
import { LockKeyhole, Move3d } from "lucide-react";

/**
 * Decorative, non-interactive 3D illustration for the public landing page.
 * It is deliberately kept outside the voting and proof controls. The copy is
 * part of the security boundary: this visual is not evidence of a cast vote.
 */
export function BallotBoxHero() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setTilt({
      x: Number((x * 5).toFixed(2)),
      y: Number((y * -4).toFixed(2)),
    });
  };

  return (
    <section
      data-testid="ballot-box-hero"
      aria-labelledby="ballot-box-title"
      className="ballot-box-panel relative overflow-hidden rounded-[2rem] border border-[#B8D7E0] bg-[#EAF7F9] p-5 shadow-[0_24px_70px_rgba(16,35,63,0.12)] dark:border-[#28516A] dark:bg-[#102A3B] sm:p-7"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#7DE3EF]/30 blur-3xl dark:bg-[#157E92]/25" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[#F8C66D]/20 blur-3xl" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#157E92] dark:text-[#7DE3EF]">
            <Move3d className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Conceptual visual model</span>
          </div>
          <h2 id="ballot-box-title" className="max-w-[300px] text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#10233F] dark:text-white">
            A ballot moves through accountable boundaries
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-[#AA6C0B]/40 bg-[#FFF4D8] px-2.5 py-1 text-[11px] font-semibold text-[#7A4D05] dark:border-[#AA6C0B]/60 dark:bg-[#3C2D16] dark:text-[#F8C66D]">
          Visual only
        </span>
      </div>

      <div
        className="ballot-box-stage relative mx-auto mt-2 h-[270px] max-w-[420px] [perspective:900px]"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        aria-hidden="true"
      >
        <div
          className="ballot-box-scene absolute inset-0"
          style={{ transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }}
        >
          <div className="ballot-box-shadow absolute bottom-6 left-1/2 h-8 w-[68%] -translate-x-1/2 rounded-[50%] bg-[#10233F]/20 blur-xl" />
          <div className="ballot-box-body absolute bottom-9 left-1/2 h-[150px] w-[230px] -translate-x-1/2 rounded-[22px] border border-[#B5DCE4] bg-gradient-to-br from-[#F9FEFF] via-[#D8F2F5] to-[#91C9D4] shadow-[18px_24px_24px_rgba(16,35,63,0.2)] dark:border-[#4B8798] dark:from-[#C7EEF2] dark:via-[#78B8C4] dark:to-[#377789]">
            <div className="absolute -right-3 top-4 h-[126px] w-4 skew-y-[-18deg] rounded-r-lg border-r border-[#6BA4B0] bg-[#73AEB9]/80" />
            <div className="absolute inset-x-5 bottom-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[#157E92] dark:text-[#0B3445]">
              <span>SecureVote</span>
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="ballot-box-lid absolute bottom-[145px] left-1/2 h-[74px] w-[246px] -translate-x-1/2 -skew-x-[13deg] rounded-[18px] border border-[#A8D7DF] bg-gradient-to-br from-[#FFFFFF] via-[#DDF5F7] to-[#8DC6D1] shadow-[14px_18px_18px_rgba(16,35,63,0.18)] dark:border-[#4B8798] dark:from-[#D8F6F8] dark:via-[#85C6D1] dark:to-[#3C8293]" />
          <div className="ballot-box-slot absolute bottom-[180px] left-1/2 z-10 h-3.5 w-[112px] -translate-x-1/2 -skew-x-[13deg] rounded-full border border-[#061A2D] bg-[#061A2D] shadow-[0_0_0_4px_rgba(21,126,146,0.18),0_4px_0_#5C9BA7]" />
          <div className="ballot-box-paper absolute bottom-[182px] left-1/2 z-20 h-[74px] w-[72px] -translate-x-1/2 rotate-[8deg] rounded-sm border border-[#D8E2E8] bg-white p-2 shadow-[5px_8px_8px_rgba(16,35,63,0.18)]">
            <div className="h-1.5 w-10 rounded-full bg-[#157E92]/35" />
            <div className="mt-2 space-y-1.5">
              <div className="h-1 w-full rounded-full bg-[#B7C8D2]" />
              <div className="h-1 w-4/5 rounded-full bg-[#B7C8D2]" />
              <div className="h-1 w-3/5 rounded-full bg-[#B7C8D2]" />
            </div>
          </div>
          <div className="absolute bottom-[76px] left-[16%] h-2 w-2 rounded-full bg-[#34D399] shadow-[0_0_0_6px_rgba(52,211,153,0.15)]" />
          <div className="absolute bottom-[64px] right-[17%] h-2 w-2 rounded-full bg-[#38BDF8] shadow-[0_0_0_6px_rgba(56,189,248,0.14)]" />
        </div>
      </div>

      <p className="relative z-10 mt-1 text-xs leading-relaxed text-[#31536A] dark:text-[#B8D5E0]">
        Decorative only. A successful cast, witness checkpoint, inclusion proof, and tally verification come from the authoritative services and standalone verifier—not from this animation.
      </p>
    </section>
  );
}
