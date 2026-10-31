"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Plus, ShieldAlert, Trash2, Award, Users, CheckCircle2, Lock } from "lucide-react";
import { motion } from "motion/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StateBadge } from "@/components/StateBadge";
import { apiClient } from "@/lib/api_client";
import type { Candidate, CandidateDraft, Election } from "@/lib/types";

export default function OfficerCandidateManagementPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candName, setCandName] = useState("");
  const [statement, setStatement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    void Promise.all([
      apiClient.getElection(electionId, { includeInternal: true }),
      apiClient.getCandidates(electionId),
    ])
      .then(([nextElection, nextCandidates]) => {
        if (!nextElection) throw new Error("Election record not found in authoritative service.");
        setElection(nextElection);
        setCandidates(nextCandidates);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Candidate roster could not be retrieved from the election service.")
      );
  }, [electionId]);

  const replace = async (next: CandidateDraft[]) => {
    setBusy(true);
    setError(null);
    try {
      setCandidates(await apiClient.replaceCandidates(electionId, next));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Candidate modification was rejected by the election service.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!candName.trim() || !statement.trim()) return;
    await replace([
      ...candidates,
      {
        name: candName.trim(),
        contest: election?.contest || "Official Institutional Contest",
        statement: statement.trim(),
      },
    ]);
    setCandName("");
    setStatement("");
  };

  if (!election) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 text-sm" role="status">
        {error || "Retrieving authoritative election and candidate roster..."}
      </main>
    );
  }

  const locked = election.state !== "DRAFT";

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Transparency Officer Workspace", href: "/officer" },
          { label: "Contests", href: "/officer/elections" },
          { label: election.title, href: `/officer/elections/${election.id}/lifecycle` },
          { label: "Candidate Slate" },
        ]}
      />

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-[#1E3352]">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]">
            <Award className="size-4" aria-hidden="true" />
            Candidate Roster &amp; Nominee Slate
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            {election.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Official contestant directory. Changes are submitted to the authoritative election service before inclusion in the manifest.
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
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Official Nominees</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {candidates.length}
            </div>
            <span className="text-[11px] text-slate-500">Registered candidates</span>
          </div>
          <div className="p-3 rounded-xl bg-[#157E92]/10 text-[#157E92]">
            <Users className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Candidate Registry</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-6" />
              <span>{locked ? "Locked" : "Open"}</span>
            </div>
            <span className="text-[11px] text-slate-500">{locked ? "Pre-freeze verified" : "Draft mutations permitted"}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Lock className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contest Identifier</span>
            <div className="text-sm font-bold font-mono text-[#10233F] dark:text-white mt-1 truncate max-w-[140px]">
              {election.contest}
            </div>
            <span className="text-[11px] text-slate-500">Office specification</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Award className="size-5" />
          </div>
        </motion.div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">
          {error}
        </div>
      )}

      {locked && (
        <div className="flex items-center gap-2 rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-xs font-semibold text-[#6B4707] dark:text-amber-300">
          <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
          <span>The authoritative server reports this manifest as locked ({election.state}). Candidate registrations and edits are permanently disabled.</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {!locked && (
          <form
            onSubmit={handleAdd}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5 dark:border-[#1E3352] dark:bg-[#132135]"
          >
            <h2 className="font-bold text-[#10233F] dark:text-white">Register Contestant</h2>
            <div>
              <label htmlFor="cand-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Candidate Full Name *
              </label>
              <input
                id="cand-name"
                required
                value={candName}
                onChange={(event) => setCandName(event.target.value)}
                placeholder="e.g., Aarav Sundaram"
                className="min-h-11 w-full rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent px-3 text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
            <div>
              <label htmlFor="cand-statement" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Platform Statement *
              </label>
              <textarea
                id="cand-statement"
                required
                rows={4}
                value={statement}
                onChange={(event) => setStatement(event.target.value)}
                placeholder="Detail candidate objectives, policy proposals, and institutional agenda..."
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent px-3 py-2 text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white transition hover:bg-[#0E6273] disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              {busy ? "Submitting Registration..." : "Save Candidate to Manifest"}
            </button>
          </form>
        )}

        <section className={`${locked ? "lg:col-span-12" : "lg:col-span-7"} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#10233F] dark:text-white">
              Official Candidate Slate ({candidates.length})
            </h2>
            <Link
              href={`/officer/elections/${election.id}/roster`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#157E92] px-4 text-xs font-bold text-white transition hover:bg-[#0E6273]"
            >
              <span>Review Roster &amp; Voters</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-center text-xs text-slate-500">
              No candidates currently registered for this contest. Add official contestants using the registration form.
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md dark:border-[#1E3352] dark:bg-[#132135]"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white">{candidate.name}</h3>
                    <p className="text-xs font-mono text-[#157E92] dark:text-[#38BDF8]">{candidate.contest}</p>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{candidate.statement}</p>
                  </div>
                  {!locked && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void replace(candidates.filter((item) => item.id !== candidate.id))}
                      className="p-2 text-slate-400 hover:text-[#C23C45] transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                      aria-label={`Remove candidate ${candidate.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
