"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Vote, Key, FileCheck, Layers, HelpCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { INITIAL_ELECTIONS } from "@/lib/mock_data";
import { StateBadge } from "@/components/StateBadge";

export default function StudentPortalOverviewPage() {
  const activeElections = INITIAL_ELECTIONS.filter((e) => e.state === "OPEN");

  const studentActions = [
    {
      title: "Active Elections",
      href: "/student/elections",
      desc: "Browse eligible student government contests and cast your encrypted vote.",
      icon: Vote,
      badge: `${activeElections.length} Active`,
    },
    {
      title: "My Receipt Tracker",
      href: "/student/receipts/HV_24F8_19C2",
      desc: "Check status of your cast ballot receipt across witness and chain checkpoints.",
      icon: FileCheck,
      badge: "HV_24F8_19C2",
    },
    {
      title: "Merkle Inclusion Proof",
      href: "/student/receipts/HV_24F8_19C2/inclusion",
      desc: "Cryptographically prove that your receipt hash exists in the certified witness root.",
      icon: Layers,
      badge: "Interactive Verifier",
    },
    {
      title: "Voter Help and Rights",
      href: "/student/help",
      desc: "Understand your ballot secrecy guarantees, coercion resistance, and voting rules.",
      icon: HelpCircle,
      badge: "Privacy Guide",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
            Voter Workspace
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Student Voting Hub
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Cast private ballots, obtain anonymous credentials, track receipts, and mathematically verify election inclusion.
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {studentActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] transition-colors flex flex-col justify-between space-y-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#157E92]/10 text-[#157E92] flex items-center justify-center flex-shrink-0 mt-1">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
                      {action.title}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {action.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {action.desc}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs font-bold text-[#157E92] dark:text-[#38BDF8]">
                <span>Open Workspace</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Active Elections Quick Peek */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
          Active Student Elections
        </h2>
        <div className="space-y-3">
          {activeElections.map((el) => (
            <div
              key={el.id}
              className="p-4 rounded-lg border border-slate-100 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-bold text-sm text-[#10233F] dark:text-white">
                  {el.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contest: {el.contest} | Cutoff: {new Date(el.issuance_cutoff_utc).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StateBadge state={el.state} size="sm" />
                <Link
                  href={`/student/elections/${el.id}`}
                  className="min-h-[36px] px-3 py-1.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>Vote Now</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
