"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, Lock, ShieldCheck, Users } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { VotingStepper } from "@/components/VotingStepper";
import { electionClient } from "@/lib/election_client";
import { identityClient, getCredentialProofStorageKey } from "@/lib/identity_client";
import type { Election } from "@/lib/types";

function formatUtc(value?: string): string {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid server timestamp";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  }).format(parsed);
}

export default function ElectionDetailPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [hasCredential, setHasCredential] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;

    // Check if browser session already holds the credential proof
    try {
      const storedProof = window.sessionStorage.getItem(getCredentialProofStorageKey(electionId));
      if (storedProof) {
        setHasCredential(true);
      }
    } catch {}

    void Promise.all([
      electionClient.getElection(electionId),
      identityClient.getIssuanceStatus(electionId).catch(() => null),
    ])
      .then(([nextElection, issuanceStatus]) => {
        if (!cancelled) {
          setElection(nextElection);
          if (issuanceStatus?.delivered) {
            setHasCredential(true);
          }
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setElection(null);
          setError(
            "The authoritative election manifest could not be reached. Voting is blocked until it is available."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [electionId]);

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Elections", href: "/student/elections" },
    { label: election?.title || `Election ${electionId.substring(0, 8)}` },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      {loading && (
        <div
          className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300"
          role="status"
        >
          <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-[#157E92] border-t-transparent" />
          Loading authoritative election manifest…
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && election && (
        <>
          <header className="space-y-4 border-b border-slate-200 pb-6 dark:border-[#1E3352]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <StateBadge state={election.state} size="md" />
                <span className="font-mono text-xs text-slate-500">{election.id}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Users className="size-3.5" aria-hidden="true" />
                {election.eligible_count ?? "Roster frozen"} Eligible Voters
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
                {election.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {election.description ||
                  "Review the server-authoritative manifest parameters, voter eligibility, and candidates before casting your confidential ballot."}
              </p>
            </div>
          </header>

          {/* Voting Journey Stepper */}
          <VotingStepper
            currentStep={1}
            electionId={election.id}
            hasCredential={hasCredential}
          />

          {/* Action Gateway Card */}
          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/60 to-cyan-50/30 p-6 sm:p-7 shadow-sm dark:border-[#1E3352] dark:from-[#132135] dark:via-[#10233F] dark:to-[#0D1C30]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">
                  {hasCredential ? "Step 2 of 3: Ready to Vote" : "Step 1 of 3: Action Required"}
                </span>
                <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
                  {hasCredential
                    ? "Anonymous Credential Ready in Session"
                    : "Obtain Your Anonymous Voting Credential"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {hasCredential
                    ? "Your browser holds a cryptographically blinded credential signature. Enter the voting booth to encrypt your candidate choice."
                    : "The identity issuer issues a blind signature proving eligibility without knowing your ballot choice or tracking token."}
                </p>
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                {election.state === "OPEN" && (
                  hasCredential ? (
                    <Link
                      href={`/student/elections/${encodeURIComponent(election.id)}/cast`}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#15805D] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-75 ease-out hover:bg-[#10664A] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15805D]"
                    >
                      <Lock className="size-4" aria-hidden="true" />
                      <span>Enter Voting Booth</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <Link
                      href={`/student/elections/${encodeURIComponent(election.id)}/credential`}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#157E92] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-75 ease-out hover:bg-[#0E6273] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
                    >
                      <KeyRound className="size-4" aria-hidden="true" />
                      <span>Obtain Blind Credential</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )
                )}

                {election.state !== "OPEN" && (
                  <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 px-4 py-3 text-xs font-semibold text-[#6B4707] dark:text-[#FCD34D]">
                    Election is currently {election.state}. Casting opens at {formatUtc(election.opens_at_utc)}.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Election Manifest & Schedule Parameters */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] space-y-4">
            <h2 className="text-base font-bold text-[#10233F] dark:text-white">
              Official Election Parameters
            </h2>
            <dl className="grid gap-4 text-xs sm:text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/40 border border-slate-100 dark:border-[#1E3352]">
                <dt className="text-slate-500 font-semibold mb-1">Voting Window Opens</dt>
                <dd className="font-medium text-[#10233F] dark:text-white">
                  {formatUtc(election.opens_at_utc)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/40 border border-slate-100 dark:border-[#1E3352]">
                <dt className="text-slate-500 font-semibold mb-1">Voting Window Closes</dt>
                <dd className="font-medium text-[#10233F] dark:text-white">
                  {formatUtc(election.closes_at_utc)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/40 border border-slate-100 dark:border-[#1E3352]">
                <dt className="text-slate-500 font-semibold mb-1">Selection Contest</dt>
                <dd className="font-medium text-[#10233F] dark:text-white">
                  {election.contest || "Contested Seat"}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/40 border border-slate-100 dark:border-[#1E3352]">
                <dt className="text-slate-500 font-semibold mb-1">Manifest Hash</dt>
                <dd className="break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {election.manifest_digest || "Pending freeze"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Manifest Candidates */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#10233F] dark:text-white">
                  Candidates on the Ballot ({election.candidates?.length ?? 0})
                </h2>
                <p className="text-xs text-slate-500">
                  Profiles as locked in the frozen manifest.
                </p>
              </div>
              <Link
                href={`/student/elections/${encodeURIComponent(election.id)}/candidates`}
                className="text-xs font-bold text-[#157E92] hover:underline dark:text-[#38BDF8]"
              >
                View Full Profiles →
              </Link>
            </div>

            {election.candidates?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {election.candidates.map((candidate) => (
                  <article
                    key={candidate.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[#1E3352] dark:bg-slate-900/30 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-[#10233F] dark:text-white">
                        {candidate.name}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                        {candidate.statement ||
                          "No candidate statement was registered in the authoritative manifest."}
                      </p>
                    </div>
                    <p className="mt-3 font-mono text-[10px] text-slate-400">
                      ID: {candidate.id}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No candidate records were returned by the manifest.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
