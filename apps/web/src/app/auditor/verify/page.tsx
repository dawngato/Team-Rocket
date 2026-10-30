"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileCheck2, Terminal } from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { Election, EvidencePackage } from "@/lib/types";

export default function AuditorVerifySuitePage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient.getElections().then((records) => {
      if (!active) return;
      setElections(records);
      setSelectedElectionId((current) => current || records[0]?.id || "");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "The election service could not be reached.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedElectionId) {
      setEvidence(null);
      return;
    }
    let active = true;
    setError(null);
    apiClient.getEvidence(selectedElectionId).then((metadata) => {
      if (active) setEvidence(metadata);
    }).catch((cause) => {
      if (active) {
        setEvidence(null);
        setError(cause instanceof Error ? cause.message : "No released evidence package was returned.");
      }
    });
    return () => { active = false; };
  }, [selectedElectionId]);

  const selectedElection = elections.find((item) => item.id === selectedElectionId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#AA6C0B]/10 text-[#AA6C0B] dark:text-[#FBBF24] mb-2">
          <FileCheck2 className="size-3.5" aria-hidden="true" />
          Offline verifier handoff
        </div>
        <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">Independent verification</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          The web client displays authoritative metadata only. It does not run a substitute verifier, trust archive-supplied keys, or claim native tally verification.
        </p>
      </header>

      {error && <div className="p-4 rounded-xl bg-[#C23C45]/10 border border-[#C23C45]/30 text-[#8B2630] dark:text-[#FCA5A5] text-sm" role="alert"><AlertTriangle className="inline-block size-4 mr-2 align-text-bottom" aria-hidden="true" />{error}</div>}

      <section className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-5">
        <div>
          <label htmlFor="verify-election" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Verification target</label>
          <select id="verify-election" value={selectedElectionId} onChange={(event) => setSelectedElectionId(event.target.value)} disabled={loading || elections.length === 0} className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]">
            {elections.map((election) => <option key={election.id} value={election.id}>{election.title}</option>)}
          </select>
        </div>
        {selectedElection && <p className="text-xs text-slate-500">Lifecycle state: <strong>{selectedElection.state}</strong></p>}
        {evidence ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div><span className="text-slate-500 block">Manifest</span><code className="break-all">{evidence.manifest_digest}</code></div>
            <div><span className="text-slate-500 block">Final checkpoint</span><code className="break-all">{evidence.final_checkpoint_digest}</code></div>
            <div><span className="text-slate-500 block">Anchor</span><code className="break-all">{evidence.anchor_tx_hash}</code></div>
            <div><span className="text-slate-500 block">Auditor attestation</span><code className="break-all">{evidence.auditor_signature}</code></div>
          </div>
        ) : <p className="text-sm text-slate-500">No released evidence metadata is available for this election.</p>}
      </section>

      <section className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Terminal className="size-5 text-[#AA6C0B] mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-[#6B4707] dark:text-[#FBBF24]">Verification is an offline operation</h2>
            <p className="text-sm text-[#6B4707] dark:text-[#FBBF24] mt-1">Download the released archive and obtain witness, manifest, and chain trust pins out of band. The native engine tally gate remains blocked until a supported engine is integrated and independently verified.</p>
          </div>
        </div>
        <code className="block rounded-lg bg-slate-950 text-slate-100 p-4 text-xs overflow-x-auto">python -m securevote_verifier verify --archive ./election.zip --trust ./trusted_witnesses.json --report ./audit-report.json</code>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/auditor/evidence" className="font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline">Download evidence</Link>
          <Link href="/security-limits" className="font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline">Review security limits</Link>
        </div>
      </section>
    </div>
  );
}
