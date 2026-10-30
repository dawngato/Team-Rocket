"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck, Key, Send } from "lucide-react";
import { StateBadge } from "../../../components/StateBadge";
import { apiClient } from "../../../lib/api_client";
import type { Election } from "../../../lib/types";

export default function AuditorSignReportPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [signature, setSignature] = useState("");
  const [attestationJson, setAttestationJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void apiClient.getElections().then((rows) => { setElections(rows); if (rows[0]) void apiClient.getElection(rows[0].id).then(setElection); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Election evidence unavailable.")); }, []);
  const submit = async () => {
    if (!election) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const parsed = JSON.parse(attestationJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Attestation must be a JSON object.");
      const updated = await apiClient.requestPublication(election.id, { auditor_public_key: publicKey.trim(), auditor_signature: signature.trim(), attestation_data: parsed as Record<string, unknown> });
      setElection(updated); setMessage(`The admin service verified and recorded the attestation. Current state: ${updated.state}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Signed attestation was rejected."); }
    finally { setBusy(false); }
  };
  if (!election) return <main className="mx-auto max-w-4xl px-4 py-12 text-sm" role="status">{error || "Loading authoritative evidence…"}</main>;
  return <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#15805D]"><Key className="size-4" aria-hidden="true" />Auditor attestation import</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Verify and submit signed report</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Private keys remain outside this web application. Import the public key, signature and JSON produced by the independently operated verifier.</p></header><div className="flex items-center gap-3"><select value={election.id} onChange={(event) => { const row = elections.find((item) => item.id === event.target.value); if (row) void apiClient.getElection(row.id).then(setElection); }} className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 text-sm">{elections.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select><StateBadge state={election.state} size="md" /></div>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}{message && <div className="rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-sm text-[#0F5B43]" role="status">{message}</div>}<section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="flex items-center gap-2 font-bold text-[#10233F] dark:text-white"><FileCheck className="size-5 text-[#157E92]" aria-hidden="true" />External signature package</div><input required value={publicKey} onChange={(event) => setPublicKey(event.target.value)} placeholder="Auditor public key" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><input required value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Ed25519 signature" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><textarea required rows={12} value={attestationJson} onChange={(event) => setAttestationJson(event.target.value)} placeholder="Signed attestation JSON" className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 font-mono text-xs" /><button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#15805D] px-5 text-sm font-bold text-white disabled:opacity-50"><Send className="size-4" aria-hidden="true" />{busy ? "Verifying package…" : "Import and submit attestation"}</button></section><Link href={`/audit?election=${encodeURIComponent(election.id)}`} className="font-semibold text-[#157E92]">Return to audit explorer</Link></main>;
}
