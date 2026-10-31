"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Fingerprint,
  GraduationCap,
  Info,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { identityClient, type SessionProfile } from "@/lib/identity_client";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";
import { StateBadge } from "@/components/StateBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function StudentEligibilityPage() {
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([identityClient.getSession(), electionClient.getElections()])
      .then(([currentSession, electionList]) => {
        if (!active) return;
        setSession(currentSession);
        setElections(electionList);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "The account session and election list could not be loaded."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasStudentRole = Boolean(
    session?.roles?.some((r) => r.toLowerCase() === "student")
  );

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Voting Eligibility" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1850px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <Breadcrumbs items={breadcrumbs} />

      <header className="flex flex-col gap-4 border-b border-slate-200 pb-7 dark:border-[#1E3352] xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#157E92]/10 px-3 py-1 text-xs font-semibold text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
            <Fingerprint className="size-4" aria-hidden="true" />
            <span>Current Account Session</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-4xl">
            Student Session and Election Access
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            This page reads the current account session and elections returned by the configured services. It does not query a university roster, confirm enrollment, or independently verify credential issuance.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Service Data Only</span>
        </div>
      </header>

      {loading && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
          role="status"
        >
          <div className="size-8 animate-spin rounded-full border-3 border-[#157E92] border-t-transparent" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Loading the account session and election list…
          </span>
          <p className="text-xs text-slate-400">
            Eligibility and credential issuance are not verified by this page.
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm leading-relaxed text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && session && (
        <>
          {/* Account Session Summary */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
            aria-label="Account session summary"
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#157E92]/10 text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
                      {session.email}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Account session
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    Account ID: <code>{session.user_id}</code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasStudentRole ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                    <span>Student role in session</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Clock className="size-4" />
                    <span>No student role reported</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Session Roles
                </span>
                <span className="mt-1 block text-sm font-bold text-slate-800 dark:text-slate-200">
                  {session.roles.join(", ") || "Authorized Student"}
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  Returned by the configured identity service
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Session Response
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-4" />
                  <span>Session loaded</span>
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  Returned by the configured identity service
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Credential Status
                </span>
                <span className="mt-1 block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Not checked on this page
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  Credential issuance requires a configured service response.
                </span>
              </div>
            </div>
          </motion.section>

          {/* Election-specific eligibility cards */}
          <section className="space-y-4" aria-label="Contest eligibility list">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#10233F] dark:text-white">
                  Elections Returned by the Service
                </h2>
                <p className="text-xs text-slate-500">
                  Election state is shown as returned. This page does not determine voter eligibility.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-500">
                {elections.length} Elections Listed
              </span>
            </div>

            {elections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]">
                The configured election service returned no elections.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {elections.map((elec) => {
                  const isOpen = elec.state === "OPEN";
                  return (
                    <motion.article
                      key={elec.id}
                      whileHover={{ y: -2 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-[#157E92]/40 dark:border-[#1E3352] dark:bg-[#132135]"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <StateBadge state={elec.state} size="sm" />
                          <span className="font-mono text-xs text-slate-400">
                            {elec.id}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                            {elec.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            {elec.description || `Official campus ballot for ${elec.contest || "University Representation"}.`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>Rule: {elec.selection_rule}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <Info className="size-3.5" />
                            Eligibility not checked here
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <span className="text-xs text-slate-400">
                          {isOpen ? "Voting booth active" : "Voting booth inactive"}
                        </span>

                        <div className="flex items-center gap-2">
                          {isOpen ? (
                            <div className="flex items-center gap-2">
                              <motion.div whileTap={{ scale: 0.98 }}>
                                <Link
                                  href={`/student/elections/${encodeURIComponent(elec.id)}/credential`}
                                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-[#1E3352] dark:bg-slate-800 dark:text-slate-200"
                                >
                                  <KeyRound className="size-3.5" />
                                  <span>Credential Details</span>
                                </Link>
                              </motion.div>
                              <motion.div whileTap={{ scale: 0.98 }}>
                                <Link
                                  href={`/student/elections/${encodeURIComponent(elec.id)}/cast`}
                                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#157E92] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#0E6273] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
                                >
                                  <Vote className="size-3.5" />
                                  <span>Enter Booth</span>
                                  <ArrowRight className="size-3.5" />
                                </Link>
                              </motion.div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <Lock className="size-3.5" />
                              <span>Booth Not Open</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Service Scope Notice */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-7 dark:border-[#1E3352] dark:bg-[#10233F]/30 space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <ShieldAlert className="size-4 text-[#157E92] dark:text-[#38BDF8]" />
              <span>Credential and Privacy Limits</span>
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              This page reads a session role and election list. It does not query an enrollment roster, issue or validate a blind credential, verify ballot privacy, or contact the blockchain. Confirm the deployed services and review their evidence before relying on election or privacy claims.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-[#157E92] dark:text-[#38BDF8]">
              <Info className="size-3.5" />
              <span>Session roles and election states are service-reported information.</span>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
