"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Lock,
  FileCheck2,
  UserCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export interface BallotBoxHeroProps {
  className?: string;
}

/**
 * Interactive overview of the intended voting and verification flow.
 */
export function BallotBoxHero({ className = "" }: BallotBoxHeroProps) {
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
      title: "1. Ballot Encryption",
      subhead: "Depends on the deployed client and key management",
      icon: Lock,
      shortLabel: "Client Sealing",
      badge: "Configuration-dependent protection",
      color: "border-cyan-500/40 text-[#116B7B] dark:text-cyan-400 bg-cyan-500/10",
      sampleValue: "DEMO ENCRYPTED PAYLOAD",
      highlight: "Intended device-side encryption",
      description:
        "The intended flow encrypts a ballot before transmission. The protection available depends on the deployed client, key management, and service configuration.",
    },
    {
      step: 2,
      title: "2. Eligibility and Ballot Separation",
      subhead: "Requires a reviewed credential protocol",
      icon: UserCheck,
      shortLabel: "Identity Separation",
      badge: "Protocol-dependent separation",
      color: "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
      sampleValue: "DEMO CREDENTIAL",
      highlight: "Intended credential flow",
      description:
        "A blind-credential protocol can separate eligibility from ballot records when implemented and configured correctly. This prototype does not establish that the deployed system prevents identity linkage.",
    },
    {
      step: 3,
      title: "3. Ballot Inclusion Evidence",
      subhead: "Requires a published proof and trusted root",
      icon: FileCheck2,
      shortLabel: "Receipt Audit",
      badge: "Evidence-dependent verification",
      color: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      sampleValue: "DEMO RECEIPT",
      highlight: "Intended checkpoint evidence",
      description:
        "A receipt may help check whether a ballot appears in published evidence. Verification requires a corresponding proof, a trusted root, and a verifier; a receipt alone does not establish tally correctness.",
    },
  ];

  const currentStep = steps.find((s) => s.step === activeStep) ?? steps[0];

  return (
    <motion.section
      data-testid="ballot-box-hero"
      aria-labelledby="ballot-box-title"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#07111e] p-6 sm:p-7 shadow-lg dark:shadow-2xl dark:shadow-cyan-950/20 w-full transition-colors ${className}`}
    >
      {/* Ambient decorative glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-2xl dark:bg-cyan-500/15" />

      {/* Top Institutional Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-[#157E92] dark:text-cyan-400 shadow-xs">
            <Lock className="size-5" />
          </span>
          <div>
            <h3
              id="ballot-box-title"
              className="text-sm sm:text-base font-bold text-[#10233F] dark:text-white"
            >
              Voting and Verification Overview
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Prototype flow • Configuration determines available protections
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Evidence depends on configuration
        </span>
      </div>

      {/* Interactive Step Switcher with Gliding Motion Pill */}
      <div className="relative z-10 grid grid-cols-3 gap-2 mt-4" role="tablist">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.step;
          return (
            <motion.button
              key={s.step}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`step-panel-${s.step}`}
              id={`step-tab-${s.step}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveStep(s.step)}
              className={`relative rounded-2xl p-2.5 sm:p-3 text-left transition-colors border ${
                isActive
                  ? "border-cyan-500/60 dark:border-cyan-400/50 shadow-xs"
                  : "border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBallotStepIndicator"
                  className="absolute inset-0 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/40 ring-1 ring-cyan-500/40"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Icon className="size-3 text-[#157E92] dark:text-cyan-400 shrink-0" />
                  <span>Step {s.step}</span>
                </div>
                <span
                  className={`block text-xs sm:text-sm font-bold truncate mt-1 ${
                    isActive
                      ? "text-[#10233F] dark:text-cyan-200"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {s.shortLabel}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Active Step Content with Smooth Layout & Fade Transitions */}
      <div className="relative z-10 mt-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.step}
            id={`step-panel-${currentStep.step}`}
            role="tabpanel"
            aria-labelledby={`step-tab-${currentStep.step}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <h4 className="font-bold text-[#10233F] dark:text-white text-sm">
                  {currentStep.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentStep.subhead}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${currentStep.color}`}
              >
                {currentStep.badge}
              </span>
            </div>

            {/* Cryptographic Sample Display with Micro-Interaction */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.15 }}
              className="rounded-xl bg-white dark:bg-[#040913] p-3 border border-slate-200/90 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2 shadow-xs"
            >
              <div className="truncate">
                <span className="text-slate-400 select-none mr-1.5 font-sans text-[10px] uppercase tracking-wider font-semibold">
                  {currentStep.highlight}:
                </span>
                <span className="font-semibold text-[#157E92] dark:text-cyan-400">
                  {currentStep.sampleValue}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copySlip(currentStep.sampleValue, `slip-${currentStep.step}`)
                }
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Copy sample cryptographic commitment"
                aria-label="Copy sample value"
              >
                {copied === `slip-${currentStep.step}` ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                    <Check className="size-3.5" />
                    <span>Copied</span>
                  </span>
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </motion.div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
              {currentStep.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Institutional Trust Bar */}
      <div className="relative z-10 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>Multi-Party Witness Verification</span>
        </span>
        <Link
          href="/how-it-works"
          className="font-semibold text-[#157E92] hover:text-[#0d5967] dark:text-cyan-400 dark:hover:text-cyan-300 hover:underline flex items-center gap-1"
        >
          <span>Architecture Specs</span>
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </motion.section>
  );
}
