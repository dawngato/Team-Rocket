"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Download,
  FileCheck,
  GraduationCap,
  HelpCircle,
  Layers,
  Lock,
  ShieldCheck,
  Trash2,
  Vote,
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import { identityClient } from "@/lib/identity_client";
import type { Election } from "@/lib/types";

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
  const [latestReceipt, setLatestReceipt] = useState<{
    handle: string;
    title: string;
    timestamp: string;
    electionId?: string;
  } | null>(null);
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
      const localRaw = window.localStorage.getItem("himvote_receipts");
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.handle) {
          setLatestReceipt(parsed[0]);
          return;
        }
      }
    } catch {}
  }, []);

  const handleDownloadReceiptTracker = () => {
    if (!latestReceipt) return;
    const exportData = {
      artifact_type: "himvote_ballot_receipt_tracker",
      format_version: "2.0",
      handle: latestReceipt.handle,
      election_title: latestReceipt.title,
      election_id: latestReceipt.electionId || "unspecified",
      stored_timestamp_utc: latestReceipt.timestamp,
      downloaded_at_utc: new Date().toISOString(),
      security_notice:
        "This file contains the receipt handle and timestamps stored in this browser. It is a local tracker export, not a cryptographic proof or independent verification result.",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
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
          void Promise.all(
            nextElections.map((election) =>
              identityClient.getIssuanceStatus(election.id).catch(() => null),
            ),
          ).then((statuses) => {
            if (!cancelled) {
              const availableStatuses = statuses.filter((status) => status !== null);
              setIssuedCredentialCount(
                availableStatuses.length > 0
                  ? availableStatuses.filter((status) => status?.delivered).length
                  : null,
              );
            }
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
      kicker: "Election Service",
      title: "Elections",
      href: "/student/elections",
      desc: "Review elections returned by the configured service. Eligibility and credential issuance must be confirmed by the deployed election services.",
      icon: Vote,
      badge: loading ? "Loading…" : `${activeElections.length} Open`,
      primary: true,
    },
    {
      kicker: "Browser Stored Receipt",
      title: "Receipt Status",
      href: latestReceipt
        ? `/student/receipts/${encodeURIComponent(latestReceipt.handle)}${
            latestReceipt.electionId ? `?election_id=${encodeURIComponent(latestReceipt.electionId)}` : ""
          }`
        : "/student/receipts",
      desc: "Look up a receipt using the configured casting service. Its status and any supplied evidence are shown as service-reported data.",
      icon: FileCheck,
      badge: latestReceipt ? "Active Tracker" : "Search Tracker",
      primary: false,
    },
    {
      kicker: "Receipt Evidence",
      title: "Inclusion Data",
      href: latestReceipt
        ? `/student/receipts/${encodeURIComponent(latestReceipt.handle)}/inclusion${
            latestReceipt.electionId ? `?election_id=${encodeURIComponent(latestReceipt.electionId)}` : ""
          }`
        : "/student/receipts",
      desc: "Review inclusion fields returned with a receipt. Use the proof page only when the service provides complete proof data.",
      icon: Layers,
      badge: latestReceipt ? "Verify Proof" : "Lookup Receipt",
      primary: false,
    },
    {
      kicker: "Help and Limits",
      title: "Privacy and Service Limits",
      href: "/student/help",
      desc: "Read what this prototype does, which claims require deployment evidence, and what privacy protections cannot be confirmed here.",
      icon: HelpCircle,
      badge: "Privacy Protocol",
      primary: false,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1850px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      {/* Hero Header */}
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 dark:border-[#1E3352] xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#157E92]/10 px-3 py-1 text-xs font-semibold text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
            <GraduationCap className="size-4" aria-hidden="true" />
            <span>Authorized Voter Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-4xl">
            Student Voting Hub
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Review elections and receipt data returned by the configured services. This interface does not independently verify eligibility, privacy properties, tally correctness, or blockchain inclusion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
            role="status"
          >
            <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Privacy Properties Not Verified Here</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-xs dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Configured Service Data</span>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm leading-relaxed text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error} Check that the configured election service is available.
        </div>
      )}

      {/* Real-time Status Metric Row */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Student workspace status"
      >
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Elections Listed
            </span>
            <Vote className="size-4 text-[#157E92] dark:text-[#38BDF8]" aria-hidden="true" />
          </div>
          <div>
            <strong className="font-mono text-3xl font-extrabold text-[#157E92] dark:text-[#38BDF8]">
              {loading ? "…" : elections.length}
            </strong>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {activeElections.length} reported as open
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Status returned by the election service
          </span>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Credential Issuance Records
            </span>
            <Lock className="size-4 text-[#AA6C0B] dark:text-[#FCD34D]" aria-hidden="true" />
          </div>
          <div>
            <strong className="flex items-center gap-1.5 text-2xl font-bold text-[#AA6C0B] dark:text-[#FCD34D]">
              {issuedCredentialCount === null ? "Unavailable" : `${issuedCredentialCount} Reported`}
            </strong>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Records marked delivered by the identity service
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Issuance is not independently verified
          </span>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Latest Saved Receipt
            </span>
            <FileCheck className="size-4 text-[#15805D] dark:text-[#34D399]" aria-hidden="true" />
          </div>
          <div>
            {latestReceipt ? (
              <div className="space-y-1">
                <Link
                  href={`/student/receipts/${encodeURIComponent(latestReceipt.handle)}${
                    latestReceipt.electionId ? `?election_id=${encodeURIComponent(latestReceipt.electionId)}` : ""
                  }`}
                  className="block truncate font-mono text-xs font-bold text-[#15805D] hover:underline dark:text-[#34D399]"
                  title={latestReceipt.handle}
                >
                  {latestReceipt.handle.substring(0, 16)}…
                </Link>
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleDownloadReceiptTracker}
                    className="inline-flex items-center gap-1 font-semibold text-[#157E92] hover:underline dark:text-[#38BDF8]"
                    title="Download receipt tracker as JSON"
                  >
                    <Download className="size-3" />
                    <span>Download</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleClearSavedReceipts}
                    className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline dark:text-rose-400"
                    title="Clear receipt from this browser"
                  >
                    <Trash2 className="size-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <strong className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  No Receipts Stored
                </strong>
                <p className="mt-1 text-xs text-slate-500">No receipt handle is stored in this browser</p>
              </div>
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {latestReceipt ? `Contest: ${latestReceipt.title}` : "Receipts are kept locally"}
          </span>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Receipt Lookup
            </span>
            <Layers className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <strong className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              Service Report
            </strong>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Evidence is not verified on this dashboard
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Use a separate verifier with complete evidence
          </span>
        </motion.div>
      </section>

      {/* Main Action Hub Grid */}
      <section aria-label="Student action hub">
        <h2 className="mb-4 text-lg font-bold tracking-tight text-[#10233F] dark:text-white">
          Elections and Receipt Services
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="flex"
              >
                <Link
                  href={action.href}
                  className="flex w-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-[#157E92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] dark:border-[#1E3352] dark:bg-[#132135]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-[#157E92]/10 text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
                        <Icon className="size-5.5" aria-hidden="true" />
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:border-[#1E3352] dark:bg-slate-800 dark:text-slate-300">
                        {action.badge}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {action.kicker}
                      </span>
                      <h3 className="mt-0.5 text-base font-bold text-[#10233F] dark:text-white">
                        {action.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {action.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-[#157E92] dark:border-[#1E3352] dark:text-[#38BDF8]">
                    <span>Open Service</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Active Contests List */}
      <section
        className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
        aria-labelledby="active-elections-heading"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-[#1E3352]">
          <div>
            <h2
              id="active-elections-heading"
              className="text-xl font-bold tracking-tight text-[#10233F] dark:text-white"
            >
              Active Student Elections
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Election states reported by the configured service
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="size-2 rounded-full bg-slate-400" />
            {loading ? "Loading schedule…" : `${activeElections.length} Reported as Open`}
          </span>
        </div>

        {loading && (
          <div
            className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-300"
            role="status"
          >
            <div className="size-4 animate-spin rounded-full border-2 border-[#157E92] border-t-transparent" />
            <span>Loading elections from the configured service…</span>
          </div>
        )}

        {!loading && !error && activeElections.length === 0 && (
          <div
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-slate-900/40 dark:text-slate-400"
            role="status"
          >
            The election service returned no open elections.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {activeElections.map((election) => (
            <motion.article
              key={election.id}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-[#1E3352] dark:bg-slate-900/50"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <StateBadge state={election.state} size="sm" />
                  <span className="font-mono text-[11px] text-slate-400">
                    ID: {election.id}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                    {election.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {election.description || `Contest: ${election.contest || "University Council Representation"}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Selection: {election.selection_rule}</span>
                  <span>•</span>
                  <span>Closes: {formatUtc(election.closes_at_utc)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-[#1E3352]">
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" />
                  Eligibility is determined by the configured service
                </span>
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Link
                    href={`/student/elections/${encodeURIComponent(election.id)}/cast`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#157E92] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#0E6273] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
                  >
                    <Vote className="size-3.5" aria-hidden="true" />
                    <span>Enter Voting Booth</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </motion.div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </main>
  );
}
