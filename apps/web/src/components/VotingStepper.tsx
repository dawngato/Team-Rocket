"use client";

import React from "react";
import Link from "next/link";
import { Check, KeyRound, Lock, ShieldCheck } from "lucide-react";

export type VotingStep = 1 | 2 | 3;

export interface VotingStepperProps {
  currentStep: VotingStep;
  electionId: string;
  hasCredential?: boolean;
  hasReceipt?: boolean;
  receiptHandle?: string;
  className?: string;
}

export function VotingStepper({
  currentStep,
  electionId,
  hasCredential = false,
  hasReceipt = false,
  receiptHandle,
  className = "",
}: VotingStepperProps) {
  const steps = [
    {
      step: 1 as VotingStep,
      title: "Blind Credential",
      desc: "Private token from registrar",
      href: `/student/elections/${encodeURIComponent(electionId)}/credential`,
      icon: KeyRound,
      isCompleted: hasCredential || currentStep > 1,
      isCurrent: currentStep === 1,
    },
    {
      step: 2 as VotingStep,
      title: "Encrypted Booth",
      desc: "Ballot encryption & proof",
      href: `/student/elections/${encodeURIComponent(electionId)}/cast`,
      icon: Lock,
      isCompleted: hasReceipt || currentStep > 2,
      isCurrent: currentStep === 2,
    },
    {
      step: 3 as VotingStep,
      title: "Witnessed Receipt",
      desc: "Merkle inclusion tracker",
      href: receiptHandle
        ? `/student/receipts/${encodeURIComponent(receiptHandle)}?election_id=${encodeURIComponent(electionId)}`
        : undefined,
      icon: ShieldCheck,
      isCompleted: hasReceipt,
      isCurrent: currentStep === 3,
    },
  ];

  return (
    <nav
      aria-label="Ballot casting progress"
      className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-[#1E3352] dark:bg-[#132135] ${className}`.trim()}
    >
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 list-none m-0 p-0">
        {steps.map((item) => {
          const Icon = item.icon;
          const statusLabel = item.isCompleted
            ? "Completed"
            : item.isCurrent
            ? "Current step"
            : "Upcoming";

          const body = (
            <div
              className={`flex items-center gap-3.5 rounded-xl p-2.5 transition-colors ${
                item.isCurrent
                  ? "bg-[#157E92]/10 border border-[#157E92]/30 dark:bg-[#157E92]/20"
                  : item.isCompleted
                  ? "bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-[#1E3352]"
                  : "bg-slate-50/50 border border-transparent dark:bg-slate-900/30 opacity-70"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                  item.isCompleted
                    ? "bg-[#15805D] text-white"
                    : item.isCurrent
                    ? "bg-[#157E92] text-white"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
                aria-hidden="true"
              >
                {item.isCompleted ? <Check className="size-4 stroke-[3]" /> : <Icon className="size-4" />}
              </div>
              <div className="min-w-0">
                <span className="sr-only">Step {item.step}: {statusLabel} - </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Step {item.step}
                  </span>
                  {item.isCompleted && (
                    <span className="text-[10px] font-semibold text-[#15805D] dark:text-[#34D399]">
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#10233F] dark:text-white truncate">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                  {item.desc}
                </p>
              </div>
            </div>
          );

          return (
            <li key={item.step}>
              {item.href && !item.isCurrent ? (
                <Link
                  href={item.href}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] rounded-xl"
                  title={`Navigate to ${item.title}`}
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
