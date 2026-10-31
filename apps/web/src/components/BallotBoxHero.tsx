"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, Copy, EyeOff, Lock, FileCheck2, UserCheck, Stamp } from "lucide-react";

/**
 * Human Campus Voting Booth Experience (No Coding Jargon)
 * Simple, relatable, and authentic for every college student.
 */
export function BallotBoxHero() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copied, setCopied] = useState<string | null>(null);

  const copySlip = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = [
    {
      step: 1,
      title: "1. Secret Digital Curtain",
      subhead: "Inside Your Private Voting Booth",
      icon: EyeOff,
      badge: "Nobody Can Peek",
      color: "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10",
      sampleValue: "SEALED-VOTE-ENCRYPTED",
      highlight: "Phone/Laptop Screen",
      description: "Jaise real booth me parda gira hota hai, waise hi aapka vote screen se nikalne se pehle lock ho jata hai. HOD, Principal ya system admin koi bhi nahi dekh sakta aapne kisko chuna."
    },
    {
      step: 2,
      title: "2. Detach Student ID",
      subhead: "Identity Separated from Ballot",
      icon: Stamp,
      badge: "Zero Bias Guaranteed",
      color: "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10",
      sampleValue: "SLIP-ID #HIM-2026-X89",
      highlight: "Digital Parchi Box",
      description: "Aapki Roll Number aur ID vote se alag kar di jaati hai. Box me sirf ek anonymous vote girta hai jiska kisi student ke naam se koi connection nahi rehta."
    },
    {
      step: 3,
      title: "3. Keep Your Receipt",
      subhead: "Track Your Vote on Counting Day",
      icon: FileCheck2,
      badge: "Verified in Ballot Box",
      color: "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      sampleValue: "RECEIPT: 0x8f2a...91bc (Verified)",
      highlight: "Public Digital Box",
      description: "Aapko ek secret receipt number milta hai. Counting ke din aap search karke dekh sakte ho ki aapka vote dabba me sach me count hua ya nahi!"
    }
  ];

  return (
    <section
      data-testid="ballot-box-hero"
      aria-labelledby="ballot-box-title"
      className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#1E3352] bg-white/95 dark:bg-[#0D1D30] p-6 shadow-md w-full"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1E3352]/70 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
            <Lock className="size-4" />
          </span>
          <div>
            <h3 id="ballot-box-title" className="text-sm font-bold text-[#10233F] dark:text-white">
              Fair Voting Guarantee
            </h3>
            <p className="text-[11px] text-slate-500">
              Campus Democracy • 100% Secret • 100% Trackable
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="size-3" /> Live & Protected
        </span>
      </div>

      {/* Interactive Step Switcher */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setActiveStep(s.step)}
              className={`rounded-xl p-2.5 text-left transition-all border ${
                activeStep === s.step
                  ? "bg-cyan-50/60 dark:bg-[#13253B] border-cyan-500 shadow-xs ring-1 ring-cyan-500/30"
                  : "border-slate-200/60 dark:border-[#1E3352]/50 hover:bg-slate-50/50 dark:hover:bg-[#102033]"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Icon className="size-3 text-cyan-500" />
                <span>Step {s.step}</span>
              </div>
              <span className={`block text-xs font-bold truncate mt-1 ${
                activeStep === s.step ? "text-[#157E92] dark:text-[#38BDF8]" : "text-slate-700 dark:text-slate-300"
              }`}>
                {s.step === 1 ? "Private Booth" : s.step === 2 ? "No Name Leak" : "Your Receipt"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Step Content */}
      <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-[#071322] border border-slate-200/70 dark:border-[#1E3352] p-4 space-y-3">
        {steps.filter(s => s.step === activeStep).map((cur) => (
          <div key={cur.step} className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#10233F] dark:text-white block">
                  {cur.title}
                </span>
                <span className="text-[11px] text-slate-500">
                  {cur.subhead}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cur.color}`}>
                {cur.badge}
              </span>
            </div>

            {/* Visual Sample Bar */}
            <div className="rounded-xl bg-white dark:bg-[#0B1524] p-3 border border-slate-200/60 dark:border-[#1E3352]/60 font-mono text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-slate-400 select-none mr-1.5">{cur.highlight}:</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">{cur.sampleValue}</span>
              </div>
              <button
                type="button"
                onClick={() => copySlip(cur.sampleValue, `slip-${cur.step}`)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1"
                title="Copy sample"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
            {copied === `slip-${cur.step}` && (
              <p className="text-[10px] text-emerald-500 font-semibold">Copied to clipboard!</p>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white/40 dark:bg-black/20 p-2.5 rounded-xl border border-slate-200/40 dark:border-white/5">
              {cur.description}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Simple Trust Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3352]/70 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>Independent Student Observers</span>
        </span>
        <span className="font-semibold text-[#157E92] dark:text-[#38BDF8]">
          Fair & Tamper-Proof
        </span>
      </div>
    </section>
  );
}
