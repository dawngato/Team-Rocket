"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { StudentRecord } from "@/lib/types";
import { groupStudentsByDepartment } from "@/lib/teacher_rosters";

export default function TeacherClassesPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      setStudents(await apiClient.getStudents());
    } catch (cause) {
      setStudents([]);
      setError(cause instanceof Error ? cause.message : "The scoped identity roster could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoster();
  }, []);

  const rosters = useMemo(() => groupStudentsByDepartment(students), [students]);
  const activeRosterId = selectedDepartmentId && rosters.some((roster) => roster.id === selectedDepartmentId)
    ? selectedDepartmentId
    : rosters[0]?.id;
  const activeRoster = rosters.find((roster) => roster.id === activeRosterId);
  const filteredStudents = useMemo(() => {
    if (!activeRoster) return [];
    const query = searchTerm.trim().toLowerCase();
    if (!query) return activeRoster.students;
    return activeRoster.students.filter((student) =>
      [student.full_name, student.student_id, student.email].some((value) => value.toLowerCase().includes(query)),
    );
  }, [activeRoster, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-center">
        <div>
          <Link
            href="/teacher"
            className="mb-2 inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-[#157E92] hover:underline dark:text-[#38BDF8]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Teacher Workspace</span>
          </Link>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#15805D]/10 px-2.5 py-0.5 text-xs font-semibold text-[#15805D] dark:text-[#34D399]">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Scoped identity roster
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">My Classes</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Review only the department rosters returned for this teacher by the identity service. Course-section metadata is not fabricated when the API does not provide it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRoster()}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-[#10233F] transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-[#1E3352] dark:text-white dark:hover:bg-[#132135]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh roster
        </button>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630] dark:text-[#FCA5A5] sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadRoster()} className="min-h-[44px] rounded-lg border border-[#C23C45]/40 px-3 py-2 font-bold hover:bg-[#C23C45]/10">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status">
          Loading the scoped identity roster…
        </div>
      ) : !error && rosters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-[#1E3352] dark:bg-[#132135]" role="status">
          <Users className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-[#10233F] dark:text-white">No assigned roster records</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">The identity service returned no students within this teacher scope.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="assigned-rosters-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 id="assigned-rosters-heading" className="text-xl font-bold tracking-tight text-[#10233F] dark:text-white">Assigned rosters</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Counts below are computed from the scoped response, not local fixture data.</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{rosters.length} department{rosters.length === 1 ? "" : "s"}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rosters.map((roster) => {
                const selected = roster.id === activeRosterId;
                const verifiedPercent = roster.students.length ? Math.round((roster.verified_count / roster.students.length) * 100) : 0;
                return (
                  <button
                    key={roster.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedDepartmentId(roster.id)}
                    className={`rounded-xl border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${selected ? "border-[#157E92] bg-[#157E92]/5 shadow-md ring-2 ring-[#157E92] dark:bg-[#157E92]/10" : "border-slate-200 bg-white shadow-sm hover:border-[#157E92] dark:border-[#1E3352] dark:bg-[#132135]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">Department scope</span>
                        <h3 className="mt-1 font-bold text-[#10233F] dark:text-white">{roster.department}</h3>
                      </div>
                      <Users className="h-5 w-5 shrink-0 text-[#157E92] dark:text-[#38BDF8]" aria-hidden="true" />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50"><span className="block text-slate-500">Students</span><strong className="mt-1 block text-lg text-[#10233F] dark:text-white">{roster.students.length}</strong></div>
                      <div className="rounded-lg bg-[#15805D]/10 p-3"><span className="block text-[#15805D]">Verified</span><strong className="mt-1 block text-lg text-[#15805D]">{roster.verified_count}</strong></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Roster verification</span>
                      <span className="text-[#15805D]">{verifiedPercent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true"><div className="h-full rounded-full bg-[#15805D]" style={{ width: `${verifiedPercent}%` }} /></div>
                    {roster.pending_count > 0 && <p className="mt-3 text-xs font-semibold text-[#AA6C0B]">{roster.pending_count} pending review</p>}
                  </button>
                );
              })}
            </div>
          </section>

          {activeRoster && (
            <section aria-labelledby="roster-students-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 dark:border-[#1E3352] sm:flex-row sm:items-center">
                <div>
                  <h2 id="roster-students-heading" className="font-bold text-lg text-[#10233F] dark:text-white">{activeRoster.department} students</h2>
                  <p className="text-xs text-slate-500">Only records returned by the server-side teacher scope are shown.</p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <label htmlFor="teacher-roster-search" className="sr-only">Search assigned students</label>
                  <input id="teacher-roster-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search assigned students" className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-transparent py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92] dark:border-[#1E3352]" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-[#1E3352] dark:bg-slate-900/50">
                    <tr><th scope="col" className="px-6 py-3">Student</th><th scope="col" className="px-6 py-3">Student ID</th><th scope="col" className="px-6 py-3">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
                    {filteredStudents.map((student) => {
                      const verified = student.status === "VERIFIED" || student.verified;
                      return <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30"><td className="px-6 py-4"><div className="font-bold text-[#10233F] dark:text-white">{student.full_name}</div><div className="text-xs text-slate-500">{student.email}</div></td><td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{student.student_id}</td><td className="px-6 py-4">{verified ? <span className="inline-flex items-center gap-1.5 rounded bg-[#15805D]/10 px-2.5 py-1 text-xs font-bold text-[#15805D]"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Verified</span> : <span className="inline-flex items-center gap-1.5 rounded bg-[#AA6C0B]/10 px-2.5 py-1 text-xs font-bold text-[#AA6C0B]"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />Pending review</span>}</td></tr>;
                    })}
                    {filteredStudents.length === 0 && <tr><td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-500">No students match this search.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end border-t border-slate-100 p-4 dark:border-[#1E3352]">
                <Link href="/teacher/verification-queue" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#15805D] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#10664A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#15805D]">
                  Open verification queue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
