"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { VotingStepper } from "@/components/VotingStepper";
import { electionClient } from "@/lib/election_client";
import {
  CREDENTIAL_ENGINE_HANDOFF_TYPE,
  getCredentialHandoffStorageKey,
  getCredentialProofStorageKey,
  getCredentialStateStorageKey,
  identityClient,
  parseCredentialEngineHandoff,
  type CredentialEngineHandoff,
} from "@/lib/identity_client";
import { createCredentialRequest, finalizeCredential, type CredentialRequestState } from "@/lib/credential_crypto";
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
      identityClient.getIssuerPublicKey(),
    ]).then(async ([nextElection, status, issuerKey]) => {
      if (cancelled) return;
      setElection(nextElection);
      setIssuanceStatus(status.status);
      const storedProof = window.sessionStorage.getItem(getCredentialProofStorageKey(electionId));
      if (status.delivered && storedProof) setIssued(true);

      let parsed: CredentialEngineHandoff | null = null;
      try {
        const raw = window.sessionStorage.getItem(getCredentialHandoffStorageKey(electionId));
        parsed = raw ? parseCredentialEngineHandoff(JSON.parse(raw), electionId) : null;
      } catch {
        parsed = null;
      }
      if (!parsed && status.status === "none") {
        const generated = await createCredentialRequest(electionId, issuerKey);
        window.sessionStorage.setItem(getCredentialHandoffStorageKey(electionId), JSON.stringify(generated.handoff));
        window.sessionStorage.setItem(getCredentialStateStorageKey(electionId), JSON.stringify(generated.state));
        parsed = generated.handoff;
      }
      if (!parsed && !status.delivered) throw new Error("The browser could not create a valid blind credential request.");
      if (parsed) setHandoff(parsed);
      if (status.delivered && !storedProof) setError("The issuer has already consumed this one-time request, but this browser no longer has the private blinding state. Start a new election session instead of attempting a replacement credential.");
      setState("READY");
    }).catch((cause) => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : "Credential status could not be loaded.");
        setState("ERROR");
      }
    });
    return () => { cancelled = true; };
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
      const response = await identityClient.issueCredential(handoff);
      const rawState = window.sessionStorage.getItem(getCredentialStateStorageKey(electionId));
      if (!rawState) throw new Error("The browser lost the private blinding state; the signed credential cannot be safely unblinded.");
      const requestState = JSON.parse(rawState) as CredentialRequestState;
      const currentElection = election;
      if (!currentElection) throw new Error("The authoritative election disappeared while the credential was being finalized.");
      const proof = await finalizeCredential(requestState, currentElection.manifest_digest, response.blind_signature_response);
      window.sessionStorage.setItem(getCredentialProofStorageKey(electionId), proof);
      setIssued(true);
      setIssuanceStatus("DELIVERED");
      setState("ISSUED");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Credential issuance failed. No local credential was created.");
      setState("READY");
    }
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Elections", href: "/student/elections" },
    { label: election?.title || `Election ${electionId.substring(0, 8)}`, href: `/student/elections/${encodeURIComponent(electionId)}` },
    { label: "Blind Credential" },
  ];

  if (state === "LOADING") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-600 dark:text-slate-300" role="status">
        <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-[#157E92] border-t-transparent" />
        Loading authoritative election and credential status…
      </div>
    );
  }

  if (state === "ERROR" || !election) {
    return (
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-12">
        <Breadcrumbs items={breadcrumbs} />
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {error || "Credential issuance is unavailable because the authoritative service did not return an election."}
        </div>
        <Link href={`/student/elections/${encodeURIComponent(electionId)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-[#1E3352]">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to election
        </Link>
      </main>
    );
  }

  const unavailableReason = election.state !== "OPEN" && election.state !== "FROZEN" && election.state !== "SCHEDULED"
    ? `The election service reports ${election.state}; credential issuance is not allowed in this state.`
    : !handoff
      ? "No supported engine credential handoff is available. This page will not generate a blind request or credential locally."
      : issuanceStatus === "DELIVERED" || issued
        ? "The identity service has already delivered the credential signature for this election."
        : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      {/* Stepper */}
      <VotingStepper
        currentStep={1}
        electionId={election.id}
        hasCredential={issued}
      />

      <header className="space-y-2 text-center pt-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#157E92] text-white shadow-md">
          <KeyRound className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white">
          Anonymous Credential Issuance
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {election.title}
        </p>
      </header>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-[#1E3352]">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Authority Status</span>
            <h2 className="text-sm font-bold text-[#10233F] dark:text-white">Identity Registrar</h2>
          </div>
          <StateBadge state={election.state} size="sm" />
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This browser created a fresh blinded request locally. The registrar signs only the blinded value and never learns your final ballot token or serial number. Once unblinded, the credential binds strictly to this election manifest.
        </p>

        {error && (
          <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-xs sm:text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
            {error}
          </div>
        )}

        {unavailableReason && !issued && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-4 text-xs sm:text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{unavailableReason}</span>
          </div>
        )}

        {!issued && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <Lock className="size-4 text-[#157E92]" aria-hidden="true" />
              <span>Blinded Protocol Request</span>
            </div>
            <p className="mt-1.5 text-slate-500 dark:text-slate-400">
              {handoff
                ? `Prepared ${CREDENTIAL_ENGINE_HANDOFF_TYPE} with RFC 9474 blinding factor.`
                : "Waiting for a valid blinded request token."}
            </p>
          </div>
        )}

        {issued && (
          <div className="space-y-3 rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-5 text-xs sm:text-sm text-[#0F5B43] dark:text-[#86EFAC]" role="status">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              <span>Blind Signature Verified & Unblinded Locally</span>
            </div>
            <p className="leading-relaxed">
              Your anonymous credential proof is safely stored in this browser session. The identity registrar cannot link this credential to your cast ballot.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 space-y-4">
          {!issued && (
            <button
              type="button"
              onClick={handleIssue}
              disabled={!canRequest || state === "ISSUING"}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#157E92] px-6 text-sm font-bold text-white shadow-sm transition-all duration-75 ease-out hover:bg-[#0E6273] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
            >
              {state === "ISSUING" ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Requesting signature from identity service…</span>
                </>
              ) : (
                <>
                  <KeyRound className="size-4" aria-hidden="true" />
                  <span>Request Anonymous Credential</span>
                </>
              )}
            </button>
          )}

          {issued && (
            <Link
              href={`/student/elections/${encodeURIComponent(election.id)}/cast`}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#15805D] px-6 text-sm font-bold text-white shadow-sm transition-all duration-75 ease-out hover:bg-[#10664A] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15805D]"
            >
              <Lock className="size-4" aria-hidden="true" />
              <span>Step 2: Proceed to Voting Booth</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}

          <div className="flex justify-center pt-2">
            <Link
              href={`/student/elections/${encodeURIComponent(election.id)}`}
              className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to election details
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
