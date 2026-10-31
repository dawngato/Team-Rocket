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
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Section */}
      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#157E92]">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Evidence explorer
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">
          Public Audit Explorer
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          Authoritative cryptographic evidence logs for campus contests. Every manifest, Merkle tree root checkpoint, and witness attestation is publicly inspectable and mathematically verifiable.
        </p>

        {/* 3 Pillar Summary Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#10233F] dark:text-white mb-1">
              <Layers className="size-3.5 text-[#157E92]" aria-hidden="true" />
              <span>Immutable Ledger</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              RFC 9162 append-only log ensures past ballots cannot be modified or erased.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#10233F] dark:text-white mb-1">
              <Lock className="size-3.5 text-[#157E92]" aria-hidden="true" />
              <span>Independent Witness</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Final tallies require third-party cryptographic witness co-signatures.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#10233F] dark:text-white mb-1">
              <CheckCircle2 className="size-3.5 text-[#15805D]" aria-hidden="true" />
              <span>Zero-Fixture Standard</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Only authentic evidence returned by live services is shown; no synthetic data.
            </p>
          </div>
        </div>
      </header>

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
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-[#10233F] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#157E92] dark:border-[#1E3352] dark:bg-[#132135] dark:text-white"
        />
      </div>

      {error && (
        <div
          className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-sm text-[#6B4707] dark:text-[#FBBF24] flex items-center gap-2"
          role="alert"
        >
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Evidence List */}
      <section className="space-y-4">
        {filtered.map(({ election, evidence }) => {
          const isFrozen = Boolean(election.manifest_digest);
          const hasWitness = Boolean(evidence?.final_checkpoint_digest);

          return (
            <article
              key={election.id}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] transition-all hover:border-slate-300 dark:hover:border-[#2C4A75]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1E3352] pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
                      {election.title}
                    </h2>
                    <StateBadge state={election.state} size="sm" />
                  </div>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">
                    ID: {election.id}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/auditor/verify?election=${encodeURIComponent(election.id)}`}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-[#157E92] hover:bg-[#0E6273] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
                  >
                    <FileCheck className="size-3.5" aria-hidden="true" />
                    Verify Proof Package
                  </Link>
                </div>
              </div>

              {/* Cryptographic Digests Grid */}
              <dl className="grid gap-3.5 font-mono text-xs sm:grid-cols-2">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                  <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Manifest Digest</span>
                    <span className="text-[10px] font-mono text-slate-400">{isFrozen ? "SHA-256" : "PENDING"}</span>
                  </dt>
                  <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                    {election.manifest_digest || "Not frozen yet"}
                  </dd>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                  <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Witness Checkpoint</span>
                    <span className="text-[10px] font-mono text-slate-400">{hasWitness ? "RFC 9162" : "AWAITING TALLY"}</span>
                  </dt>
                  <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                    {evidence?.final_checkpoint_digest || "Not released"}
                  </dd>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                  <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Chain Anchor
                  </dt>
                  <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                    {evidence?.anchor_tx_hash || "Not released"}
                  </dd>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B1524] border border-slate-100 dark:border-[#1A2D48]">
                  <dt className="font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Auditor Signature
                  </dt>
                  <dd className="break-all mt-1 text-[#10233F] dark:text-slate-200 font-mono text-[11px]">
                    {evidence?.auditor_signature || "Not released"}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}

        {/* Informative Empty State */}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1A2D48] text-slate-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[#10233F] dark:text-white">
              No Authoritative Evidence Packages Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Per strict institutional verification guidelines, only cryptographic proofs issued by live authoritative services are shown. No simulated or mock data is injected.
            </p>
            <div className="pt-2">
              <Link
                href="/elections"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#157E92] hover:underline"
              >
                <span>Browse active campus elections</span>
                <ExternalLink className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
