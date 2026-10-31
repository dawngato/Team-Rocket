"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Building2, Plus, CheckCircle2, Globe, MapPin, Users, Shield, ShieldCheck } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import type { InstitutionRecord } from "@/lib/types";

export default function SuperAdminInstitutionsPage() {
  const institutions: InstitutionRecord[] = [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Building2 className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            Campus Registry
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Institutions &amp; Campuses
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Configure institutional tenancy, primary domain validation rules, and constituent campuses.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] disabled:opacity-60"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Provision Campus</span>
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
            Sovereign Tenant
          </span>
          <div className="mt-2 text-xl font-extrabold font-mono text-[#10233F] dark:text-white">
            HPTU CENTRAL
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Himachal Pradesh Technical University
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Primary Email Domain
          </span>
          <div className="mt-2 text-base font-bold font-mono text-[#157E92] dark:text-[#38BDF8] flex items-center gap-1.5">
            <Globe className="size-4" />
            <span>@hptu.ac.in</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Authoritative institutional email regex filter
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Tenant Multi-Tenancy
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Cryptographic Partitioning Active</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Distinct tenant namespaces enforced
          </span>
        </motion.div>
      </div>

      <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#7A4B08] dark:text-amber-200" role="status">
        Institution tenancy configuration is backed by the authoritative tenant directory service. Campus boundary modifications require multi-administrator dual approval.
      </div>

      <div className="space-y-6">
        {institutions.map((inst) => (
          <div
            key={inst.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3352]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
                    {inst.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
                    {inst.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#15805D]/10 text-[#15805D]">
                    {inst.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Primary Email Domain: <strong>@{inst.primary_domain}</strong></span>
                </p>
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block uppercase text-[10px] font-semibold">Active Contests</span>
                  <span className="font-bold text-[#10233F] dark:text-white text-base">{inst.active_elections_count}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[10px] font-semibold">Enrolled Students</span>
                  <span className="font-bold text-[#157E92] text-base">{inst.total_students_enrolled.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Campus List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Constituent Campuses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {inst.campuses.map((campus, index) => (
                  <div
                    key={campus}
                    className="p-4 rounded-lg border border-slate-200 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#157E92]/10 text-[#157E92] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#10233F] dark:text-white">
                        {campus}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {index === 0 ? "Central Registrar and Identity Issuer" : "Regional Verification Station"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain Enforcement Notice */}
            <div className="p-4 rounded-lg bg-[#157E92]/5 border border-[#157E92]/20 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#157E92] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Domain boundary enforcement ensures only institutional credentials from <strong>@{inst.primary_domain}</strong> and verified student IDs can request blind voting credentials.
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
