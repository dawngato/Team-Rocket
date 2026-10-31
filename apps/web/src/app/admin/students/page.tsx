"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Search, GraduationCap, ShieldCheck, CheckCircle2, UserCheck } from "lucide-react";
import { StudentRecord } from "@/lib/types";
import { apiClient } from "@/lib/api_client";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  useEffect(() => {
    let active = true;
    apiClient
      .getStudents()
      .then((records) => {
        if (active) setStudents(records);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "The identity service could not load students."
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "ALL" || s.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const breadcrumbs = [
    { label: "Workspace", href: "/admin" },
    { label: "Enrolled Students" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <GraduationCap className="size-3.5" aria-hidden="true" />
            Voter Roster Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Enrolled Student Voter Directory
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Master student voter roll across all university academic divisions. Authoritative credential issuance for anonymous cryptographic ballot casting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15805D] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#15805D]" />
            </span>
            <span>{loading ? "Loading…" : `${students.length} Total Enrolled`}</span>
          </span>
        </div>
      </header>

      {/* Statistics Tiles on Entrance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Total Student Voters
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#10233F] dark:text-white">
            {loading ? "…" : students.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Authoritative university enrollment records
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Verified Credentials
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#15805D] dark:text-[#34D399]">
            {loading ? "…" : students.filter((s) => s.verified).length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Active blind voting tokens issued
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Verification Rate
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#157E92] dark:text-[#38BDF8]">
            {loading || students.length === 0
              ? "…"
              : `${Math.round((students.filter((s) => s.verified).length / students.length) * 100)}%`}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Institutional verification completion
          </span>
        </motion.div>
      </div>

      {error && (
        <div
          className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-xs sm:text-sm font-medium text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-[#132135] p-4 rounded-2xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, roll number, or email…"
            aria-label="Search student directory"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dept-filter" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Department:
          </label>
          <select
            id="dept-filter"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="min-h-11 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science and Engineering">Computer Science</option>
            <option value="Electronics and Communication">Electronics</option>
            <option value="Mechanical Engineering">Mechanical</option>
            <option value="Civil Engineering">Civil</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#1E3352] text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th scope="col" className="px-6 py-4">Student</th>
                <th scope="col" className="px-6 py-4">Department</th>
                <th scope="col" className="px-6 py-4">Verification Status</th>
                <th scope="col" className="px-6 py-4">Enrollment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Loading authoritative identity roster…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    {students.length === 0
                      ? "No student records were returned by the identity service."
                      : "No student records matched your search query."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all duration-150">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-[#10233F] dark:text-white">
                        {s.full_name}
                      </div>
                      <div className="font-mono text-slate-500 text-[11px]">{s.student_id}</div>
                      <div className="text-slate-400 text-[11px]">{s.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {s.department}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          s.verified
                            ? "bg-[#15805D]/10 text-[#15805D] border border-[#15805D]/30"
                            : "bg-[#AA6C0B]/10 text-[#AA6C0B] border border-[#AA6C0B]/30"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {new Date(s.created_at_utc).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
