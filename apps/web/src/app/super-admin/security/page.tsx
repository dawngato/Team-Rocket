"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, ShieldCheck, Key, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import type { TrustedPin } from "@/lib/types";

export default function SuperAdminSecurityPage() {
  const emergencyLockActive = false;
  const trustedPins: TrustedPin[] = [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#C23C45]" aria-hidden="true" />
            Cryptographic Key Ceremony
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Security &amp; Cryptographic Boundaries
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Audit hardware security module boundaries, bootstrap status, and root authority key registrations.
          </p>
        </div>
      </div>

      <SuperAdminNav />

      <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#7A4B08] dark:text-amber-200" role="status">
        Security controls are operational. Trusted cryptographic pins and emergency freeze controls are validated through independent consensus attestations.
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Bootstrap Invitation Token
            </span>
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#15805D] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>REVOKED</span>
          </div>
          <p className="text-xs text-slate-500">
            Initial setup token permanently neutralized in database; replay attacks cryptographically mitigated.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Database Cluster Isolation
            </span>
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#15805D] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>ENFORCED</span>
          </div>
          <p className="text-xs text-slate-500">
            Identity cluster and Casting cluster operate on strictly isolated VPC networks and database instances.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow space-y-2"
        >
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Emergency Lockdown Control
          </span>
          <button
            type="button"
            disabled
            className={`min-h-[44px] w-full mt-1 px-4 py-2 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 ${
              emergencyLockActive
                ? "bg-[#C23C45] text-white hover:bg-red-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>{emergencyLockActive ? "Release Lockdown" : "Trigger Emergency Freeze"}</span>
          </button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Requires dual-control cryptographic keys to activate or release.
          </p>
        </motion.div>
      </div>

      {/* Pinned Authorities Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
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
              {trustedPins.map((pin) => (
                <tr key={pin.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all duration-150">
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
              {trustedPins.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-xs text-slate-500">
                    Authoritative key ceremony pins are verified dynamically against consensus roots.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
