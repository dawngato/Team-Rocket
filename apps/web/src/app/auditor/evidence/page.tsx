"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, FileArchive, ShieldCheck, Upload } from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api_client";
import type { Election, EvidencePackage } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AuditorEvidencePage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setLoadingEvidence(true);
    setError(null);
    apiClient.getEvidence(selectedElectionId).then((metadata) => {
      if (active) setEvidence(metadata);
    }).catch((cause) => {
      if (active) {
        setEvidence(null);
        setError(cause instanceof Error ? cause.message : "No released evidence package was returned.");
      }
    }).finally(() => {
      if (active) setLoadingEvidence(false);
    });
    return () => { active = false; };
  }, [selectedElectionId]);

  const selectedElection = elections.find((item) => item.id === selectedElectionId);

  const handleDownload = async () => {
    if (!selectedElectionId) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await apiClient.downloadEvidence(selectedElectionId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `himvote_evidence_${selectedElectionId}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("The archive was downloaded from the authoritative evidence service. Run the standalone verifier with an independently supplied trust bundle.");
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "The evidence archive could not be downloaded.");
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage("The browser does not establish witness, chain, or native tally trust. Use the offline verifier CLI against this archive and an out-of-band trust bundle.");
    setError(null);
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/auditor" },
    { label: "Evidence Archive" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      <header className="pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-2">
          <FileArchive className="size-3.5" aria-hidden="true" />
          Authoritative evidence package
        </div>
        <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">Evidence archive</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          This page retrieves evidence released by the election service. It does not generate fixture archives or turn a browser-side hash into an independent audit result.
        </p>
      </header>

      {error && <div className="p-4 rounded-xl bg-[#C23C45]/10 border border-[#C23C45]/30 text-[#8B2630] dark:text-[#FCA5A5] text-sm" role="alert"><AlertTriangle className="inline-block size-4 mr-2 align-text-bottom" aria-hidden="true" />{error}</div>}
      {message && <div className="p-4 rounded-xl bg-[#AA6C0B]/10 border border-[#AA6C0B]/30 text-[#6B4707] dark:text-[#FBBF24] text-sm" role="status">{message}</div>}

      <section className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-5">
        <div>
          <label htmlFor="evidence-election" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Election</label>
          <select
            id="evidence-election"
            value={selectedElectionId}
            onChange={(event) => setSelectedElectionId(event.target.value)}
            disabled={loading || elections.length === 0}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          >
            {elections.map((election) => <option key={election.id} value={election.id}>{election.title}</option>)}
          </select>
        </div>

        {selectedElection && <p className="text-xs text-slate-500">Lifecycle state: <strong>{selectedElection.state}</strong>. Evidence is only usable after the service releases a final package.</p>}

        {loadingEvidence ? <p className="text-sm text-slate-500">Loading evidence metadata…</p> : evidence ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div><span className="text-slate-500 block">Manifest digest</span><code className="break-all">{evidence.manifest_digest}</code></div>
            <div><span className="text-slate-500 block">Final checkpoint</span><code className="break-all">{evidence.final_checkpoint_digest}</code></div>
            <div><span className="text-slate-500 block">Anchor transaction</span><code className="break-all">{evidence.anchor_tx_hash}</code></div>
            <div><span className="text-slate-500 block">Auditor attestation</span><code className="break-all">{evidence.auditor_signature}</code></div>
          </div>
        ) : <p className="text-sm text-slate-500">No released evidence metadata is available for this election.</p>}

        <button
          type="button"
          onClick={handleDownload}
          disabled={!evidence || downloading}
          className="min-h-[44px] px-5 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
        >
          <Download className="size-4" aria-hidden="true" />
          {downloading ? "Downloading…" : "Download released archive"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="size-5 text-[#157E92] mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-[#10233F] dark:text-white">Run the verifier offline</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Selecting a file here only records the filename. It never reports PASS from an untrusted browser upload.</p>
          </div>
        </div>
        <label htmlFor="archive-upload" className="border-2 border-dashed border-slate-300 dark:border-[#1E3352] hover:border-[#157E92] rounded-xl p-6 text-center cursor-pointer block focus-within:ring-2 focus-within:ring-[#157E92]">
          <Upload className="size-7 text-slate-400 mx-auto mb-2" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Choose a released ZIP or tar archive</span>
          <span className="text-[11px] text-slate-500 block mt-1">{fileName || "No archive selected"}</span>
          <input id="archive-upload" type="file" accept=".zip,.tar,.gz,.tar.gz" onChange={handleFileSelection} className="sr-only" />
        </label>
        <p className="text-xs text-slate-500">Use <code>python -m verifier verify --archive ./election.zip --trust ./trusted_witnesses.json --report ./audit-report.json --final ./witness_final.json --roster ./roster_approval.json --issuance ./issuance_closure.json --chain ./chain_anchor.json</code> and inspect property-level results.</p>
        <Link href="/auditor/verify" className="text-sm font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline">Open verifier instructions</Link>
      </section>
    </div>
  );
}
