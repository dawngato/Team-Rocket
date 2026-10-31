"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Fingerprint,
  GraduationCap,
  HelpCircle,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { identityClient, type SessionProfile } from "@/lib/identity_client";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";
import { StateBadge } from "@/components/StateBadge";

export default function StudentEligibilityPage() {
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      identityClient.getSession(),
      electionClient.getElections().catch(() => [] as Election[]),
    ])
      .then(([currentSession, electionList]) => {
        if (!active) return;
        setSession(currentSession);
        setElections(electionList);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to verify student eligibility from identity service.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isVerifiedStudent = Boolean(
    session?.roles?.some((r) => r.toLowerCase() === "student")
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#157E92] dark:text-[#38BDF8]">
          <Fingerprint className="size-4" aria-hidden="true" />
          Voter Identity Authority
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
          Voting Eligibility &amp; Verification Status
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          HimVote establishes voting eligibility through verified university enrollment records and privacy-preserving blind credentials. An active account alone does not grant ballot access.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]" role="status">
          Querying authoritative enrollment authority...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && session && (
        <>
          {/* Institutional Enrollment Summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#157E92]/10 text-[#157E92] flex items-center justify-center dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <h2 className="font-bold text-[#10233F] dark:text-white text-base">
                    {session.email}
                  </h2>
                  <p className="text-xs text-slate-500">
                    User Identifier: <code className="font-mono">{session.user_id}</code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isVerifiedStudent ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Enrolled Student
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Clock className="size-3.5" /> Pending Institutional Review
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 block mb-1">Identity Verification</span>
                <span className="font-bold text-[#10233F] dark:text-white text-sm">
                  {isVerifiedStudent ? "Roster Approved" : "Awaiting Verification"}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Confirmed by authorized campus department.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 block mb-1">MFA Security</span>
                <span className="font-bold text-[#10233F] dark:text-white text-sm">
                  {session.mfa_authenticated ? "Authenticated" : "Optional for Students"}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Hardware or TOTP verification status.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 block mb-1">Assigned Scopes</span>
                <span className="font-bold text-[#10233F] dark:text-white text-sm truncate block">
                  {session.scopes?.length ? session.scopes.map((s) => s.scope_id).join(", ") : "Campus-wide"}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Electoral boundaries assigned to your identity.
                </p>
              </div>
            </div>
          </section>

          {/* Election-specific eligibility cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
                Contest-by-Contest Eligibility Status
              </h2>
              <span className="text-xs text-slate-500">
                {elections.length} Active Polls
              </span>
            </div>

            {elections.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]">
                No election ballots are currently scheduled for your academic group.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {elections.map((elec) => {
                  const isOpen = elec.state === "OPEN";
                  return (
                    <article
                      key={elec.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-[#157E92]/40 dark:border-[#1E3352] dark:bg-[#132135]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <StateBadge state={elec.state} size="sm" />
                            <span className="font-mono text-xs text-slate-400">
                              {elec.id}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                            {elec.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {elec.description || "University representative election."}
                          </p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          {isOpen ? (
                            <Link
                              href={`/student/elections/${encodeURIComponent(elec.id)}/credential`}
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#157E92] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0E6273]"
                            >
                              <Vote className="size-3.5" />
                              <span>Obtain Voting Token</span>
                              <ArrowRight className="size-3.5" />
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-500">
                              <Lock className="size-3.5" />
                              <span>Booth Not Open</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Status: Eligible under institutional voter registry</span>
                        </span>
                        <span>Selection Rule: {elec.selection_rule}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Verification Protocol Notice */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-[#1E3352] dark:bg-[#10233F]/30 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-[#157E92]" />
              Cryptographic Blind Issuance Invariant
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              When you obtain a voting token, the server signs an obscured cryptographic commitment (RFC 9474). The identity issuer verifies that you are eligible on the roster, but never learns the unblinded nullifier or the serial number that will be used to cast your vote.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
