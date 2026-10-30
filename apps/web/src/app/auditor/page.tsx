"use client";

import React from "react";
import Link from "next/link";
import { Shield, ShieldCheck, Download, Upload, CheckCircle2, ArrowRight, Key, Layers, Globe } from "lucide-react";
import { INITIAL_ELECTIONS, INITIAL_TRUSTED_PINS } from "@/lib/mock_data";

export default function AuditorOverviewPage() {
  const attestedCount = INITIAL_ELECTIONS.filter((e) => e.state === "AUDITOR_ATTESTED").length;

  const auditorWorkspaces = [
    {
      title: "Trusted Authority Pins",
      href: "/auditor/trusted-pins",
      desc: "Manage cryptographic root pins for witness nodes, HSM signers, and smart contract registries.",
      icon: Key,
      count: `${INITIAL_TRUSTED_PINS.length} Pinned Keys`,
    },
    {
      title: "Fetch Final Witness",
      href: "/auditor/witness",
      desc: "Retrieve and verify independent witness checkpoint signatures and Merkle log sizes.",
      icon: Layers,
      count: "Ed25519 Verified",
    },
    {
      title: "Fetch Chain Anchor",
      href: "/auditor/chain",
      desc: "Query consortium blockchain finality transactions and confirm block reorganization depth.",
      icon: Globe,
      count: "EVM Finality",
    },
    {
      title: "Offline Evidence Archive",
      href: "/auditor/evidence",
      desc: "Export and inspect offline evidence archives with safe extraction and cryptographic proofs.",
      icon: Upload,
      count: "Airgapped Engine",
    },
    {
      title: "Full Verification Suite",
      href: "/auditor/verify",
      desc: "Run comprehensive verifier routines across manifest digests, ballot tallies, and nullifier trees.",
      icon: CheckCircle2,
      count: "Zero Discrepancy",
    },
    {
      title: "Sign Auditor Attestation",
      href: "/auditor/sign",
      desc: "Apply hardware backed auditor signature to certify election results for public release.",
      icon: ShieldCheck,
      count: "Hardware Signer",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            Independent Audit Authority
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Auditor Console
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Independent cryptographic verification of election logs, witness checkpoints, and chain anchors.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Attested Historical Contests
          </span>
          <div className="text-3xl font-extrabold text-[#15805D]">
            {attestedCount} Certified
          </div>
          <span className="text-xs text-slate-500">Dual auditor signature recorded</span>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Witness Node Network
          </span>
          <div className="text-3xl font-extrabold text-[#157E92]">
            2 Active Nodes
          </div>
          <span className="text-xs text-slate-500">Out of band pinned public keys</span>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Verifier Integrity Standard
          </span>
          <div className="text-3xl font-extrabold text-[#15805D]">
            PASS
          </div>
          <span className="text-xs text-slate-500">Golden test vectors verified</span>
        </div>
      </div>

      {/* Auditor Workspaces */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
          Verification Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auditorWorkspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.title}
                href={ws.href}
                className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] transition-colors flex flex-col justify-between space-y-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#15805D]/10 text-[#15805D] flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white">
                      {ws.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {ws.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#15805D]">{ws.count}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
