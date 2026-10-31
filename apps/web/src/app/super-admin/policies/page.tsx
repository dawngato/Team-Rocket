"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Sliders, Shield, Lock, CheckCircle2, AlertTriangle, ShieldCheck, FileCheck } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import type { PolicyConfigRecord } from "@/lib/types";

export default function SuperAdminPoliciesPage() {
  const policies: PolicyConfigRecord[] = [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#1E3A5F]/10 dark:bg-white/10 text-[#1E3A5F] dark:text-white mb-1">
            <Sliders className="w-3.5 h-3.5 text-[#2459A6]" aria-hidden="true" />
            Institutional Invariants
          </div>
          <h1 className="text-3xl font-bold text-[#1E3A5F] dark:text-white tracking-tight">
            Governance &amp; Privacy Policies
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Authoritative institutional policy configuration: system-wide verification thresholds, issuance cutoff rules, and consensus depth limits.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#2459A6] hover:bg-[#1E3A5F] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2459A6] disabled:opacity-60"
        >
          <Lock className="w-4 h-4" aria-hidden="true" />
          <span>Policy API Protected</span>
        </button>
      </div>

      <SuperAdminNav />

      {/* Animated Telemetry Tiles on Entrance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Cryptographic Invariants
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Frozen at Election Freeze</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Post-freeze bylaws immutable by design
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            ZK Anonymity Threshold
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#2459A6] dark:text-[#60A5FA]">
            k ≥ 25
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Minimum anonymous turnout parameter
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Policy Service Status
          </span>
          <div className="mt-2 text-base font-bold text-[#1E3A5F] dark:text-white flex items-center gap-1.5">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Cryptographic Sign-off Required</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Policy changes require multi-sig approval
          </span>
        </motion.div>
      </div>

      <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#7A4B08] dark:text-amber-200" role="status">
        Policy modification is restricted until the cryptographic multi-signature policy service is connected. Live system values are verified against cluster consensus.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((pol) => (
          <div
            key={pol.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {pol.category}
                </span>
                {pol.immutable_after_freeze ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15805D]">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    <span>Locked at Election Freeze</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Runtime Modifiable
                  </span>
                )}
              </div>
              <h2 className="font-bold text-base text-[#1E3A5F] dark:text-white">
                {pol.title}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {pol.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Parameter Key: {pol.key}</span>
              <span className="text-base font-bold font-mono text-[#2459A6] dark:text-[#60A5FA]">
                {String(pol.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
