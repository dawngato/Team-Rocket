"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import {
  CREDENTIAL_ENGINE_HANDOFF_TYPE,
  getCredentialHandoffStorageKey,
  identityClient,
  parseCredentialEngineHandoff,
  type CredentialEngineHandoff,
} from "@/lib/identity_client";
import type { Election } from "@/lib/types";

type CredentialPageState = "LOADING" | "READY" | "ISSUING" | "ISSUED" | "ERROR";

export default function GetCredentialPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [handoff, setHandoff] = useState<CredentialEngineHandoff | null>(null);
  const [issuanceStatus, setIssuanceStatus] = useState<string | null>(null);
  const [state, setState] = useState<CredentialPageState>("LOADING");
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    void Promise.all([
      electionClient.getElection(electionId),
      identityClient.getIssuanceStatus(electionId),
    ]).then(([nextElection, status]) => {
      if (cancelled) return;
      setElection(nextElection);
      setIssuanceStatus(status.status);
      if (status.delivered) setIssued(true);
      setState("READY");
    }).catch((cause) => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : "Credential status could not be loaded.");
        setState("ERROR");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  useEffect(() => {
    if (!electionId) return;
    try {
      const raw = window.sessionStorage.getItem(getCredentialHandoffStorageKey(electionId));
      if (!raw) return;
      const parsed = parseCredentialEngineHandoff(JSON.parse(raw), electionId);
      if (parsed) setHandoff(parsed);
      else setError("The supported engine returned an invalid credential handoff.");
    } catch {
      setError("The supported engine handoff could not be read. No credential request was made.");
    }
  }, [electionId]);

  const canRequest = useMemo(() => {
    if (!election || !handoff || issued) return false;
    return ["FROZEN", "SCHEDULED", "OPEN"].includes(election.state) && issuanceStatus !== "DELIVERED";
  }, [election, handoff, issued, issuanceStatus]);

  const handleIssue = async () => {
    if (!handoff || !canRequest) {
      setError("Credential issuance is blocked until the authoritative election, eligibility status, and supported engine handoff are available.");
      return;
    }
    setState("ISSUING");
    setError(null);
    try {
      await identityClient.issueCredential(handoff);
      setIssued(true);
      setIssuanceStatus("DELIVERED");
      setState("ISSUED");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Credential issuance failed. No local credential was created.");
      setState("READY");
    }
  };

  if (state === "LOADING") {
    return <div className="mx-auto max-w-2xl px-4 py-12 text-sm text-slate-600 dark:text-slate-300" role="status">Loading the authoritative election and credential status…</div>;
  }

  if (state === "ERROR" || !election) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-12">
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {error || "Credential issuance is unavailable because the authoritative service did not return an election."}
        </div>
        <Link href={`/student/elections/${encodeURIComponent(electionId)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-[#1E3352]">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to election
        </Link>
      </div>
    );
  }

  const unavailableReason = election.state !== "OPEN" && election.state !== "FROZEN" && election.state !== "SCHEDULED"
    ? `The election service reports ${election.state}; credential issuance is not allowed in this state.`
    : !handoff
      ? "No supported engine credential handoff is available. This page will not generate a blind request or credential locally."
      : issuanceStatus === "DELIVERED" || issued
        ? "The identity service has already delivered the credential signature for this election. Continue in the supported engine booth to unblind it and prepare the encrypted ballot."
        : null;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <header className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#157E92] text-white shadow-md"><KeyRound className="size-6" aria-hidden="true" /></div>
        <h1 className="text-2xl font-bold text-[#10233F] dark:text-white">Anonymous Credential Issuance</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">{election.title}</p>
      </header>

      <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#1E3352]">
          <span className="text-sm font-bold text-[#10233F] dark:text-white">Identity issuer status</span>
          <StateBadge state={election.state} size="sm" />
        </div>

        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          The identity service signs only a blinded value supplied by the supported election engine. This web page does not implement RSA blinding, create a credential, or invent a token.
        </p>

        {error && <div className="rounded-lg border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-xs text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</div>}

        {unavailableReason && !issued && (
          <div className="flex items-start gap-2 rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-xs leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{unavailableReason}</span>
          </div>
        )}

        {!issued && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300"><Lock className="size-4 text-[#157E92]" aria-hidden="true" />Credential handoff</div>
            <p className="mt-2 text-slate-500">{handoff ? `Received ${CREDENTIAL_ENGINE_HANDOFF_TYPE} from the supported engine.` : "Waiting for the supported engine to return a blinded request."}</p>
          </div>
        )}

        {issued && (
          <div className="space-y-3 rounded-lg border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-xs text-[#0F5B43] dark:text-[#86EFAC]" role="status">
            <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5" aria-hidden="true" />Identity service delivered a blind signature</div>
            <p>The signed value is intentionally not displayed or persisted by this page. The supported engine must unblind it and return a complete encrypted ballot handoff before casting can proceed.</p>
          </div>
        )}

        {!issued && (
          <button type="button" onClick={handleIssue} disabled={!canRequest || state === "ISSUING"} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0E6273] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]">
            {state === "ISSUING" ? "Requesting signature from identity service…" : "Request signature from identity service"}
          </button>
        )}

        {issued && <div className="flex items-start gap-2 rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-xs leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Return to the supported booth. Casting remains blocked until it returns a valid election-bound encrypted ballot handoff.</span></div>}

        <Link href={`/student/elections/${encodeURIComponent(election.id)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#157E92] hover:underline"><ArrowLeft className="size-4" aria-hidden="true" /> Back to election details</Link>
      </section>
    </main>
  );
}
