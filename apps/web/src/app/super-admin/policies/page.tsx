"use client";

import React, { useState } from "react";
import { Sliders, Shield, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import type { PolicyConfigRecord } from "@/lib/types";

export default function SuperAdminPoliciesPage() {
  const policies: PolicyConfigRecord[] = [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Sliders className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            Institutional Invariants
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Governance and Privacy Policies
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Configure system wide thresholds, issuance cutoff rules, and consensus depth limits.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
        >
          <Lock className="w-4 h-4" aria-hidden="true" />
          <span>Policy API unavailable</span>
        </button>
      </div>

      <SuperAdminNav />

      <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#7A4B08]" role="status">Policy editing is disabled until the signed policy service is connected. No fixture policy values are shown.</div>

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
              <h2 className="font-bold text-base text-[#10233F] dark:text-white">
                {pol.title}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {pol.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Parameter Key: {pol.key}</span>
              <span className="text-base font-bold font-mono text-[#157E92] dark:text-[#38BDF8]">
                {String(pol.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
