"use client";

import React from "react";
import { CheckCircle2, Shield, Eye, Keyboard, FileCheck } from "lucide-react";

export default function AccessibilityStatementPage() {
  const commitments = [
    {
      title: "WCAG 2.2 Level AA Compliance",
      desc: "Every interface element meets or exceeds contrast ratios of 4.5 to 1 for body text and 3 to 1 for larger headings and interactive user controls.",
    },
    {
      title: "Keyboard Only Navigation",
      desc: "Every interactive task including registration, candidate inspection, ballot casting, and verification can be completed without a mouse. Logical tab order and visible high contrast focus indicators are strictly enforced.",
    },
    {
      title: "Screen Reader Support",
      desc: "All state badges, icons, and dynamic status updates provide explicit ARIA live announcements. Cryptographic evidence progression announces state transitions clearly.",
    },
    {
      title: "Touch Target Sizing",
      desc: "All interactive buttons, inputs, links, and touch targets maintain a minimum dimension of 44 by 44 points to prevent erroneous activations.",
    },
    {
      title: "No Information by Color Alone",
      desc: "Every status badge pairs color with dedicated icons, textual state labels, and descriptive role tags. Verified properties appear green only after cryptographic confirmation.",
    },
    {
      title: "Reduced Motion and Text Scaling",
      desc: "The system respects operating system preferences for reduced motion, disabling non essential transitions. Text scales gracefully up to 200 percent without horizontal truncation.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
          <Eye className="w-4 h-4" aria-hidden="true" />
          Universal Access Guarantee
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          Accessibility Statement
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          HimVote is built for every student, teacher, and administrator across the institution. We consider universal accessibility a core security requirement: an election system that cannot be used independently by all voters fails its democratic mandate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {commitments.map((item) => (
          <div
            key={item.title}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
              <h2 className="font-bold text-base text-[#10233F] dark:text-white">
                {item.title}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-slate-900/40 p-6 space-y-4">
        <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
          Assistance and Feedback
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          If you encounter any barrier while casting your vote, reviewing candidates, or inspecting receipts, please contact the campus accessibility coordinator at accessibility@himvote.example.in.
        </p>
      </div>
    </div>
  );
}
