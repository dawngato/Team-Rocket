"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Vote,
  ShieldCheck,
  FileSpreadsheet,
  Mail,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Award,
} from "lucide-react";
import { StateBadge } from "../../components/StateBadge";
import { INITIAL_ELECTIONS, INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_AUDIT_EVENTS } from "../../lib/mock_data";

export default function AdminOverviewPage() {
  const openCount = INITIAL_ELECTIONS.filter((e) => e.state === "OPEN").length;
  const verifiedStudents = INITIAL_STUDENTS.filter((s) => s.verified).length;
  const totalStudents = INITIAL_STUDENTS.length;

  const quickLinks = [
    { title: "Manage Students", href: "/admin/students", count: totalStudents, icon: Users },
    { title: "Manage Teachers", href: "/admin/teachers", count: INITIAL_TEACHERS.length, icon: UserCheck },
    { title: "Roster Imports", href: "/admin/roster-imports", count: "Batch Upload", icon: FileSpreadsheet },
    { title: "Role Approvals", href: "/admin/approvals", count: "2 Pending", icon: CheckCircle2 },
    { title: "Election Assignments", href: "/admin/assignments", count: "3 Assigned", icon: Award },
    { title: "Admin Invitations", href: "/admin/invitations", count: "Active", icon: Mail },
    { title: "Audit Event Logs", href: "/admin/audit-logs", count: INITIAL_AUDIT_EVENTS.length, icon: ShieldCheck },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            Institutional Administration
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Administrator Console
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Supervise voter rosters, faculty permissions, security events, and election status.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Active Campus Elections
          </span>
          <div className="text-3xl font-extrabold text-[#157E92]">
            {openCount}
          </div>
          <span className="text-xs text-slate-500">
            Across 5 academic departments
          </span>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Verified Student Voters
          </span>
          <div className="text-3xl font-extrabold text-[#15805D]">
            {verifiedStudents} / {totalStudents}
          </div>
          <span className="text-xs text-slate-500">
            Roster verification active
          </span>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Faculty Verification Officers
          </span>
          <div className="text-3xl font-extrabold text-[#10233F] dark:text-white">
            {INITIAL_TEACHERS.length}
          </div>
          <span className="text-xs text-slate-500">
            All assigned to voter queues
          </span>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Security Event Status
          </span>
          <div className="text-3xl font-extrabold text-[#15805D]">
            PASS
          </div>
          <span className="text-xs text-slate-500">
            Zero duplicate nullifier leaks
          </span>
        </div>
      </div>

      {/* Workspace Quick Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
          Administration Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#157E92]/10 text-[#157E92] flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white">
                      {item.title}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      {item.count}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Events Preview */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3352]">
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
            <span>Recent System Audit Activity</span>
          </h2>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline"
          >
            View Complete Logs
          </Link>
        </div>

        <div className="space-y-3">
          {INITIAL_AUDIT_EVENTS.slice(0, 3).map((evt) => (
            <div
              key={evt.id}
              className="p-3 rounded-lg border border-slate-100 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-[#10233F] dark:text-white">
                    {evt.action}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      evt.status === "PASS"
                        ? "bg-[#15805D]/10 text-[#15805D]"
                        : "bg-[#C23C45]/10 text-[#C23C45]"
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{evt.details}</p>
              </div>
              <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
                {new Date(evt.timestamp_utc).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
