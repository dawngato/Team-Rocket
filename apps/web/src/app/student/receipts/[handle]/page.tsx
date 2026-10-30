"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  Copy,
  ArrowRight,
  ExternalLink,
  Layers,
} from "lucide-react";
import { ElectionState } from "../../../../lib/types";

export default function MyReceiptPage() {
  const params = useParams();
  const rawHandle = (params?.handle as string) || "HV_24F8_19C2";
  const handleFormatted = decodeURIComponent(rawHandle).replace(/_/g, " ");

  const [activeStage, setActiveStage] = useState<number>(1);
  const [copied, setCopied] = useState(false);

  const stages: Array<{
    title: string;
    state: ElectionState;
    detail: string;
    timestamp: string;
  }> = [
    {
      title: "Ballot Committed",
      state: "PENDING_WITNESS",
      detail: "The casting gateway committed your encrypted ballot to the append only leaf sequence.",
      timestamp: "30 Oct 2026, 10:14:02 UTC",
    },
    {
      title: "Witness Cosigned",
      state: "WITNESSED",
      detail: "The local witness emulator recorded batch checkpoint digest 8f2d34ac.",
      timestamp: "30 Oct 2026, 10:15:30 UTC",
    },
    {
      title: "Chain Finality Anchor",
      state: "ANCHOR_FINALIZED",
      detail: "The local chain adapter recorded the checkpoint at its configured demonstration depth.",
      timestamp: "30 Oct 2026, 10:28:45 UTC",
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(handleFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Development Evidence Receipt
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Voter Evidence Receipt
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Track the development checkpoint and chain states recorded for this fixture. Independent production operation is not established here.
          </p>
        </div>

        {/* Copy Receipt Handle */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#132135] p-2 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
          <span className="font-mono font-bold text-sm text-[#10233F] dark:text-white px-2">
            {handleFormatted}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Copy receipt handle"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {copied && (
        <div className="p-3 bg-[#15805D]/10 border border-[#15805D]/30 text-[#15805D] text-xs font-semibold rounded-lg text-center animate-fadeIn">
          Receipt handle copied to clipboard
        </div>
      )}

      {/* Evidence Timeline */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
            Checkpoint Progression Timeline
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Green state indicators appear only for cryptographically confirmed checkpoints.
          </p>
        </div>

        <div className="space-y-6">
          {stages.map((stage, idx) => {
            const isCompleted = idx <= activeStage;
            const isCurrent = idx === activeStage;

            return (
              <div
                key={stage.title}
                className={`p-5 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-[#157E92] bg-[#157E92]/5 dark:bg-[#157E92]/15 shadow-sm"
                    : isCompleted
                    ? "border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]"
                    : "border-slate-100 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-900/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCompleted
                          ? "bg-[#15805D] text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white">
                      {stage.title}
                    </h3>
                  </div>
                  <StateBadge state={stage.state} size="sm" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-10 leading-relaxed">
                  {stage.detail}
                </p>
                <div className="text-[11px] font-mono text-slate-400 pl-10 pt-2">
                  Timestamp: {stage.timestamp}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-[#1E3352] flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <Lock className="w-5 h-5 text-[#157E92] flex-shrink-0" aria-hidden="true" />
          <p>
            <strong>Secrecy guarantee:</strong> Your receipt does not reveal your selection. It mathematically proves only that your encrypted ballot was committed at leaf index 1428.
          </p>
        </div>

        {/* Call to Action to Verify Merkle Inclusion */}
        <div className="pt-2 flex flex-col sm:flex-row gap-4">
          <Link
            href={`/student/receipts/${encodeURIComponent(rawHandle)}/inclusion`}
            className="flex-1 min-h-[44px] px-6 py-3 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>Verify Merkle Tree Inclusion Proof</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/student/results"
            className="min-h-[44px] px-6 py-3 font-bold text-[#10233F] dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span>View Election Results</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
