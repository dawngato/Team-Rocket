"use client";

import React from "react";
import Link from "next/link";
import {
  UserCheck,
  BookOpen,
  AlertTriangle,
  Vote,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { INITIAL_STUDENTS, INITIAL_ELECTIONS } from "@/lib/mock_data";

export default function TeacherOverviewPage() {
  const pendingStudents = INITIAL_STUDENTS.filter((s) => !s.verified);
  const pendingCount = pendingStudents.length;
  const verifiedCount = INITIAL_STUDENTS.filter((s) => s.verified).length;
  const openElectionsCount = INITIAL_ELECTIONS.filter((e) => e.state === "OPEN").length;

  const teacherLinks = [
    {
      kicker: "Curriculum Rosters",
      title: "My Classes",
      href: "/teacher/classes",
      count: "3 Course Sections",
      icon: BookOpen,
      desc: "Supervise enrolled course rosters and student identity verification status.",
    },
    {
      kicker: "Identity Gateway",
      title: "Student Verification Queue",
      href: "/teacher/verification-queue",
      count: `${pendingCount} Pending Reviews`,
      icon: UserCheck,
      desc: "Approve or flag student identity documents before election roster freeze.",
    },
    {
      kicker: "Dispute Resolution",
      title: "Roster Corrections",
      href: "/teacher/roster-corrections",
      count: "2 Correction Requests",
      icon: AlertTriangle,
      desc: "Resolve student identity discrepancies, name typos, and department transfers.",
    },
    {
      kicker: "Department Contests",
      title: "Published Elections",
      href: "/teacher/elections",
      count: `${INITIAL_ELECTIONS.length} Contests`,
      icon: Vote,
      desc: "Inspect active department elections and published verifiable results.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Faculty Verification Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Teacher Workspace
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Class management, identity verification queues, roster corrections, and election monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/teacher/verification-queue"
            className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] rounded-xl transition-all duration-75 ease-out flex items-center gap-2 text-sm shadow-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>Open Verification Queue ({pendingCount})</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards with High Contrast Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Document Reviews
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#AA6C0B]/10 text-[#AA6C0B] dark:text-[#FBBF24] border border-[#AA6C0B]/30">
              Action Required
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#AA6C0B] dark:text-[#FBBF24] font-mono tabular-nums">
            {pendingCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Awaiting student ID and photo matching
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verified Students
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              Eligible
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono tabular-nums">
            {verifiedCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Approved for anonymous voter credential issuance
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Contests
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/30">
              Monitored
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#157E92] dark:text-[#38BDF8] font-mono tabular-nums">
            {openElectionsCount} Active
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Faculty supervision assigned across departments
          </span>
        </div>
      </div>

      {/* Navigation Workspaces */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white tracking-tight">
          Teacher Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teacherLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] dark:hover:border-[#38BDF8] transition-all duration-75 ease-out active:scale-[0.98] select-none flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] flex items-center justify-center flex-shrink-0 mt-1">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      {item.kicker}
                    </span>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                    <span className="inline-block pt-1 text-xs font-bold text-[#15805D] dark:text-[#34D399] font-mono">
                      {item.count}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Verification Queue Preview */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3352]">
          <div>
            <h2 className="text-base font-bold text-[#10233F] dark:text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#AA6C0B]" aria-hidden="true" />
              <span>Pending Roster Approvals</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Identity documents requiring faculty attestation prior to credential cutoffs.
            </p>
          </div>
          <Link
            href="/teacher/verification-queue"
            className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline"
          >
            View Full Queue
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-[#1E3352]">
          {pendingStudents.slice(0, 3).map((student) => (
            <div
              key={student.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#10233F] dark:text-white">
                    {student.full_name}
                  </span>
                  <span className="font-mono text-slate-500">
                    {student.student_id}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  {student.email} | Dept: {student.department}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#AA6C0B]/10 text-[#AA6C0B] dark:text-[#FBBF24]">
                  PENDING REVIEW
                </span>
                <Link
                  href="/teacher/verification-queue"
                  className="min-h-[36px] px-3 py-1 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] rounded-lg transition-all duration-75 ease-out text-xs flex items-center gap-1 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
                >
                  <span>Review</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
