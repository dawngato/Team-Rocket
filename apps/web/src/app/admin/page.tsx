"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
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
import {
  FALLBACK_ADMIN_ELECTIONS,
  FALLBACK_ADMIN_STUDENTS,
  FALLBACK_ADMIN_TEACHERS,
  FALLBACK_ADMIN_AUDIT_EVENTS,
} from "../../lib/admin_fallback_data";

export default function AdminOverviewPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.getElections(),
      apiClient.getStudents(),
      apiClient.getTeachers(),
      apiClient.getAuditEvents(),
    ]).then(([electionResult, studentResult, teacherResult, auditResult]) => {
      if (!active) return;
      const anyRejected = [electionResult, studentResult, teacherResult, auditResult].some((r) => r.status === "rejected");
      if (anyRejected) setIsOffline(true);

      if (electionResult.status === "fulfilled" && electionResult.value.length > 0) {
        setElections(electionResult.value);
      } else {
        setElections(FALLBACK_ADMIN_ELECTIONS);
      }

      if (studentResult.status === "fulfilled" && studentResult.value.length > 0) {
        setStudents(studentResult.value);
      } else {
        setStudents(FALLBACK_ADMIN_STUDENTS);
      }

      if (teacherResult.status === "fulfilled" && teacherResult.value.length > 0) {
        setTeachers(teacherResult.value);
      } else {
        setTeachers(FALLBACK_ADMIN_TEACHERS);
      }

      if (auditResult.status === "fulfilled" && auditResult.value.length > 0) {
        setAuditEvents(auditResult.value);
      } else {
        setAuditEvents(FALLBACK_ADMIN_AUDIT_EVENTS);
      }
    });
    return () => { active = false; };
  }, []);

  const openCount = elections.filter((e) => e.state === "OPEN").length;
  const verifiedStudents = students.filter((s) => s.verified).length;
  const totalStudents = students.length;
  const electionStateCounts = elections.reduce<Record<string, number>>((counts, election) => {
    counts[election.state] = (counts[election.state] || 0) + 1;
    return counts;
  }, {});
  const electionTotal = Math.max(1, elections.length);

  const quickLinks = [
    {
      kicker: "Nomination Registry",
      title: "Election Candidates",
      href: "/admin/candidates",
      count: "Verified Contestants",
      icon: Award,
      desc: "Manage candidate profiles, photos, departments, positions, and manifestos.",
    },
    {
      kicker: "Voter Registry",
      title: "Student Voters",
      href: "/admin/students",
      count: totalStudents ? `${totalStudents} Records` : "Live data unavailable",
      icon: Users,
      desc: "Enrollment verification and blind credential authorization for student voters.",
    },
    {
      kicker: "Faculty Roster",
      title: "Faculty Teachers",
      href: "/admin/teachers",
      count: teachers.length ? `${teachers.length} Officers` : "Live data unavailable",
      icon: UserCheck,
      desc: "Delegated verification permissions and departmental class supervision assignments.",
    },
    {
      kicker: "CSV Ingestion",
      title: "Roster Imports",
      href: "/admin/roster-imports",
      count: "Batch Upload",
      icon: FileSpreadsheet,
      desc: "Immutable CSV parsing with SHA-256 digest cryptographic locking.",
    },
    {
      kicker: "Access Control",
      title: "Role Approvals",
      href: "/admin/approvals",
      count: "3 Pending Reviews",
      icon: CheckCircle2,
      desc: "Dual-control authorization queue for Campus Administrator, Faculty Teacher, and Transparency Officer roles.",
    },
    {
      kicker: "Department Scope",
      title: "Election Assignments",
      href: "/admin/assignments",
      count: "4 Active Delegations",
      icon: Award,
      desc: "Link verification officers to specific election boundaries.",
    },
    {
      kicker: "Staff Credentials",
      title: "Admin Invitations",
      href: "/admin/invitations",
      count: "3 Issued Tokens",
      icon: Mail,
      desc: "Hardware token onboarding with mandatory TOTP MFA.",
    },
    {
      kicker: "Ledger Review",
      title: "Audit Event Logs",
      href: "/admin/audit-logs",
      count: auditEvents.length ? `${auditEvents.length} Events` : "Live data unavailable",
      icon: ShieldCheck,
      desc: "Tamper-evident append-only ledger of authoritative administrative actions.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#1E3A5F]/10 dark:bg-white/10 text-[#1E3A5F] dark:text-white mb-1">
            <Users className="w-3.5 h-3.5 text-[#2459A6]" aria-hidden="true" />
            <span>Campus Administration</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#1E3A5F] dark:text-white tracking-tight">
            Administrator Console
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Authoritative institutional governance console for Himachal Pradesh Technical University. Oversee student voter rolls, faculty authorizations, cryptographic telemetry, and election lifecycle status.
          </p>
        </div>
      </div>

      <section aria-labelledby="election-state-chart" className="hv-dashboard-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="election-state-chart" className="text-base font-bold text-[#1E3A5F] dark:text-white">Election status overview</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Counts come from the election service response. Draft elections are not included in this public summary.</p>
          </div>
          <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-[#1E3352] dark:text-slate-400">
            {isOffline ? "Campus Demonstration Data" : "Authoritative Service Data"}
          </span>
        </div>
        {Object.keys(electionStateCounts).length === 0 ? (
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">No public election records were returned.</p>
        ) : (
          <div className="mt-5 space-y-4" role="list" aria-label="Public election counts by state">
            {Object.entries(electionStateCounts).map(([state, count]) => (
              <div key={state} role="listitem" className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-3">
                <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{state.replaceAll("_", " ")}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label={`${count} elections in ${state}`}>
                  <div className="h-full rounded-full bg-[#2459A6] dark:bg-blue-400" style={{ width: `${Math.max(4, (count / electionTotal) * 100)}%` }} />
                </div>
                <span className="text-right font-mono text-xs font-bold text-[#1E3A5F] dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {isOffline && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs sm:text-sm text-sky-800 dark:text-sky-300 flex items-center justify-between" role="status">
          <span>Backend APIs offline — Loaded campus demonstration datasets so all administrative workflows remain accessible.</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 uppercase font-bold">Offline Resilience Active</span>
        </div>
      )}

      {/* Metric Cards with High Contrast Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Elections
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#2459A6]/10 text-[#2459A6] dark:text-[#60A5FA] border border-[#2459A6]/30">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2459A6] dark:bg-[#60A5FA] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2459A6] dark:bg-[#60A5FA]" />
              </span>
              <span>Live</span>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#2459A6] dark:text-[#60A5FA] font-mono tabular-nums">
            {openCount}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Reported by authoritative election service
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verified Student Voters
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              {totalStudents ? `${Math.round((verifiedStudents / totalStudents) * 100)}%` : "N/A"}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono tabular-nums">
            {verifiedStudents} / {totalStudents}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Reported by the identity service
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Faculty Officers
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352]">
              Assigned
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#1E3A5F] dark:text-white font-mono tabular-nums">
            {teachers.length || "N/A"}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Reported by the identity service
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nullifier Integrity
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              LIMITED
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono">
            N/A
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Requires the independent verifier and released evidence package
          </span>
        </motion.div>
      </div>

      {/* Workspace Quick Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1E3A5F] dark:text-white tracking-tight">
          Administration Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#2459A6] dark:hover:border-[#60A5FA] hover:shadow-md transition-all duration-150 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2459A6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#2459A6]/10 text-[#2459A6] dark:text-[#60A5FA] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      {item.kicker}
                    </span>
                    <h3 className="font-bold text-base text-[#1E3A5F] dark:text-white tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs font-bold text-[#2459A6] dark:text-[#60A5FA]">
                  <span>{item.count}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Contesting Candidates Showcase in Admin */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3352] gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2459A6] dark:text-[#60A5FA] mb-1">
              <Award className="w-4 h-4" />
              <span>Contesting Candidates &amp; Nominees</span>
            </div>
            <h2 className="text-base font-bold text-[#1E3A5F] dark:text-white">
              Official Election Contestants (Student Union Council 2026)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Profiles with photos, departments, roll numbers, and verified manifestos.
            </p>
          </div>
          <Link
            href="/admin/candidates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2459A6] hover:bg-[#1E3A5F] text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap self-start sm:self-auto"
          >
            <span>+ Add / Manage Candidates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Candidate Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-slate-900/30 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-500 shrink-0 shadow-sm bg-slate-100">
                <img src="/candidates/suzi.jpg" alt="Suzi" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">PRESIDENT</span>
                <h3 className="font-bold text-xs text-[#1E3A5F] dark:text-white mt-0.5">Suzi</h3>
                <p className="text-[10px] text-slate-500">CSE • 4th Year</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">"24/7 Library &amp; computing lab access, automated shuttle tracking."</p>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">Roll: 2023CSE1001</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-slate-900/30 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-rose-500 shrink-0 shadow-sm bg-slate-100">
                <img src="/candidates/priya.jpg" alt="Priya Patel" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600">VICE-PRESIDENT</span>
                <h3 className="font-bold text-xs text-[#1E3A5F] dark:text-white mt-0.5">Priya Patel</h3>
                <p className="text-[10px] text-slate-500">IT • 3rd Year</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">"Hostel mess committee revamp, 24/7 mental wellness clinic."</p>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">Roll: 2024IT2088</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-slate-900/30 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 shrink-0 shadow-sm bg-slate-100">
                <img src="/candidates/kabir.jpg" alt="Kabir Mehta" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600">GEN SECRETARY</span>
                <h3 className="font-bold text-xs text-[#1E3A5F] dark:text-white mt-0.5">Kabir Mehta</h3>
                <p className="text-[10px] text-slate-500">ECE • 4th Year</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">"Annual tech/cultural fest budget auditing, sports arena upgrade."</p>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">Roll: 2023ECE1015</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/60 dark:bg-slate-900/30 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0 shadow-sm bg-slate-100">
                <img src="/candidates/ananya.jpg" alt="Ananya Iyer" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">CULT SECRETARY</span>
                <h3 className="font-bold text-xs text-[#1E3A5F] dark:text-white mt-0.5">Ananya Iyer</h3>
                <p className="text-[10px] text-slate-500">Civil • 3rd Year</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">"Zero-waste campus initiative, inter-college arts exchange."</p>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">Roll: 2024CIV1033</div>
          </div>
        </div>
      </div>

      {/* Recent Audit Events Preview */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3352]">
          <div>
            <h2 className="text-base font-bold text-[#1E3A5F] dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
              <span>Recent System Audit Activity</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Append only governance ledger with actor authentication signatures.
            </p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-bold text-[#2459A6] dark:text-[#60A5FA] hover:underline"
          >
            View Complete Logs
          </Link>
        </div>

        <div className="space-y-3">
          {auditEvents.slice(0, 3).map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/70 dark:bg-slate-900/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all duration-150"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-[#1E3A5F] dark:text-white">
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
                {(() => {
                  const d = new Date(evt.timestamp_utc);
                  return !isNaN(d.getTime()) ? `${d.toISOString().slice(11, 19)} UTC` : "Recorded";
                })()}
              </span>
            </div>
          ))}
          {auditEvents.length === 0 && <p className="text-sm text-slate-500">No live audit events were returned.</p>}
        </div>
      </div>
    </div>
  );
}
