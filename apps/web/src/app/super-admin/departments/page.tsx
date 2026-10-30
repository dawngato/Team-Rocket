"use client";

import React, { useState } from "react";
import { GraduationCap, Plus, CheckCircle2, MapPin, Users, Award } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import type { DepartmentRecord } from "@/lib/types";

export default function SuperAdminDepartmentsPage() {
  const departments: DepartmentRecord[] = [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <GraduationCap className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            Academic Units
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Academic Departments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Supervise department scopes, faculty verification officers, and voter enrollment quotas.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Department API unavailable</span>
        </button>
      </div>

      <SuperAdminNav />

      <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#7A4B08]" role="status">Department provisioning is disabled until the authenticated directory service endpoint is deployed. No fixture departments are shown.</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
                  {dept.code}
                </span>
                <h2 className="text-lg font-bold text-[#10233F] dark:text-white mt-1">
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
                <span className="text-xl font-bold text-[#10233F] dark:text-white">{dept.faculty_count}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Eligible Voters</span>
                <span className="text-xl font-bold text-[#157E92]">{dept.student_count.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
