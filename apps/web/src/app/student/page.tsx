"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Vote,
  FileCheck,
  Layers,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { INITIAL_ELECTIONS } from "@/lib/mock_data";
import { StateBadge } from "@/components/StateBadge";

export default function StudentPortalOverviewPage() {
  const activeElections = INITIAL_ELECTIONS.filter((e) => e.state === "OPEN");

  const studentActions = [
    {
      kicker: "Voting Booth",
      title: "Active Contests",
      href: "/student/elections",
      desc: "Browse eligible student government contests and cast your encrypted vote.",
      icon: Vote,
      badge: `${activeElections.length} Active`,
      highlight: true,
    },
    {
      kicker: "Cryptographic Receipt",
      title: "My Receipt Tracker",
      href: "/student/receipts/HV_24F8_19C2",
      desc: "Check status of your cast ballot receipt across witness and chain checkpoints.",
      icon: FileCheck,
      badge: "HV_24F8_19C2",
      highlight: false,
    },
    {
      kicker: "Proof Verification",
      title: "Merkle Inclusion Proof",
      href: "/student/receipts/HV_24F8_19C2/inclusion",
      desc: "Check whether your receipt hash exists in the displayed witness root. This does not reveal your selection.",
      icon: Layers,
      badge: "Interactive Verifier",
      highlight: false,
    },
    {
      kicker: "Civic Rights",
      title: "Voter Help and Rights",
      href: "/student/help",
      desc: "Understand your ballot secrecy guarantees, coercion resistance, and voting rules.",
      icon: HelpCircle,
      badge: "Privacy Guide",
      highlight: false,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header with Institutional Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Student Voter Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Student Voting Hub
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Cast private ballots, obtain anonymous credentials, track receipts, and mathematically verify election inclusion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Roster Identity Verified</span>
          </span>
        </div>
      </div>

      {/* Institutional Status & Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Eligible Contests
          </span>
          <div className="text-2xl font-extrabold text-[#157E92] dark:text-[#38BDF8] font-mono tabular-nums">
            {activeElections.length} Active
          </div>
          <span className="text-xs text-slate-500 block">
            CS and Campus Council open
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Credential Token
          </span>
          <div className="text-2xl font-extrabold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>ISSUED</span>
          </div>
          <span className="text-xs text-slate-500 block truncate">
            Blind signature verified
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Last Cast Receipt
          </span>
          <div className="text-lg font-extrabold text-[#10233F] dark:text-white font-mono truncate">
            HV_24F8_19C2
          </div>
          <span className="text-xs text-slate-500 block">
            Witnessed in batch checkpoint
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Ballot Secrecy Invariant
          </span>
          <div className="text-2xl font-extrabold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <Lock className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>ENFORCED</span>
          </div>
          <span className="text-xs text-slate-500 block">
            Zero selection trace in receipt
          </span>
        </div>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {studentActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] dark:hover:border-[#38BDF8] transition-all duration-75 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] flex items-center justify-center flex-shrink-0 mt-1">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    {action.kicker}
                  </span>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-[#10233F] dark:text-white tracking-tight">
                      {action.title}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352]">
                      {action.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-0.5">
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
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#10233F] dark:text-white tracking-tight">
              Active Student Elections
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Encrypted submissions currently accepted by the campus voting booth.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {activeElections.length} Active
          </span>
        </div>
        <div className="space-y-3">
          {activeElections.map((el) => (
            <div
              key={el.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-bold text-sm text-[#10233F] dark:text-white tracking-tight">
                  {el.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Contest: {el.contest} | Cutoff: {new Date(el.issuance_cutoff_utc).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StateBadge state={el.state} size="sm" />
                <Link
                  href={`/student/elections/${el.id}`}
                  className="min-h-[36px] px-3.5 py-1.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] rounded-lg transition-all duration-75 ease-out text-xs flex items-center gap-1.5 shadow-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#132135]"
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
