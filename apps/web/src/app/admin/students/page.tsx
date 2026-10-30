"use client";

import React, { useState } from "react";
import { Users, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { INITIAL_STUDENTS } from "@/lib/mock_data";
import { StudentRecord } from "@/lib/types";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "ALL" || s.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Voter Roster
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Enrolled Student Directory
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Master student voter roll across all academic divisions.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-[#132135] p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, roll number, or email..."
            aria-label="Search student directory"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Department:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-300"
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
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#1E3352] text-slate-500 uppercase tracking-wider font-semibold">
                <th scope="col" className="px-6 py-4">Student</th>
                <th scope="col" className="px-6 py-4">Department</th>
                <th scope="col" className="px-6 py-4">Verification Status</th>
                <th scope="col" className="px-6 py-4">Enrollment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
