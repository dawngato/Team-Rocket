"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Send } from "lucide-react";
import { StateBadge } from "../../../../../components/StateBadge";
import { apiClient } from "../../../../../lib/api_client";
import type { Election } from "../../../../../lib/types";

export default function OfficerPublicationRequestPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [auditorPublicKey, setAuditorPublicKey] = useState("");
  const [auditorSignature, setAuditorSignature] = useState("");
  const [attestation, setAttestation] = useState("");
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (electionId) void apiClient.getElection(electionId, { includeInternal: true }).then(setElection).catch((cause) => setError(cause instanceof Error ? cause.message : "Election unavailable.")); }, [electionId]);
  const submit = async () => {
    if (!election) return;
    setBusy(true); setError(null);
    try {
      const attestationData = JSON.parse(attestation) as unknown;
      if (!attestationData || typeof attestationData !== "object" || Array.isArray(attestationData)) throw new Error("Attestation must be a JSON object exported by the auditor workflow.");
      const updated = await apiClient.requestPublication(election.id, { auditor_public_key: auditorPublicKey.trim(), auditor_signature: auditorSignature.trim(), attestation_data: attestationData as Record<string, unknown> });
      setElection(updated); setRequested(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publication request was rejected by the admin service."); }
    finally { setBusy(false); }
  };
  if (!election) return <main className="mx-auto max-w-4xl px-4 py-12 text-sm" role="status">{error || "Loading authoritative election…"}</main>;
  return <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-[#1E3352]"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#15805D]"><Send className="size-4" aria-hidden="true" />Publication evidence review</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Official result publication request</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{election.title}</p></div><StateBadge state={election.state} size="md" /></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}{requested ? <div className="space-y-2 rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-5 text-sm text-[#0F5B43]" role="status"><strong>Publication request accepted by the admin service.</strong><p>The authoritative election state is now {election.state}. Results remain unavailable unless the complete witness, anchor, auditor, and tally gates pass.</p></div> : <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">Paste the signed attestation package produced by the independently operated auditor. This page never generates a signature or reports success before the server verifies it.</p><input required value={auditorPublicKey} onChange={(event) => setAuditorPublicKey(event.target.value)} placeholder="Auditor public key" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><input required value={auditorSignature} onChange={(event) => setAuditorSignature(event.target.value)} placeholder="Auditor signature" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><textarea required rows={10} value={attestation} onChange={(event) => setAttestation(event.target.value)} placeholder="Signed attestation JSON" className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 font-mono text-xs" /><button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-5 text-sm font-bold text-white disabled:opacity-50"><Send className="size-4" aria-hidden="true" />{busy ? "Submitting for verification…" : "Submit signed publication package"}</button></section>}<Link href={`/audit?election=${encodeURIComponent(election.id)}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#157E92]">Inspect audit evidence <ArrowRight className="size-4" aria-hidden="true" /></Link></main>;
}
