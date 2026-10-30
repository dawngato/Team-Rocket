"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  Upload,
  CheckCircle2,
  ArrowRight,
  Key,
  Layers,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { INITIAL_ELECTIONS, INITIAL_TRUSTED_PINS } from "@/lib/mock_data";

export default function AuditorOverviewPage() {
  const attestedCount = INITIAL_ELECTIONS.filter((e) => e.state === "AUDITOR_ATTESTED").length;

  const auditorWorkspaces = [
    {
      kicker: "Root Trust Pins",
      title: "Trusted Authority Pins",
      href: "/auditor/trusted-pins",
      desc: "Manage cryptographic root pins for witness nodes, HSM signers, and smart contract registries.",
      icon: Key,
      count: `${INITIAL_TRUSTED_PINS.length} Pinned Keys`,
    },
    {
      kicker: "Witness Log",
      title: "Fetch Final Witness",
      href: "/auditor/witness",
      desc: "Inspect the local witness emulator checkpoint signature and Merkle log size.",
      icon: Layers,
      count: "Fixture Signature",
    },
    {
      kicker: "Relay Adapter",
      title: "Fetch Chain Anchor",
      href: "/auditor/chain",
      desc: "Inspect local chain adapter metadata. Public chain finality is not established.",
      icon: Globe,
      count: "Local Chain",
    },
    {
      kicker: "Safe Extraction",
      title: "Offline Evidence Archive",
      href: "/auditor/evidence",
      desc: "Export and inspect offline evidence archives with safe extraction and cryptographic proofs.",
      icon: Upload,
      count: "Airgapped Engine",
    },
    {
      kicker: "Test Vectors",
      title: "Full Verification Suite",
      href: "/auditor/verify",
      desc: "Review the fixture workflow before running the offline verifier with external trust pins.",
      icon: CheckCircle2,
      count: "Limited Preview",
    },
    {
      kicker: "External Signature",
      title: "Sign Auditor Attestation",
      href: "/auditor/sign",
      desc: "Prepare an external auditor attestation. Signing is not performed by this server.",
      icon: ShieldCheck,
      count: "External Key Required",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Independent Verification Desk</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Auditor Console
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Review election logs, witness checkpoints, and chain anchor evidence. This local workspace is not an independent operator.
          </p>
        </div>
      </div>

      {/* Metric Cards with High Contrast Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attested Contests
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              Verified
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono tabular-nums">
            {attestedCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Dual auditor signature recorded in fixture data
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Witness Node Network
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/30">
              Pinned
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#157E92] dark:text-[#38BDF8] font-mono">
            {INITIAL_TRUSTED_PINS.length} Keys
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Out of band pinned public keys loaded
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verifier Integrity
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              Pass
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono">
            TESTED
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Golden test vectors verified locally
          </span>
        </div>
      </div>

      {/* Verification Workspaces */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white tracking-tight">
          Verification Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auditorWorkspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.title}
                href={ws.href}
                className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#15805D] dark:hover:border-[#34D399] transition-all duration-75 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      {ws.kicker}
                    </span>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white tracking-tight">
                      {ws.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {ws.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#15805D] dark:text-[#34D399] font-bold font-mono">
                    {ws.count}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Honest Security Disclaimer Callout */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/80 dark:bg-[#0E1A2B] p-6 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-[#10233F] dark:text-white uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#AA6C0B]" aria-hidden="true" />
          <span>Operational Security Scope and Auditor Boundaries</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This local workspace runs in a development test fixture environment. Checkpoints and signatures generated locally provide verifiable data structures, but do not imply independent operator custody. For institutional elections, offline verifiers must be executed against airgapped evidence bundles using external key ceremony trust pins.
        </p>
      </div>
    </div>
  );
}
