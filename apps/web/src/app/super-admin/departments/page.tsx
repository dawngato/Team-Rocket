"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { GraduationCap, Plus, CheckCircle2, MapPin, Users, Award, ShieldCheck } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import type { DepartmentRecord } from "@/lib/types";

export default function SuperAdminDepartmentsPage() {
  const departments: DepartmentRecord[] = [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#1E3A5F]/10 dark:bg-white/10 text-[#1E3A5F] dark:text-white mb-1">
            <GraduationCap className="w-3.5 h-3.5 text-[#2459A6]" aria-hidden="true" />
            Academic Units
          </div>
          <h1 className="text-3xl font-bold text-[#1E3A5F] dark:text-white tracking-tight">
            Academic Departments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Supervise department scopes, faculty verification officers, and voter enrollment quotas across all constituent engineering campuses.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#2459A6] hover:bg-[#1E3A5F] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2459A6] disabled:opacity-60"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Provision Department</span>
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
            Academic Unit Roster
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#1E3A5F] dark:text-white">
            HPTU Divisions
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Computer Science, Electronics, Mechanical, Civil
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Verification Threshold Target
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#15805D] dark:text-[#34D399]">
            85% Required
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Minimum faculty verification threshold
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Faculty Teacher Scopes
          </span>
          <div className="mt-2 text-base font-bold text-[#2459A6] dark:text-[#60A5FA] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2459A6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2459A6]" />
            </span>
            <span>Department Partitioned</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Verification authority scoped to enrolled students
          </span>
        </motion.div>
      </div>

      <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#7A4B08] dark:text-amber-200" role="status">
        Department provisioning and quota enforcement are managed through authoritative tenant configuration. Dynamic department limits are synchronized with university enrollment records.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#2459A6]/10 text-[#2459A6] dark:text-[#60A5FA]">
                  {dept.code}
                </span>
                <h2 className="text-lg font-bold text-[#1E3A5F] dark:text-white mt-1">
                  {dept.name}
                </h2>
                <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>{dept.campus}</span>
                </span>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D]">
                {dept.verification_threshold_percent}% Verified Target
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-[#1E3352]">
              <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Faculty Reviewers</span>
                <span className="text-xl font-bold text-[#1E3A5F] dark:text-white">{dept.faculty_count}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Eligible Voters</span>
                <span className="text-xl font-bold text-[#2459A6]">{dept.student_count.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
