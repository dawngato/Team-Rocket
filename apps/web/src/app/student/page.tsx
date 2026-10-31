"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck,
  GraduationCap,
  HelpCircle,
  Layers,
  Lock,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import { identityClient } from "@/lib/identity_client";
import type { Election } from "@/lib/types";
import { DEFAULT_CANDIDATES, getStoredCandidates } from "@/lib/candidate_store";

function formatUtc(value: string): string {
  if (!value) return "Not published";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid server timestamp";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  }).format(parsed);
}

export default function StudentPortalOverviewPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<{ handle: string; title: string; timestamp: string } | null>(null);
  const [issuedCredentialCount, setIssuedCredentialCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      const sessionRaw = window.sessionStorage.getItem("himvote_session_receipts");
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.handle) {
          setLatestReceipt(parsed[0]);
          return;
        }
      }
      // Remove legacy records from builds that persisted receipts across logout.
      window.localStorage.removeItem("himvote_receipts");
    } catch {}
  }, []);

  const handleDownloadReceiptTracker = () => {
    if (!latestReceipt) return;
    const blob = new Blob([JSON.stringify(latestReceipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `himvote_receipt_${latestReceipt.handle.substring(0, 12)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearSavedReceipts = () => {
    try {
      window.sessionStorage.removeItem("himvote_session_receipts");
      window.localStorage.removeItem("himvote_receipts");
    } catch {}
    setLatestReceipt(null);
  };
  const activeElections = useMemo(
    () => elections.filter((election) => election.state === "OPEN"),
    [elections],
  );

  useEffect(() => {
    let cancelled = false;
    void electionClient
      .getElections()
      .then((nextElections) => {
        if (!cancelled) {
          setElections(nextElections);
          void Promise.all(nextElections.map((election) => identityClient.getIssuanceStatus(election.id).catch(() => null))).then((statuses) => {
            if (!cancelled) setIssuedCredentialCount(statuses.filter((status) => status?.delivered).length);
          });
          setError(null);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setElections([]);
          setError(cause instanceof Error ? cause.message : "Elections could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const actions = [
    {
      kicker: "Voting booth",
      title: "Eligible elections",
      href: "/student/elections",
      desc: "Browse elections returned by the authoritative service. Casting remains blocked until an approved engine handoff exists.",
      icon: Vote,
      badge: loading ? "Loading" : `${activeElections.length} open`,
    },
    {
      kicker: "Receipt status",
      title: "My receipt timeline",
      desc: "Open a receipt from a real cast response to inspect accepted, witnessed, and anchored states.",
      icon: FileCheck,
      badge: "Needs live receipt",
    },
    {
      kicker: "Inclusion evidence",
      title: "Merkle inclusion proof",
      desc: "A proof is evaluated only when the casting service returns the complete leaf, root, tree size, and path.",
      icon: Layers,
      badge: "Fail closed",
    },
    {
      kicker: "Civic rights",
      title: "Voter help and limits",
      href: "/student/help",
      desc: "Review privacy boundaries, receipt semantics, coercion limits, and the educational-only scope.",
      icon: HelpCircle,
      badge: "Privacy guide",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#157E92]/10 px-2.5 py-1 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
            <GraduationCap className="size-3.5" aria-hidden="true" />
            Student voter workspace
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
            Student Voting Hub
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Election state and receipt status come from configured services. This page does not substitute synthetic elections or claim that a local badge proves a security property.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 px-3 py-2 text-xs font-semibold text-[#6B4707] dark:text-[#FCD34D]" role="status">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Identity and eligibility are service supplied
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="alert">
          {error} Synthetic elections and fake receipts are not substituted.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Live student status">
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Eligible elections</span>
          <strong className="font-mono text-2xl text-[#157E92] dark:text-[#38BDF8]">{loading ? "…" : elections.length}</strong>
          <span className="text-xs text-slate-500">Returned by the election service</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Engine authorization</span>
          <strong className="flex items-center gap-1.5 text-2xl text-[#AA6C0B] dark:text-[#FCD34D]"><Lock className="size-5" aria-hidden="true" />{issuedCredentialCount === null ? "Not available" : `${issuedCredentialCount} issued`}</strong>
          <span className="text-xs text-slate-500">Identity-service issuance status; no ballot identity is stored here</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Last cast receipt</span>
          {latestReceipt ? (
            <>
              <Link
                href={`/student/receipts/${encodeURIComponent(latestReceipt.handle)}`}
                className="text-xs font-mono font-bold text-[#15805D] hover:underline dark:text-[#34D399] truncate block"
                title={latestReceipt.handle}
              >
                {latestReceipt.handle.substring(0, 16)}…
              </Link>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadReceiptTracker}
                  className="text-[10px] text-[#157E92] hover:underline font-semibold"
                  title="Download receipt tracker as JSON"
                >
                  Download tracker
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={handleClearSavedReceipts}
                  className="text-[10px] text-red-500 hover:underline font-semibold"
                  title="Clear receipt from this browser"
                >
                  Clear from browser
                </button>
              </div>
            </>
          ) : (
            <strong className="text-lg text-[#10233F] dark:text-white">Not available</strong>
          )}
          <span className="text-xs text-slate-500">
            {latestReceipt ? `Cast in ${latestReceipt.title}` : "No live receipt loaded in this session"}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Privacy status</span>
          <strong className="flex items-center gap-1.5 text-2xl text-[#AA6C0B] dark:text-[#FCD34D]"><ShieldCheck className="size-5" aria-hidden="true" />Limited</strong>
          <span className="text-xs text-slate-500">Not a secrecy or tally proof</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2" aria-label="Student actions">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <div className="flex items-start gap-4">
                <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">{action.kicker}</span>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-[#10233F] dark:text-white">{action.title}</h2>
                    <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:border-[#1E3352] dark:bg-slate-800 dark:text-slate-300">{action.badge}</span>
                  </div>
                  <p className="pt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{action.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-[#157E92] dark:border-[#1E3352] dark:text-[#38BDF8]">
                <span>{action.href ? "Open workspace" : "Unavailable until live evidence exists"}</span>
                {action.href && <ArrowRight className="size-4" aria-hidden="true" />}
              </div>
            </>
          );
          return action.href ? (
            <Link key={action.title} href={action.href} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-[#157E92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] dark:border-[#1E3352] dark:bg-[#132135]">
              {content}
            </Link>
          ) : (
            <article key={action.title} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 opacity-80 dark:border-[#1E3352] dark:bg-slate-900/30">
              {content}
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]" aria-labelledby="active-elections-heading">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="active-elections-heading" className="text-lg font-bold tracking-tight text-[#10233F] dark:text-white">Active student elections</h2>
            <p className="mt-0.5 text-xs text-slate-500">Only service-returned elections are shown here.</p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-500">{loading ? "Loading" : `${activeElections.length} open`}</span>
        </div>
        {loading && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-[#1E3352] dark:text-slate-300" role="status">Loading election state…</div>}
        {!loading && !error && activeElections.length === 0 && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-[#1E3352] dark:text-slate-300" role="status">No open elections were returned by the authoritative service.</div>}
        {activeElections.map((election) => (
          <article key={election.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[#1E3352] dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[#10233F] dark:text-white">{election.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">Opens {formatUtc(election.opens_at_utc)} · Closes {formatUtc(election.closes_at_utc)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StateBadge state={election.state} size="sm" />
              <Link href={`/student/elections/${encodeURIComponent(election.id)}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#157E92] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]">
                View election <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
