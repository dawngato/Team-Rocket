"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Building2,
  GraduationCap,
  Users2,
  UserCheck2,
  Sliders,
  ShieldCheck,
  FileText,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import {
  INITIAL_INSTITUTIONS,
  INITIAL_DEPARTMENTS,
  INITIAL_ADMINISTRATORS,
  INITIAL_ROLE_REQUESTS,
  INITIAL_POLICIES,
  INITIAL_AUDIT_EVENTS,
} from "@/lib/mock_data";

export default function SuperAdminOverviewPage() {
  const pendingRequestsCount = INITIAL_ROLE_REQUESTS.filter(
    (r) => r.status === "PENDING_APPROVAL"
  ).length;

  const quickCards = [
    {
      kicker: "Campus Boundaries",
      title: "Institutions and Campuses",
      href: "/super-admin/institutions",
      count: "3 Campuses Active",
      icon: Building2,
      desc: "Tenant configuration and regional campus boundary allocations.",
    },
    {
      kicker: "Enrollment Caps",
      title: "Academic Departments",
      href: "/super-admin/departments",
      count: `${INITIAL_DEPARTMENTS.length} Departments`,
      icon: GraduationCap,
      desc: "Enrollment limits and verification officer threshold controls.",
    },
    {
      kicker: "Credential Scopes",
      title: "Administrator Roster",
      href: "/super-admin/administrators",
      count: `${INITIAL_ADMINISTRATORS.length} Institutional Admins`,
      icon: Users2,
      desc: "Scoped permissions and mandatory hardware MFA enrollment.",
    },
    {
      kicker: "Dual Control",
      title: "Elevated Role Requests",
      href: "/super-admin/role-requests",
      count: `${pendingRequestsCount} Pending Review`,
      icon: UserCheck2,
      desc: "Dual control approval for election officer delegations.",
    },
    {
      kicker: "Quorum Rules",
      title: "Governance Policies",
      href: "/super-admin/policies",
      count: `${INITIAL_POLICIES.length} Enforced Rules`,
      icon: Sliders,
      desc: "Turnout anonymity thresholds and frozen parameters.",
    },
    {
      kicker: "Ceremony State",
      title: "Security and Key Ceremony",
      href: "/super-admin/security",
      count: "Bootstrap Revoked",
      icon: Lock,
      desc: "Hardware keys, emergency lockdown, and cryptographic invariants.",
    },
    {
      kicker: "Immutable Ledger",
      title: "System Audit Ledger",
      href: "/super-admin/system-audit",
      count: `${INITIAL_AUDIT_EVENTS.length} Immutable Logs`,
      icon: FileText,
      desc: "Append only verification trail for administrative actions.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            <span>Supreme Institutional Governance</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
            Super Administrator Control Center
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Institutional configuration, department scopes, administrator invitations, and security policies.
          </p>
        </div>
      </div>

      <SuperAdminNav />

      {/* Institutional Health Indicators with High Contrast */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Institution Tenant
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/30">
              Primary
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#10233F] dark:text-white truncate font-mono">
            {INITIAL_INSTITUTIONS[0].code}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
            {INITIAL_INSTITUTIONS[0].name}
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enrolled Student Base
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              Live Roster
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#157E92] dark:text-[#38BDF8] font-mono tabular-nums">
            {INITIAL_INSTITUTIONS[0].total_students_enrolled.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Across 3 regional campuses
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bootstrap Token
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              Locked
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>REVOKED</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Single use claim permanently disabled
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              MFA Enforcement
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
              Enforced
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#15805D] dark:text-[#34D399] font-mono tabular-nums">
            100%
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            All administrators enrolled with TOTP
          </span>
        </div>
      </div>

      {/* Governance Workspaces */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white tracking-tight">
          Governance Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#157E92] dark:hover:border-[#38BDF8] transition-all duration-75 ease-out active:scale-[0.98] select-none flex flex-col justify-between space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      {card.kicker}
                    </span>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#157E92] dark:text-[#38BDF8] font-bold font-mono">
                    {card.count}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Policy and Boundary Invariants */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/80 dark:bg-[#0E1A2B] p-6 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-[#10233F] dark:text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
          <span>Institutional Role Separation Guarantees</span>
        </h3>
        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-[#15805D] font-bold">*</span>
            <span>Super Administrators set institutional scopes and policies, but cannot view any voter ballot selection.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#15805D] font-bold">*</span>
            <span>Local Administrators cannot create Super Administrators or elevate their own scopes.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#15805D] font-bold">*</span>
            <span>Neither Super Administrators nor Administrators can sign an independent audit attestation.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#15805D] font-bold">*</span>
            <span>Bootstrap endpoint permanently returns HTTP 403 Forbidden following initial cluster activation.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
