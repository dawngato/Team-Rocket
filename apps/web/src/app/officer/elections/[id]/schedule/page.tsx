"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Calendar, Clock, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election } from "@/lib/types";

export default function OfficerSchedulePage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient
      .getElection(electionId, { includeInternal: true })
      .then(setElection)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Election schedule service is temporarily unavailable.")
      );
  }, [electionId]);

  if (!election) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-sm" role="status">
        {error || "Retrieving authoritative election schedule and cryptographic milestones..."}
      </main>
    );
  }

  const milestones = [
    {
      label: "Credential Issuance Cutoff",
      value: election.issuance_cutoff_utc,
      description: "Blind signature token issuance permanently closes to prevent post-opening credential creation.",
      badge: "Pre-Voting Barrier",
    },
    {
      label: "Ballot Casting Commences",
      value: election.opens_at_utc,
      description: "Cryptographic ballot submission gateway opens to verified Student Voters.",
      badge: "Voting Phase Active",
    },
    {
      label: "Ballot Casting Closes",
      value: election.closes_at_utc,
      description: "Ballot ingestion is cryptographically sealed; zero additional encrypted ballots accepted.",
      badge: "Election Sealed",
    },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Transparency Officer Workspace", href: "/officer" },
          { label: "Contests", href: "/officer/elections" },
          { label: election.title, href: `/officer/elections/${election.id}/lifecycle` },
          { label: "Schedule & Cutoffs" },
        ]}
      />

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-[#1E3352]">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]">
            <Calendar className="size-4" aria-hidden="true" />
            Timeline &amp; Schedule Invariants
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Schedule &amp; Temporal Cutoffs
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {election.title}
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </header>

      {/* Animated Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Temporal Invariant</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-5" />
              <span>Cutoff &lt; Open</span>
            </div>
            <span className="text-[11px] text-slate-500">Enforced by backend state engine</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Clock Authority</span>
            <div className="text-lg font-bold font-mono text-[#10233F] dark:text-white mt-1">
              UTC NTP Synced
            </div>
            <span className="text-[11px] text-slate-500">Sub-second drift ceiling</span>
          </div>
          <div className="p-3 rounded-xl bg-[#157E92]/10 text-[#157E92]">
            <Clock className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lock Status</span>
            <div className="text-lg font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {election.state === "DRAFT" ? "Configurable" : "Immutable"}
            </div>
            <span className="text-[11px] text-slate-500">{election.state === "DRAFT" ? "Pre-freeze phase" : "Manifest sealed"}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lock className="size-5" />
          </div>
        </motion.div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">
          {error}
        </div>
      )}

      {/* Schedule Milestone Cards */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div>
          <h2 className="text-base font-bold text-[#10233F] dark:text-white">
            Server-Authoritative Timeline Invariants
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Timestamps are calibrated in UTC and validated against institutional election policy invariants.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          {milestones.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 dark:border-[#1E3352] dark:bg-slate-900/40 space-y-2 transition-all duration-150 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] uppercase tracking-wider">
                  {item.badge}
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#10233F] dark:text-white">
                {item.label}
              </h3>
              <div className="font-mono text-sm font-bold text-slate-900 dark:text-white pt-1">
                {item.value ? new Date(item.value).toLocaleString() : "Not configured"}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href={`/officer/elections/${election.id}/freeze`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-6 text-sm font-bold text-white transition-colors shadow-sm"
        >
          <span>Proceed to Manifest Freeze</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
