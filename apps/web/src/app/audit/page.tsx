"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  Search,
  ShieldCheck,
  Layers,
  Lock,
  ExternalLink,
  Info,
  Users,
  CheckCircle2,
} from "lucide-react";
import { StateBadge } from "../../components/StateBadge";
import { apiClient } from "../../lib/api_client";
import type { Election, EvidencePackage } from "../../lib/types";

type AuditRecord = { election: Election; evidence: EvidencePackage | null };

export default function PublicAuditExplorerPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void apiClient
      .getElections()
      .then((summaries) =>
        Promise.all(
          summaries.map(async (summary) => {
            const election = await apiClient.getElection(summary.id);
            return election
              ? { election, evidence: await apiClient.getEvidence(summary.id) }
              : null;
          })
        )
      )
      .then((rows) =>
        setRecords(rows.filter((row): row is AuditRecord => Boolean(row)))
      )
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Audit evidence unavailable."
        )
      );
  }, []);

  const filtered = useMemo(
    () =>
      records.filter(({ election, evidence }) => {
        const value = term.toLowerCase();
        return (
          !value ||
          [
            election.title,
            election.id,
            election.manifest_digest,
            evidence?.final_checkpoint_digest,
            evidence?.anchor_tx_hash,
          ].some((field) => field?.toLowerCase().includes(value))
        );
      }),
    [records, term]
  );

  return (
    <main className="mx-auto w-full max-w-[1850px] space-y-10 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-12">
      {/* Header Section */}
      <header className="border-b border-slate-200 pb-8 dark:border-[#1E3352] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-mono">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <span>Evidence Reported by Configured Services</span>
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
              Public Audit Explorer
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Not Independently Verified Here</span>
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-4xl leading-relaxed">
          Review election and evidence fields returned by configured services. This page does not verify witness signatures, blockchain inclusion, or tally correctness.
        </p>

        {/* 3 Pillar Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10233F] dark:text-white mb-1">
              <Layers className="size-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <span>Tamper-Evident Ledger</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              Merkle proofs can support inclusion and consistency checks when published evidence and an authenticated root are available.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10233F] dark:text-white mb-1">
              <Users className="size-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <span>Witness Checkpoints</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              Witness signatures may be reported by the service. Operator independence and key custody must be checked separately.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10233F] dark:text-white mb-1">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Cryptographic Integrity Checks</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              An inclusion check requires a proof, an authenticated checkpoint root, and a verifier. A receipt alone does not establish ballot secrecy or tally correctness.
            </p>
          </div>
        </div>
      </header>

      <section
        role="note"
        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
      >
        This prototype displays evidence fields returned by configured services. It does not generate sample
        receipts, calculate Merkle proofs, or independently verify witness signatures, chain transactions, or
        election results. Verify those items with a trusted independent verifier before relying on them.
      </section>

      {/* Configured Service Evidence Search */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#10233F] dark:text-white">
              Election Evidence Records
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Search records returned by the configured election and evidence services. Returned fields are not independently verified here.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="audit-search-input"
            aria-label="Search audit records"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by election name, contest ID, manifest hash, or checkpoint digest…"
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-xs sm:text-sm text-[#10233F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-[#1E3352] dark:bg-[#132135] dark:text-white shadow-sm"
          />
        </div>

        {error && (
          <div
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2"
            role="alert"
          >
            <Info className="size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Service-reported election records */}
        <div className="space-y-4">
          {filtered.map(({ election, evidence }) => {
            const isFrozen = Boolean(election.manifest_digest);
            const hasWitness = Boolean(evidence?.final_checkpoint_digest);

            return (
              <article
                key={election.id}
                className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] transition-all hover:border-slate-300 dark:hover:border-[#2C4A75]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1E3352] pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-[#10233F] dark:text-white">
                        {election.title}
                      </h3>
                      <StateBadge state={election.state} size="sm" />
                    </div>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">
                      Contest Identifier: {election.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/auditor/verify?election=${encodeURIComponent(election.id)}`}
                      className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                    >
                      <FileCheck className="size-3.5" aria-hidden="true" />
                      <span>Open Verification Page</span>
                    </Link>
                  </div>
                </div>

                {/* Cryptographic Digests Grid */}
                <dl className="grid gap-3.5 font-mono text-xs sm:grid-cols-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                    <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Manifest Digest</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {isFrozen ? "DIGEST REPORTED" : "NO DIGEST REPORTED"}
                      </span>
                    </dt>
                    <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                      {election.manifest_digest || "Manifest not frozen yet"}
                    </dd>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                    <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Checkpoint Digest Reported by Service</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {hasWitness ? "DIGEST REPORTED" : "NO DIGEST REPORTED"}
                      </span>
                    </dt>
                    <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                      {evidence?.final_checkpoint_digest || "No checkpoint digest returned"}
                    </dd>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                    <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Anchor Transaction Reference
                    </dt>
                    <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                      {evidence?.anchor_tx_hash || "No transaction reference returned"}
                    </dd>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                    <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Auditor Signature Reference
                    </dt>
                    <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                      {evidence?.auditor_signature || "No auditor signature returned"}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}

          {/* Informative Zero-Fixture Standard Empty State */}
          {filtered.length === 0 && (
            <div className="rounded-3xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-10 text-center space-y-3">
              <div className="size-12 rounded-full bg-slate-100 dark:bg-[#1A2D48] text-slate-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="size-6 text-cyan-500" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#10233F] dark:text-white">
                No Matching Evidence Records Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                No records matched this search, or the configured service returned no records. This page does not certify that returned data is authentic or complete.
              </p>
              <div className="pt-2">
                <Link
                  href="/elections"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  <span>Browse active campus elections</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
