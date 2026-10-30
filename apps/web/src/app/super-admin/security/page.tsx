"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, Key, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { INITIAL_TRUSTED_PINS } from "@/lib/mock_data";

export default function SuperAdminSecurityPage() {
  const [emergencyLockActive, setEmergencyLockActive] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleEmergencyLock = () => {
    const nextState = !emergencyLockActive;
    setEmergencyLockActive(nextState);
    setFeedback(
      nextState
        ? "Emergency credential lockdown enabled. Blind signature issuance suspended across all departments."
        : "Emergency lockdown deactivated. Normal blind issuance resumed."
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#C23C45]" aria-hidden="true" />
            Cryptographic Key Ceremony
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Security and Cryptographic Boundaries
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Audit hardware security module boundaries, bootstrap status, and root authority key registrations.
          </p>
        </div>
      </div>

      <SuperAdminNav />

      {feedback && (
        <div className="p-4 rounded-xl bg-[#15805D]/10 border border-[#15805D]/30 text-[#15805D] text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Bootstrap Invitation Token
          </span>
          <div className="text-2xl font-extrabold text-[#15805D] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>REVOKED</span>
          </div>
          <p className="text-xs text-slate-500">
            Initial setup token consumed and permanently neutralized in database.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Database Cluster Isolation
          </span>
          <div className="text-2xl font-extrabold text-[#15805D] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>ENFORCED</span>
          </div>
          <p className="text-xs text-slate-500">
            Identity cluster and Casting cluster operate on distinct VPCs and subnets.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Emergency Lockdown Control
          </span>
          <button
            type="button"
            onClick={toggleEmergencyLock}
            className={`min-h-[44px] w-full mt-1 px-4 py-2 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 ${
              emergencyLockActive
                ? "bg-[#C23C45] text-white hover:bg-red-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>{emergencyLockActive ? "Release Lockdown" : "Trigger Emergency Freeze"}</span>
          </button>
        </div>
      </div>

      {/* Pinned Authorities Table */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E3352]">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Pinned Institutional Key Authorities
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Authority / Service</th>
                <th scope="col" className="px-6 py-3">Algorithm</th>
                <th scope="col" className="px-6 py-3">Pinned Key / Address</th>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {INITIAL_TRUSTED_PINS.map((pin) => (
                <tr key={pin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#10233F] dark:text-white">{pin.label}</div>
                    <div className="text-xs text-slate-400 font-mono">{pin.service}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {pin.algorithm}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-xs block">
                      {pin.public_key_spki}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#15805D]/10 text-[#15805D]">
                      ACTIVE PIN
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
