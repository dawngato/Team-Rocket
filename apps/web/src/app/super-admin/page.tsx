"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ShieldAlert,
  Building2,
  GraduationCap,
  Users2,
  UserCheck2,
  UserCog,
  Sliders,
  ShieldCheck,
  FileText,
  ArrowRight,
  Lock,
  RefreshCw,
  Activity,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { apiClient } from "@/lib/api_client";
import type { Election } from "@/lib/types";

export default function SuperAdminOverviewPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [electionsError, setElectionsError] = useState<string | null>(null);
  const [loadingElections, setLoadingElections] = useState(true);

  const fetchElections = () => {
    setLoadingElections(true);
    setElectionsError(null);
    apiClient
      .getElections({ includeInternal: true })
      .then((rows) => {
        setElections(rows);
      })
      .catch((cause) => {
        setElectionsError(
          cause instanceof Error ? cause.message : "Election status could not be loaded."
        );
      })
      .finally(() => {
        setLoadingElections(false);
      });
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const electionStateCounts = useMemo(
    () =>
      elections.reduce<Record<string, number>>((counts, election) => {
        counts[election.state] = (counts[election.state] || 0) + 1;
        return counts;
      }, {}),
    [elections]
  );

  const electionTotal = Math.max(1, elections.length);
  const activeCount = electionStateCounts["voting_open"] || 0;
  const tallyCount = (electionStateCounts["tally_published"] || 0) + (electionStateCounts["archived"] || 0);

  const quickCards = [
    {
      kicker: "Campus Boundaries",
      title: "Institutions & Campuses",
      href: "/super-admin/institutions",
      count: "Tenant Config",
      actionText: "Manage Campuses",
      icon: Building2,
      desc: "Institutional multi-tenant allocations, campus affiliations, and territorial governance boundaries.",
    },
    {
      kicker: "Enrollment Caps",
      title: "Academic Departments",
      href: "/super-admin/departments",
      count: "Active Thresholds",
      actionText: "Configure Caps",
      icon: GraduationCap,
      desc: "Department verification thresholds, faculty enrollment caps, and departmental quotas.",
    },
    {
      kicker: "Credential Scopes",
      title: "Administrator Roster",
      href: "/super-admin/administrators",
      count: "MFA Enforced",
      actionText: "Review Scopes",
      icon: Users2,
      desc: "Campus administrator invitations, credential scopes, and mandatory hardware MFA enrollment.",
    },
    {
      kicker: "Super Admin Power",
      title: "Direct Role Assignment",
      href: "/super-admin/role-assignments",
      count: "Direct Grant",
      actionText: "Manage Direct Roles",
      icon: UserCog,
      desc: "Directly assign and upgrade roles for all registered campus accounts via backend issuer.",
    },
    {
      kicker: "Supreme Governance",
      title: "User Role Delegation",
      href: "/super-admin/role-requests",
      count: "Role Delegation Console",
      actionText: "Delegate Roles",
      icon: UserCheck2,
      desc: "Grant verified institutional authority: Campus Administrator, Faculty Teacher, Student Voter, or Transparency Officer.",
    },
    {
      kicker: "Quorum Rules",
      title: "Governance Policies",
      href: "/super-admin/policies",
      count: "Cryptographic Rules",
      actionText: "Inspect Policies",
      icon: Sliders,
      desc: "Turnout anonymity thresholds, zero-knowledge constraints, and frozen institutional bylaws.",
    },
    {
      kicker: "Key Ceremony",
      title: "Security & Key Ceremony",
      href: "/super-admin/security",
      count: "Hardware HSM Active",
      actionText: "Ceremony State",
      icon: Lock,
      desc: "Hardware keys, emergency lockdown triggers, threshold cryptography, and root secret shards.",
    },
    {
      kicker: "Immutable Ledger",
      title: "System Audit Ledger",
      href: "/super-admin/system-audit",
      count: "Append-Only Stream",
      actionText: "Query Ledger",
      icon: FileText,
      desc: "Authoritative append-only ledger tracking all administrative state changes and dual-control sign-offs.",
    },
    {
      kicker: "Public Trust",
      title: "Cryptographic Verifier",
      href: "/audit",
      count: "Independent Engine",
      actionText: "Launch Verifier",
      icon: ShieldCheck,
      desc: "External verifier for zero-knowledge proofs, tally hashes, and individual voter inclusion receipts.",
    },
  ];

  return (
    <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-8 space-y-8">
      {/* Supreme Institutional Governance Header */}
      <header className="border-b border-slate-200 dark:border-[#1E3352] pb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#1E3A5F]/10 dark:bg-white/10 text-[#1E3A5F] dark:text-white border border-[#1E3A5F]/20 dark:border-white/20 mb-2">
              <ShieldAlert className="w-4 h-4 text-[#2459A6] dark:text-[#60A5FA]" aria-hidden="true" />
              <span>Institutional Sovereign Authority • Super Administrator Command Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E3A5F] dark:text-white tracking-tight">
              Institutional Governance & Security Command Center
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-2 max-w-4xl leading-relaxed">
              Supreme oversight for Himachal Pradesh Technical University election infrastructure. Configure tenant boundaries, manage department quotas, enforce security invariants, and delegate institutional roles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sovereign Cluster Active</span>
            </div>
            <button
              type="button"
              onClick={fetchElections}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E3352] font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <SuperAdminNav />

      {/* Platform Security Indicators (4-Column Bento Across Screen) */}
      <section aria-labelledby="platform-security-title" className="space-y-3">
        <h2 id="platform-security-title" className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Core Security Invariants & System Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Institution Tenant */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md hover:border-[#2459A6]/50 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Institutional Tenant
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2459A6]/10 text-[#2459A6] dark:text-[#60A5FA] border border-[#2459A6]/30">
                HPTU Multi-Tenant
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#1E3A5F] dark:text-white font-mono tracking-tight">
              HPTU CENTRAL
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Main university campus and affiliated engineering colleges bound to single sovereign ledger.
            </p>
          </motion.div>

          {/* User Pool & Role Authority */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md hover:border-[#15805D]/50 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Role Authority
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] border border-[#15805D]/30">
                Sole Delegator
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#2459A6] dark:text-[#60A5FA] font-mono tracking-tight">
              SUPER ADMIN ONLY
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All elevated capabilities (Campus Administrator, Faculty Teacher, Student Voter, Transparency Officer) delegated strictly through this console.
            </p>
          </motion.div>

          {/* Bootstrap Invariant */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md hover:border-amber-400/50 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Bootstrap Token
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Permanently Revoked
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#1E3A5F] dark:text-white font-mono">
              HTTP 403 LOCKED
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Initial cluster bootstrap endpoint is permanently disabled against replay attacks.
            </p>
          </motion.div>

          {/* Hardware MFA Enforcement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="hv-dashboard-card p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md hover:border-blue-400/50 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hardware MFA
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                WebAuthn Strict
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#1E3A5F] dark:text-white font-mono">
              FIDO2 MANDATORY
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cryptographic security keys required for elevated administrative and audit actions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Live Election Lifecycle & Health Telemetry (Expansive Card) */}
      <section
        aria-labelledby="super-election-status"
        className="hv-dashboard-card rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3352]">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2459A6]" />
              <h2 id="super-election-status" className="text-lg font-bold text-[#1E3A5F] dark:text-white">
                Live Election Lifecycle & System Telemetry
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Scoped records reported by the authoritative election service ledger. Real-time ballot and tally progression.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">
                Total Ballots in Scope: <strong className="font-mono text-[#1E3A5F] dark:text-white font-bold">{elections.length}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Authoritative Service Stream
              </span>
            </div>
          </div>
        </div>

        {loadingElections ? (
          <div className="py-8 text-center text-sm text-slate-500 space-y-2" role="status">
            <div className="w-6 h-6 border-2 border-[#2459A6] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading authoritative election states…</p>
          </div>
        ) : electionsError ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300" role="alert">
            {electionsError}
          </div>
        ) : Object.keys(electionStateCounts).length === 0 ? (
          <p className="py-6 text-sm text-slate-500 dark:text-slate-400" role="status">
            No active elections are currently deployed in this scope.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Column: Progress Bars */}
            <div className="space-y-4" role="list" aria-label="Election counts by lifecycle state">
              {Object.entries(electionStateCounts).map(([state, count]) => (
                <div
                  key={state}
                  role="listitem"
                  className="grid grid-cols-[10rem_minmax(0,1fr)_3rem] items-center gap-4"
                >
                  <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    {state.replaceAll("_", " ")}
                  </span>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
                    role="img"
                    aria-label={`${count} elections in ${state}`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2459A6] to-[#60A5FA] transition-all duration-500"
                      style={{ width: `${Math.max(6, (count / electionTotal) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-sm font-extrabold text-[#1E3A5F] dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>

            {/* Right Column: Key Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/70 dark:bg-[#0B1524]">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Balloting</div>
                <div className="mt-2 text-2xl font-extrabold text-[#2459A6] dark:text-[#60A5FA] font-mono">
                  {activeCount}
                </div>
                <p className="mt-1 text-xs text-slate-500">Live voting open to student voters</p>
              </div>

              <div className="p-4.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/70 dark:bg-[#0B1524]">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tallied & Archived</div>
                <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {tallyCount}
                </div>
                <p className="mt-1 text-xs text-slate-500">Cryptographically sealed tallies</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Governance Workspaces (Expansive 4-Column Responsive Grid) */}
      <section aria-labelledby="governance-operations-title" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="governance-operations-title" className="text-2xl font-bold text-[#1E3A5F] dark:text-white tracking-tight">
              Institutional Governance Command Workspaces
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Access scoped administration, user role delegation, cryptographic ceremony, and audit tools.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="flex"
              >
                <Link
                  href={card.href}
                  className="group w-full p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-[#2459A6] dark:hover:border-[#60A5FA] hover:shadow-md transition-all duration-150 ease-out flex flex-col justify-between space-y-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2459A6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1524]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-[#2459A6]/10 group-hover:bg-[#2459A6]/20 text-[#2459A6] dark:text-[#60A5FA] flex items-center justify-center transition-colors">
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352]">
                        {card.count}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        {card.kicker}
                      </span>
                      <h3 className="font-bold text-base text-[#1E3A5F] dark:text-white tracking-tight group-hover:text-[#2459A6] dark:group-hover:text-[#60A5FA] transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between text-xs font-bold text-[#2459A6] dark:text-[#60A5FA]">
                    <span>{card.actionText}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Policy and Boundary Invariants */}
      <footer className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/80 dark:bg-[#0E1A2B] p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[#1E3A5F] dark:text-white uppercase tracking-wider">
            Institutional Role Separation & Cryptographic Guarantees
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#1E3A5F] dark:text-white block mb-1">
              Zero Ballot Visibility
            </span>
            Super Administrators set institutional scopes and policies, but have zero access to individual voter ballot choices.
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#1E3A5F] dark:text-white block mb-1">
              Exclusive Role Delegation
            </span>
            Only Super Administrators can assign roles. Campus Administrators cannot create Super Administrators or elevate their own scopes.
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#1E3A5F] dark:text-white block mb-1">
              Independent Audit Separation
            </span>
            Neither Super Administrators nor Campus Administrators can sign or fabricate an independent audit attestation.
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#1E3A5F] dark:text-white block mb-1">
              Genesis Revocation Invariant
            </span>
            The bootstrap cluster endpoint permanently returns HTTP 403 Forbidden following initial genesis activation.
          </div>
        </div>
      </footer>
    </div>
  );
}
