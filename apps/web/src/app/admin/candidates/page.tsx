"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertCircle, Plus, ShieldAlert, Trash2, Award, ShieldCheck, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { Candidate, CandidateDraft, Election } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AdminCandidatesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [electionId, setElectionId] = useState("");
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiClient.getElections({ includeInternal: true }).then((rows) => {
      if (!active) return;
      setElections(rows);
      setElectionId(rows[0]?.id || "");
      setError(null);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "The scoped election list could not be loaded.");
    }).finally(() => {
      if (active) setLoadingElections(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!electionId) {
      setElection(null);
      setCandidates([]);
      return;
    }
    let active = true;
    setLoadingCandidates(true);
    void Promise.all([
      apiClient.getElection(electionId, { includeInternal: true }),
      apiClient.getCandidates(electionId),
    ]).then(([nextElection, nextCandidates]) => {
      if (!active) return;
      if (!nextElection) throw new Error("The election is not available in your assigned scope.");
      setElection(nextElection);
      setCandidates(nextCandidates);
      setError(null);
    }).catch((cause) => {
      if (!active) return;
      setElection(null);
      setCandidates([]);
      setError(cause instanceof Error ? cause.message : "Candidate records could not be loaded.");
    }).finally(() => {
      if (active) setLoadingCandidates(false);
    });
    return () => { active = false; };
  }, [electionId]);

  const persistCandidates = async (next: CandidateDraft[]) => {
    if (!electionId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await apiClient.replaceCandidates(electionId, next);
      setCandidates(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The election service rejected this candidate update.");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !election) return;
    const candidate: CandidateDraft = {
      name: name.trim(),
      contest: election.contest || election.title,
      statement: statement.trim(),
    };
    await persistCandidates([...candidates, candidate]);
    setName("");
    setStatement("");
  };

  const editable = election?.state === "DRAFT";

  const breadcrumbs = [
    { label: "Workspace", href: "/admin" },
    { label: "Candidate Rosters" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end dark:border-[#1E3352]">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-[#157E92]/10 px-2.5 py-0.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
            <Award className="size-3.5" aria-hidden="true" />
            Election Commission
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
            Official Candidate Rosters
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Candidate listings are saved directly to the election service and freeze immutably once the manifest hash is generated.
          </p>
        </div>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>Assigned Election Contest:</span>
          <select
            value={electionId}
            onChange={(event) => setElectionId(event.target.value)}
            disabled={loadingElections || elections.length === 0}
            className="min-h-11 min-w-64 rounded-xl border border-slate-300 bg-white px-3.5 text-xs sm:text-sm font-semibold dark:border-[#1E3352] dark:bg-[#132135] dark:text-white"
          >
            {elections.length === 0 && <option value="">No assigned elections</option>}
            {elections.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title} ({row.state})
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loadingElections && (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135]" role="status">
          Loading assigned elections…
        </p>
      )}

      {!loadingElections && !error && elections.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-[#1E3352] dark:bg-[#132135]" role="status">
          No elections are available in your assigned scope.
        </p>
      )}

      {election && (
        <>
          {/* Animated Statistics Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Selected Contest
              </span>
              <div className="mt-2 text-lg font-extrabold text-[#10233F] dark:text-white truncate">
                {election.title}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Contest state: <span className="font-bold uppercase">{election.state}</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Official Nominees
              </span>
              <div className="mt-2 text-2xl font-extrabold font-mono text-[#157E92] dark:text-[#38BDF8]">
                {candidates.length}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Validated contestant entries
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Manifest Integrity
              </span>
              <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
                <ShieldCheck className="size-4" />
                <span>{editable ? "Mutable Draft" : "Cryptographically Frozen"}</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                {editable ? "Modifications permitted prior to freeze" : "Immutable hash locked against alteration"}
              </span>
            </motion.div>
          </div>

          {!editable && (
            <div
              className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
              role="status"
            >
              <ShieldAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
              <span>The authoritative election state is {election.state}. Candidate edits are locked by protocol.</span>
            </div>
          )}

          {editable && (
            <form
              onSubmit={handleAdd}
              className="grid gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] md:grid-cols-[1fr_2fr_auto] md:items-end"
            >
              <label className="grid gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Candidate Name *</span>
                <input
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full candidate name"
                  className="min-h-11 rounded-xl border border-slate-300 bg-transparent px-3.5 text-sm text-slate-900 dark:border-[#1E3352] dark:text-white"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Platform Statement / Bio</span>
                <input
                  maxLength={5000}
                  value={statement}
                  onChange={(event) => setStatement(event.target.value)}
                  placeholder="Candidate manifesto or position statement"
                  className="min-h-11 rounded-xl border border-slate-300 bg-transparent px-3.5 text-sm text-slate-900 dark:border-[#1E3352] dark:text-white"
                />
              </label>
              <button
                type="submit"
                disabled={saving || loadingCandidates}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Add Candidate</span>
              </button>
            </form>
          )}

          {loadingCandidates ? (
            <p className="py-8 text-center text-sm text-slate-500" role="status">
              Loading authoritative candidate roster…
            </p>
          ) : (
            <section className="space-y-3" aria-label="Authoritative candidate roster">
              {candidates.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-[#1E3352]">
                  No candidates are currently registered for this contest.
                </p>
              )}
              {candidates.map((candidate, idx) => (
                <motion.article
                  key={candidate.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-[#1E3352] dark:bg-[#132135]"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-[#10233F] dark:text-white">
                      {candidate.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">{candidate.contest}</p>
                    {candidate.statement && (
                      <p className="mt-2.5 whitespace-pre-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {candidate.statement}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[10px] text-slate-400">ID: {candidate.id}</p>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void persistCandidates(candidates.filter((item) => item.id !== candidate.id))}
                      aria-label={`Remove ${candidate.name}`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </motion.article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
