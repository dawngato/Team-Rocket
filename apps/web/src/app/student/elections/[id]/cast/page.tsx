"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AccessibleDialog } from "@/components/AccessibleDialog";
import { StateBadge } from "@/components/StateBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { VotingStepper } from "@/components/VotingStepper";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";
import { Vote, ArrowRight, ShieldCheck, Lock, AlertCircle, KeyRound, AlertTriangle } from "lucide-react";
import {
  castingClient,
  getEngineHandoffStorageKey,
  parseEngineBallotHandoff,
  type EngineBallotHandoff,
} from "@/lib/casting_client";
import { getCredentialProofStorageKey } from "@/lib/identity_client";
import { getEnginePublicParameters } from "@/lib/engine_client";
import { createEncryptedBallot } from "@/lib/engine_crypto";

export default function CastBallotPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params?.id as string;

  const [election, setElection] = useState<Election | null>(null);
  const [isLoadingElection, setIsLoadingElection] = useState(true);
  const [electionError, setElectionError] = useState<string | null>(null);
  const [hasCredentialProof, setHasCredentialProof] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [engineHandoff, setEngineHandoff] = useState<EngineBallotHandoff | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    void electionClient.getElection(electionId)
      .then((nextElection) => {
        if (!cancelled) {
          setElection(nextElection);
          setElectionError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setElection(null);
          setElectionError("The authoritative election manifest could not be reached. Ballot creation is disabled.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingElection(false);
      });
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  useEffect(() => {
    if (!electionId) return;
    try {
      const proof = window.sessionStorage.getItem(getCredentialProofStorageKey(electionId));
      setHasCredentialProof(Boolean(proof));

      const raw = window.sessionStorage.getItem(getEngineHandoffStorageKey(electionId));
      if (!raw) return;
      const parsed = parseEngineBallotHandoff(JSON.parse(raw), electionId);
      if (parsed) {
        setEngineHandoff(parsed);
        setHandoffError(null);
      } else {
        setHandoffError("The engine handoff is invalid or belongs to another election.");
      }
    } catch {
      setHandoffError("The engine handoff could not be read. Select your candidate again.");
    }
  }, [electionId]);

  const handleConfirmVote = async () => {
    if (!election || !engineHandoff) {
      setHandoffError("An approved encrypted-ballot booth must complete the handoff before submission.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await castingClient.castBallot(engineHandoff);

      // Persist to session receipts (primary, isolated to browser session)
      try {
        const sessionReceipts = JSON.parse(window.sessionStorage.getItem("himvote_session_receipts") || "[]");
        sessionReceipts.unshift({
          electionId: election.id,
          title: election.title,
          handle: response.handle,
          timestamp: new Date().toISOString(),
        });
        window.sessionStorage.setItem("himvote_session_receipts", JSON.stringify(sessionReceipts.slice(0, 20)));

        // Also save to local storage as fallback
        const stored = JSON.parse(window.localStorage.getItem("himvote_receipts") || "[]");
        stored.unshift({
          electionId: election.id,
          title: election.title,
          handle: response.handle,
          timestamp: new Date().toISOString(),
        });
        window.localStorage.setItem("himvote_receipts", JSON.stringify(stored.slice(0, 20)));
      } catch {}

      setIsReviewOpen(false);
      router.push(`/student/elections/${election.id}/pending?handle=${encodeURIComponent(response.handle)}`);
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "The ballot could not be submitted.");
      setIsSubmitting(false);
    }
  };

  const prepareEncryptedBallot = async () => {
    if (!election || !selectedCandidateId) {
      setHandoffError("Select one candidate before creating the encrypted ballot.");
      return;
    }
    setIsPreparing(true);
    setHandoffError(null);
    try {
      const credentialProof = window.sessionStorage.getItem(getCredentialProofStorageKey(election.id));
      if (!credentialProof) {
        setHasCredentialProof(false);
        throw new Error("No verified credential proof is present in this browser session. Complete credential issuance first.");
      }
      const parameters = await getEnginePublicParameters();
      const encrypted = await createEncryptedBallot({
        electionId: election.id,
        manifestDigest: election.manifest_digest,
        candidates: (election.candidates || []).map((candidate) => candidate.id),
        selectedCandidateId,
        jointPublicKey: parameters.joint_public_key,
      });
      const nextHandoff: EngineBallotHandoff = {
        type: "himvote.engine.ballot.v1",
        election_id: election.id,
        credential_proof_b64url: credentialProof,
        engine_ballot_b64url: encrypted.engine_ballot_b64url,
        engine_proofs_b64url: encrypted.engine_proofs_b64url,
        idempotency_key: `cast_${crypto.randomUUID()}`,
      };
      window.sessionStorage.setItem(getEngineHandoffStorageKey(election.id), JSON.stringify(nextHandoff));
      setEngineHandoff(nextHandoff);
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "The encrypted ballot could not be created.");
    } finally {
      setIsPreparing(false);
    }
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Elections", href: "/student/elections" },
    { label: election?.title || `Election ${electionId.substring(0, 8)}`, href: `/student/elections/${encodeURIComponent(electionId)}` },
    { label: "Voting Booth" },
  ];

  if (isLoadingElection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600 dark:text-slate-300" role="status">
        <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-[#157E92] border-t-transparent" />
        Loading server-authoritative election manifest…
      </div>
    );
  }

  if (electionError || !election) {
    return (
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-12 sm:px-6">
        <Breadcrumbs items={breadcrumbs} />
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {electionError || "Election manifest was not returned by the election service."}
        </div>
      </main>
    );
  }

  if (election.state !== "OPEN") {
    return (
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-12 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
        <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
          This election is not accepting ballots. The authoritative election service reports state <strong>{election.state}</strong>.
        </div>
        <StateBadge state={election.state} showDescription />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      {/* Stepper */}
      <VotingStepper
        currentStep={2}
        electionId={election.id}
        hasCredential={hasCredentialProof}
        hasReceipt={Boolean(engineHandoff)}
      />

      <header className="space-y-2 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
          <Lock className="size-3.5" aria-hidden="true" />
          Encrypted Voting Booth
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          Cast Your Confidential Ballot
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
          {election.title} · Contest: {election.contest || "Seat"}
        </p>
      </header>

      {/* Warning if credential is missing */}
      {!hasCredentialProof && (
        <section
          className="rounded-2xl border border-[#AA6C0B]/40 bg-[#AA6C0B]/10 p-5 sm:p-6"
          role="alert"
          aria-labelledby="missing-credential-title"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <KeyRound className="size-5 text-[#AA6C0B] dark:text-[#FCD34D] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 id="missing-credential-title" className="text-sm font-bold text-[#6B4707] dark:text-[#FCD34D]">
                  Step 1 Required: Obtain Anonymous Credential First
                </h2>
                <p className="mt-1 text-xs text-[#6B4707] dark:text-[#FCD34D] leading-relaxed">
                  Your browser session does not have an active eligibility credential token. You must request a blinded signature from the registrar before encrypting your ballot.
                </p>
              </div>
            </div>
            <Link
              href={`/student/elections/${encodeURIComponent(election.id)}/credential`}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#AA6C0B] hover:bg-[#8B5606] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <span>Get Credential</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* Ballot Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white mb-1">
            Official Ballot Choice
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select one candidate. The browser will encrypt the choice and generate the zero-knowledge proof artifacts before anything reaches the casting gateway.
          </p>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Official ballot choices">
          {(election.candidates || []).map((candidate) => {
            const isSelected = selectedCandidateId === candidate.id;
            return (
              <label
                key={candidate.id}
                className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 sm:p-5 transition-all select-none ${
                  isSelected
                    ? "border-[#157E92] bg-[#157E92]/10 ring-2 ring-[#157E92]/30 dark:bg-[#157E92]/20"
                    : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 dark:border-[#1E3352] dark:bg-slate-900/40 dark:hover:bg-slate-800/50"
                }`}
              >
                <input
                  type="radio"
                  name="candidate"
                  value={candidate.id}
                  checked={isSelected}
                  onChange={() => {
                    setSelectedCandidateId(candidate.id);
                    setEngineHandoff(null);
                  }}
                  className="mt-1 size-4.5 accent-[#157E92]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="block text-sm sm:text-base text-[#10233F] dark:text-white font-bold">
                      {candidate.name}
                    </strong>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-[#157E92] dark:text-[#38BDF8]">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {candidate.statement || candidate.contest || "Contest candidate"}
                  </p>
                </div>
              </label>
            );
          })}

          {(!election.candidates || election.candidates.length < 2) && (
            <p className="text-xs text-[#C23C45]" role="alert">
              The authoritative election manifest does not contain at least two candidates.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] space-y-4">
          <div
            className={`rounded-xl border px-4 py-3 text-xs ${
              engineHandoff
                ? "border-[#15805D]/30 bg-[#15805D]/10 text-[#0F5B43] dark:text-[#86EFAC]"
                : "border-[#AA6C0B]/30 bg-[#AA6C0B]/10 text-[#6B4707] dark:text-[#FCD34D]"
            }`}
            role="status"
          >
            <div className="flex items-start gap-2.5">
              {engineHandoff ? (
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#15805D] dark:text-[#86EFAC]" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#AA6C0B] dark:text-[#FCD34D]" aria-hidden="true" />
              )}
              <span className="leading-relaxed">
                {engineHandoff
                  ? "Encrypted ballot ciphertext and zero-knowledge validity proofs are generated. The casting gateway will receive only blinded protocol artifacts."
                  : "No encrypted ballot is ready. Select a candidate and create the encrypted proof artifacts locally."}
              </span>
            </div>
          </div>

          {handoffError && (
            <p className="text-xs font-semibold text-[#C23C45]" role="alert">
              {handoffError}
            </p>
          )}

          {!engineHandoff && (
            <button
              type="button"
              disabled={!selectedCandidateId || isPreparing || !hasCredentialProof}
              onClick={prepareEncryptedBallot}
              className="w-full sm:w-auto min-h-12 px-6 py-2.5 rounded-xl font-bold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] shadow-sm transition-all duration-75 ease-out select-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
            >
              {isPreparing ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Encrypting ballot and generating proofs…</span>
                </>
              ) : (
                <>
                  <span>Encrypt & Prepare Ballot</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </button>
          )}

          {engineHandoff && (
            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="w-full sm:w-auto min-h-12 px-6 py-2.5 rounded-xl font-bold text-white bg-[#15805D] hover:bg-[#10664A] active:scale-[0.98] shadow-sm transition-all duration-75 ease-out select-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15805D]"
            >
              <span>Review and Cast Ballot</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {/* Accessible Review Confirmation Modal Dialog */}
      <AccessibleDialog
        isOpen={isReviewOpen}
        onClose={() => !isSubmitting && setIsReviewOpen(false)}
        title="Confirm Your Ballot Submission"
        description="Please review your choice carefully before handing off to the cryptographic casting gateway."
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-[#1E3352] space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-500 block">
              Chosen Candidate
            </span>
            <strong className="text-lg text-[#10233F] dark:text-white block font-bold">
              {election.candidates?.find((candidate) => candidate.id === selectedCandidateId)?.name || "Encrypted choice"}
            </strong>
            <span className="text-xs text-slate-600 dark:text-slate-400 block leading-relaxed">
              The browser encrypted your vote with the election joint key. Zero knowledge proofs verify validity without revealing your selection.
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#AA6C0B]/10 border border-[#AA6C0B]/30 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <AlertTriangle className="size-4 text-[#AA6C0B] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Once accepted by the casting engine, a spent nullifier commitment is recorded. You cannot modify or re-vote in this contest.
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsReviewOpen(false)}
              className="flex-1 min-h-11 px-4 py-2 rounded-xl border border-slate-300 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-sm font-semibold transition-all select-none"
            >
              Back to Ballot
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmVote}
              className="flex-1 min-h-11 px-4 py-2 rounded-xl bg-[#15805D] hover:bg-[#10664A] active:scale-[0.98] text-white text-sm font-bold shadow-sm transition-all select-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15805D]"
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Gateway…</span>
                </>
              ) : (
                <>
                  <Vote className="size-4" aria-hidden="true" />
                  <span>Confirm and Cast</span>
                </>
              )}
            </button>
          </div>
        </div>
      </AccessibleDialog>
    </main>
  );
}
