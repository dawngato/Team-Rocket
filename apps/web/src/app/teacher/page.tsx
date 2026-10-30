"use client";

import React from "react";
import Link from "next/link";
import { UserCheck, BookOpen, Clock, AlertTriangle, Vote, ArrowRight, CheckCircle2 } from "lucide-react";
import { INITIAL_STUDENTS, INITIAL_ELECTIONS } from "@/lib/mock_data";

export default function TeacherOverviewPage() {
  const pendingCount = INITIAL_STUDENTS.filter((s) => !s.verified).length;
  const verifiedCount = INITIAL_STUDENTS.filter((s) => s.verified).length;

  const teacherLinks = [
    {
      title: "My Classes",
      href: "/teacher/classes",
      count: "3 Course Sections",
      icon: BookOpen,
      desc: "Supervise enrolled course rosters and student identity status.",
    },
    {
      title: "Student Verification Queue",
      href: "/teacher/verification-queue",
      count: `${pendingCount} Pending Reviews`,
      icon: UserCheck,
      desc: "Approve or flag student identity documents before roster freeze.",
    },
    {
      title: "Roster Corrections",
      href: "/teacher/roster-corrections",
      count: "2 Correction Requests",
      icon: AlertTriangle,
      desc: "Resolve student identity disputes and department transfers.",
    },
    {
      title: "Published Elections",
      href: "/teacher/elections",
      count: `${INITIAL_ELECTIONS.length} Contests`,
      icon: Vote,
      desc: "Inspect active department elections and published development results.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Faculty Portal
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Teacher Workspace
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Class management, identity verification queues, roster corrections, and election monitoring.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Pending Document Reviews
          </span>
          <div className="text-3xl font-extrabold text-[#AA6C0B]">
            {pendingCount}
          </div>
          <span className="text-xs text-slate-500">
            Awaiting photo or ID verification
          </span>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Verified Students
          </span>
          <div className="text-3xl font-extrabold text-[#15805D]">
            {verifiedCount}
          </div>
          <span className="text-xs text-slate-500">
            Approved for blind credential issuance
          </span>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Assigned Contests
          </span>
          <div className="text-3xl font-extrabold text-[#157E92]">
            {INITIAL_ELECTIONS.filter((e) => e.state === "OPEN").length} Active
          </div>
          <span className="text-xs text-slate-500">
            Faculty supervision assigned
          </span>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
          Teacher Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teacherLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] transition-colors flex items-center justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#15805D]/10 text-[#15805D] flex items-center justify-center flex-shrink-0 mt-1">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                    <span className="inline-block mt-2 text-xs font-bold text-[#15805D]">
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
    </div>
  );
}
