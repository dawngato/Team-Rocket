"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Play, Square, Award, Clock, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function OfficerLifecyclePage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    void apiClient
      .getElection(electionId, { includeInternal: true })
      .then(setElection)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Authoritative election status is currently unavailable.")
      );
  };

  useEffect(load, [electionId]);

  const transition = async (action: "open" | "close") => {
    if (!election) return;
    setBusy(true);
    setError(null);
    try {
      const updated = action === "open" ? await apiClient.openElection(election.id) : await apiClient.closeElection(election.id);
      setElection(updated);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The authoritative election service rejected this lifecycle state transition."
      );
    } finally {
      setBusy(false);
    }
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/officer" },
    { label: "Elections", href: "/officer/elections" },
    { label: "Lifecycle Management" },
  ];

  if (!election) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-center text-slate-500" role="status">
        <Clock className="mx-auto mb-2 size-6 animate-pulse text-[#157E92]" />
        {error || "Loading authoritative election record from election service…"}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-[#157E92]/10 px-2.5 py-0.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
            <Award className="size-3.5" aria-hidden="true" />
            Voting Window Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
            Election Lifecycle Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {election.title} · <span className="font-mono text-slate-400">{election.id}</span>
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </header>

      {/* Statistics and Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Lifecycle Phase
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#10233F] dark:text-white">
            {election.state}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Current operational consensus state
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Eligible Student Voters
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#157E92] dark:text-[#38BDF8]">
            {election.eligible_count ?? "Not provided"}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Roster voter registry entries
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            State Persistence
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Server Authoritative</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            No optimistic state spoofing allowed
          </span>
        </motion.div>
      </div>

      {error && (
        <div
          className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-xs sm:text-sm font-medium text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#10233F] dark:text-white">
            Authoritative Transition Controls
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            The state displayed here is re-queried directly from the cluster consensus engine after every transition request. Rejected state transitions never update local views optimistically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {election.state === "FROZEN" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void transition("open")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#15805D] hover:bg-[#10664A] px-5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Play className="size-4" aria-hidden="true" />
              <span>{busy ? "Authorizing Transition…" : "Open Voting Window"}</span>
            </button>
          )}

          {election.state === "OPEN" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void transition("close")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C23C45] hover:bg-[#9B2A32] px-5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Square className="size-4" aria-hidden="true" />
              <span>{busy ? "Authorizing Transition…" : "Close Voting Window"}</span>
            </button>
          )}

          <Link
            href={`/officer/elections/${election.id}/publication`}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 dark:border-[#1E3352] px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span>Proceed to Publication Workflow</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
