"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { StateBadge } from "../components/StateBadge";
import { electionClient } from "../lib/election_client";
import type { Election } from "../lib/types";

function formatUtc(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export default function HomePage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [electionsError, setElectionsError] = useState<string | null>(null);
  const [electionsLoading, setElectionsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const featuredElections = useMemo(() => elections.slice(0, 3), [elections]);

  useEffect(() => {
    let cancelled = false;
    setElectionsLoading(true);
    setElectionsError(null);

    void electionClient.getElections()
      .then((nextElections) => {
        if (!cancelled) setElections(nextElections);
      })
      .catch(() => {
        if (!cancelled) setElectionsError("We couldn’t load elections. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setElectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1440px] space-y-10 px-4 py-6 sm:space-y-12 sm:px-7 sm:py-10 lg:px-10 lg:py-12">
        <section
          aria-labelledby="home-title"
          className="grid overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#10233F] lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]"
        >
          <div className="flex flex-col items-start justify-center p-6 sm:p-9 lg:p-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#157E92]/20 bg-[#157E92]/[0.07] px-3 py-1.5 text-xs font-semibold text-[#116B7B] dark:text-[#67D4E6]">
              <Vote className="size-4" aria-hidden="true" />
              <span>Campus Elections</span>
            </div>

            <h1
              id="home-title"
              className="max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-[#10233F] dark:text-white sm:text-5xl lg:text-6xl"
            >
              Your campus.
              <br />
              <span className="text-[#157E92] dark:text-[#67D4E6]">Your voice.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Find an election, review the candidates, cast your ballot, and keep your receipt to check the published record.
            </p>

            <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/elections"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#157E92] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0E6273] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2"
              >
                <span>Browse elections</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[#10233F] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:border-[#34506C] dark:bg-[#132B46] dark:text-white dark:hover:bg-[#193551]"
              >
                <ShieldCheck className="size-4 text-[#157E92] dark:text-[#67D4E6]" aria-hidden="true" />
                <span>How voting works</span>
              </Link>
            </div>
          </div>

          <aside className="flex flex-col justify-center bg-[#10233F] p-6 text-white sm:p-9 lg:p-10">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#67D4E6]">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Voting, step by step</h2>
                <p className="text-sm text-slate-300">Everything you need is in one place.</p>
              </div>
            </div>

            <ol className="grid gap-4">
              <li className="flex gap-3 border-t border-white/10 pt-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[#67D4E6]">1</span>
                <div>
                  <h3 className="text-sm font-semibold">Sign in</h3>
                  <p className="mt-0.5 text-sm leading-5 text-slate-300">Use your campus account to check eligibility.</p>
                </div>
              </li>
              <li className="flex gap-3 border-t border-white/10 pt-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[#67D4E6]">2</span>
                <div>
                  <h3 className="text-sm font-semibold">Review candidates</h3>
                  <p className="mt-0.5 text-sm leading-5 text-slate-300">Read candidate details before you choose.</p>
                </div>
              </li>
              <li className="flex gap-3 border-t border-white/10 pt-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[#67D4E6]">3</span>
                <div>
                  <h3 className="text-sm font-semibold">Vote and save your receipt</h3>
                  <p className="mt-0.5 text-sm leading-5 text-slate-300">Use the receipt to check the published record.</p>
                </div>
              </li>
            </ol>

            <Link
              href="/student/help"
              className="mt-6 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-[#8FE3F0] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#10233F]"
            >
              <CircleHelp className="size-4" aria-hidden="true" />
              <span>Open the voter guide</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </aside>
        </section>

        <section aria-labelledby="elections-title" className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#157E92] dark:text-[#67D4E6]">Your campus polls</p>
              <h2 id="elections-title" className="mt-1 text-2xl font-bold tracking-tight text-[#10233F] dark:text-white sm:text-3xl">
                Current Student Elections
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Choose an election to see its candidates, status, and closing date.
              </p>
            </div>
            <Link
              href="/elections"
              className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-[#157E92] hover:text-[#0E6273] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] dark:text-[#67D4E6] dark:hover:text-white sm:self-auto"
            >
              <span>View all elections</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {electionsLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300" role="status" aria-live="polite">
              Loading elections…
            </div>
          )}

          {!electionsLoading && electionsError && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="text-sm text-[#8B2630] dark:text-rose-200">{electionsError}</p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#C23C45]/30 px-4 text-sm font-semibold text-[#8B2630] transition-colors hover:bg-[#C23C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C23C45] dark:text-rose-200"
              >
                Try again
              </button>
            </div>
          )}

          {!electionsLoading && !electionsError && featuredElections.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredElections.map((election) => (
                <article
                  key={election.id}
                  className="flex min-h-60 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-[#1E3352] dark:bg-[#132135] sm:p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StateBadge state={election.state} size="sm" />
                      {election.eligible_count ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {election.eligible_count.toLocaleString("en-IN")} eligible
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug text-[#10233F] dark:text-white">
                      {election.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {election.description || "Review the election details and candidate information."}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-[#1E3352]">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      <span>Closes {formatUtc(election.closes_at_utc)} UTC</span>
                    </span>
                    <Link
                      href={election.state === "OPEN" ? "/student/elections/" + election.id + "/candidates" : "/results?election=" + election.id}
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#157E92] hover:text-[#0E6273] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] dark:text-[#67D4E6] dark:hover:text-white"
                    >
                      <span>{election.state === "OPEN" ? "Review candidates" : "View results"}</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!electionsLoading && !electionsError && featuredElections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center dark:border-[#34506C] dark:bg-[#132135]/70">
              <p className="text-base font-semibold text-[#10233F] dark:text-white">No elections are available yet</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Check back here when your campus publishes its next election.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
