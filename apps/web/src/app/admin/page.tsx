"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  ShieldCheck,
  FileSpreadsheet,
  Mail,
  CheckCircle2,
  ArrowRight,
  Award,
} from "lucide-react";
import { apiClient } from "../../lib/api_client";
import type { AuditEvent, Election, StudentRecord, TeacherRecord } from "../../lib/types";

export default function AdminOverviewPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.getElections(),
      apiClient.getStudents(),
      apiClient.getTeachers(),
      apiClient.getAuditEvents(),
    ]).then(([electionResult, studentResult, teacherResult, auditResult]) => {
      if (!active) return;
      if (electionResult.status === "fulfilled") setElections(electionResult.value);
      if (studentResult.status === "fulfilled") setStudents(studentResult.value);
      if (teacherResult.status === "fulfilled") setTeachers(teacherResult.value);
      if (auditResult.status === "fulfilled") setAuditEvents(auditResult.value);
      if ([electionResult, studentResult, teacherResult, auditResult].some((result) => result.status === "rejected")) {
        setError("Some live administration data could not be loaded. No local fixture counts are shown.");
      }
    });
    return () => { active = false; };
  }, []);

  const openCount = elections.filter((e) => e.state === "OPEN").length;
  const verifiedStudents = students.filter((s) => s.verified).length;
  const totalStudents = students.length;

  const quickLinks = [
    {
      kicker: "Voter Registry",
      title: "Manage Students",
      href: "/admin/students",
      count: totalStudents ? `${totalStudents} Records` : "Live data unavailable",
      icon: Users,
      desc: "Enrollment verification and blind credential authorization.",
    },
    {
      kicker: "Faculty Roster",
      title: "Manage Teachers",
      href: "/admin/teachers",
      count: teachers.length ? `${teachers.length} Officers` : "Live data unavailable",
      icon: UserCheck,
      desc: "Verification permissions and class supervision assignments.",
    },
    {
      kicker: "CSV Ingestion",
      title: "Roster Imports",
      href: "/admin/roster-imports",
      count: "Batch Upload",
      icon: FileSpreadsheet,
      desc: "Immutable CSV parsing with SHA 256 digest locking.",
    },
    {
      kicker: "Access Control",
      title: "Role Approvals",
      href: "/admin/approvals",
      count: "Live API required",
      icon: CheckCircle2,
      desc: "Dual control approval for elevated election officer roles.",
    },
    {
      kicker: "Department Scope",
      title: "Election Assignments",
      href: "/admin/assignments",
      count: "Live API required",
      icon: Award,
      desc: "Link verification officers to specific election boundaries.",
    },
    {
      kicker: "Staff Credentials",
      title: "Admin Invitations",
      href: "/admin/invitations",
      count: "Live API required",
      icon: Mail,
      desc: "Hardware token onboarding with mandatory TOTP MFA.",
    },
    {
      kicker: "Ledger Review",
      title: "Audit Event Logs",
      href: "/admin/audit-logs",
      count: auditEvents.length ? `${auditEvents.length} Events` : "Live data unavailable",
      icon: ShieldCheck,
      desc: "Tamper evident append only log of administrative actions.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Users className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            <span>Campus Administration</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Administrator Console
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Supervise voter rosters, faculty permissions, security events, and election status.
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#6B4707] dark:text-[#FBBF24]" role="status">{error}</div>}

      {/* Metric Cards with High Contrast Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Elections
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/30">
              Live
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#157E92] dark:text-[#38BDF8] font-mono tabular-nums">
            {openCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Reported by the election service
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verified Student Voters
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              {totalStudents ? `${Math.round((verifiedStudents / totalStudents) * 100)}%` : "—"}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono tabular-nums">
            {verifiedStudents} / {totalStudents}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Reported by the identity service
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Faculty Officers
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352]">
              Assigned
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#10233F] dark:text-white font-mono tabular-nums">
            {teachers.length || "—"}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Reported by the identity service
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nullifier Integrity
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              LIMITED
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono">
            —
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Requires the independent verifier and released evidence package
          </span>
        </div>
      </div>

      {/* Workspace Quick Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white tracking-tight">
          Administration Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] dark:hover:border-[#38BDF8] transition-all duration-75 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] flex items-center justify-center flex-shrink-0 mt-0.5">
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
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs font-bold text-[#157E92] dark:text-[#38BDF8]">
                  <span>{item.count}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Events Preview */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3352]">
          <div>
            <h2 className="text-base font-bold text-[#10233F] dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
              <span>Recent System Audit Activity</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Append only governance ledger with actor authentication signatures.
            </p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline"
          >
            View Complete Logs
          </Link>
        </div>

        <div className="space-y-3">
          {auditEvents.slice(0, 3).map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/70 dark:bg-slate-900/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-[#10233F] dark:text-white">
                    {evt.action}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.status === "PASS"
                        ? "bg-[#15805D]/10 text-[#15805D] border border-[#15805D]/30"
                        : "bg-[#C23C45]/10 text-[#C23C45] border border-[#C23C45]/30"
                    }`}
                  >
                    {evt.status}
                  </span>
                  <span className="text-slate-400 text-[11px]">by {evt.actor}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-sans">{evt.details}</p>
              </div>
              <span className="font-mono tabular-nums text-slate-400 text-[11px] whitespace-nowrap">
                {new Date(evt.timestamp_utc).toISOString().slice(11, 19)} UTC
              </span>
            </div>
          ))}
          {auditEvents.length === 0 && <p className="text-sm text-slate-500">No live audit events were returned.</p>}
        </div>
      </div>
    </div>
  );
}
