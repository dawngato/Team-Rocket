"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Lock, ShieldCheck, CheckCircle2, AlertTriangle, FileKey, RefreshCw, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Election } from "@/lib/types";

export default function OfficerFreezeManifestPage() {
  const electionId = useParams()?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void apiClient
      .getElection(electionId, { includeInternal: true })
      .then(setElection)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Election manifest data unavailable.")
      );
  }, [electionId]);

  const freeze = async () => {
    if (!election) return;
    setBusy(true);
    setError(null);
    try {
      setElection(await apiClient.freezeElection(election.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Manifest freeze operation was rejected by the election authority.");
    } finally {
      setBusy(false);
    }
  };

  const copyDigest = () => {
    if (!election?.manifest_digest) return;
    navigator.clipboard.writeText(election.manifest_digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!election) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-sm" role="status">
        {error || "Retrieving authoritative election manifest..."}
      </main>
    );
  }

  const frozen = election.state !== "DRAFT";

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Transparency Officer Workspace", href: "/officer" },
          { label: "Contests", href: "/officer/elections" },
          { label: election.title, href: `/officer/elections/${election.id}/lifecycle` },
          { label: "Freeze Manifest" },
        ]}
      />

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-[#1E3352]">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#AA6C0B] dark:text-amber-400">
            <Lock className="size-4" aria-hidden="true" />
            Cryptographic Immutability Milestone
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Freeze Election Manifest
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
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Manifest State</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-6" />
              <span>{frozen ? "FROZEN" : "UNLOCKED"}</span>
            </div>
            <span className="text-[11px] text-slate-500">{frozen ? "Digest sealed & published" : "Awaiting cryptographic seal"}</span>
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
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Eligible Voters</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {election.eligible_count ?? "Pre-Freeze"}
            </div>
            <span className="text-[11px] text-slate-500">Fixed at manifest seal</span>
          </div>
          <div className="p-3 rounded-xl bg-[#157E92]/10 text-[#157E92]">
            <FileKey className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Seal Integrity</span>
            <div className="text-base font-bold font-mono text-[#10233F] dark:text-white mt-1">
              SHA-256 Digest
            </div>
            <span className="text-[11px] text-slate-500">Public verifier compatible</span>
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

      <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div>
          <h2 className="text-base font-bold text-[#10233F] dark:text-white">
            Cryptographic Manifest Digest
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Freezing commits the election configuration, candidate roster, and eligible Student Voter census to an immutable SHA-256 digest. Once frozen, candidate lists and voter eligibility thresholds cannot be altered.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 font-mono text-xs dark:border-[#1E3352] dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-sans font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
              Authoritative Manifest Digest
            </span>
            {election.manifest_digest && (
              <button
                type="button"
                onClick={copyDigest}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-white font-sans text-xs transition"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                <span>{copied ? "Copied" : "Copy Digest"}</span>
              </button>
            )}
          </div>
          <span className="break-all font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            {election.manifest_digest || "Manifest unsealed. Freeze required to generate authoritative digest."}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {frozen ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#15805D] dark:text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>Manifest is permanently locked and registered as {election.state}.</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void freeze()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#AA6C0B] hover:bg-[#8B5606] px-6 text-sm font-bold text-white transition disabled:opacity-50 shadow-sm"
            >
              {busy ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Freezing and Sealing Manifest...</span>
                </>
              ) : (
                <>
                  <Lock className="size-4" aria-hidden="true" />
                  <span>Freeze &amp; Lock Election Manifest</span>
                </>
              )}
            </button>
          )}

          <Link
            href={`/officer/elections/${election.id}/lifecycle`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-6 text-sm font-bold text-white transition shadow-sm ml-auto"
          >
            <span>Proceed to Lifecycle Governance</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
