"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AccessibleDialog } from "@/components/AccessibleDialog";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";
import { Vote, ArrowRight, ShieldCheck, Lock, AlertCircle } from "lucide-react";
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
      .catch((err: unknown) => {
        if (!cancelled) {
          setElection(null);
          setElectionError(err instanceof Error ? err.message : "The authoritative election manifest could not be retrieved from the server.");
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
      setHandoffError("The engine handoff could not be read. Return to the supported booth and try again.");
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
      try {
        const receiptItem = { electionId: election.id, title: election.title, handle: response.handle, timestamp: new Date().toISOString() };
        // P1-30: Session-scoped storage clears on logout to protect shared devices
        const sessionStored = JSON.parse(window.sessionStorage.getItem("himvote_session_receipts") || "[]");
        sessionStored.unshift(receiptItem);
        window.sessionStorage.setItem("himvote_session_receipts", JSON.stringify(sessionStored.slice(0, 20)));

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
      if (!credentialProof) throw new Error("No verified credential proof is present in this browser session. Complete credential issuance first.");
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

  if (isLoadingElection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600 dark:text-slate-300" role="status">
        Loading the server-authoritative election manifest…
      </div>
    );
  }

  if (electionError || !election) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {electionError || "Election manifest was not returned by the election service."}
        </div>
      </div>
    );
  }

  if (election.state !== "OPEN") {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
          This election is not accepting ballots. The authoritative election service reports state <strong>{election.state}</strong>.
        </div>
        <StateBadge state={election.state} showDescription />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          Encrypted Voting Booth
        </div>
        <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
          Cast Your Confidential Ballot
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {election.title} | Contest: {election.contest}
        </p>
      </div>

      {/* Ballot Card */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white mb-1">
            Official Ballot Choice
          </h2>
          <p className="text-xs text-slate-500">
            Select one candidate. The browser will encrypt the choice and generate the proof artifacts before anything reaches the casting service.
          </p>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Official ballot choices">
          {(election.candidates || []).map((candidate) => (
            <label key={candidate.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${selectedCandidateId === candidate.id ? "border-[#157E92] bg-[#157E92]/10" : "border-slate-200 bg-slate-50 dark:border-[#1E3352] dark:bg-slate-900/40"}`}>
              <input type="radio" name="candidate" value={candidate.id} checked={selectedCandidateId === candidate.id} onChange={() => { setSelectedCandidateId(candidate.id); setEngineHandoff(null); }} className="mt-1 size-4 accent-[#157E92]" />
              <span><strong className="block text-sm text-[#10233F] dark:text-white">{candidate.name}</strong><span className="mt-1 block text-xs text-slate-500">{candidate.statement || candidate.contest}</span></span>
            </label>
          ))}
          {(!election.candidates || election.candidates.length < 2) && <p className="text-xs text-[#C23C45]" role="alert">The authoritative election manifest does not contain at least two candidates.</p>}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] space-y-4">
          <div
            className={`rounded-lg border px-3.5 py-3 text-xs ${
              engineHandoff
                ? "border-[#15805D]/30 bg-[#15805D]/10 text-[#0F5B43] dark:text-[#86EFAC]"
                : "border-[#AA6C0B]/30 bg-[#AA6C0B]/10 text-[#6B4707] dark:text-[#FCD34D]"
            }`}
            role="status"
          >
            <div className="flex items-start gap-2">
              {engineHandoff ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>
                {engineHandoff
                  ? "Encrypted ballot and proofs are ready. The casting origin will receive only protocol artifacts."
                  : "No encrypted ballot is ready. Create one locally from the selected authoritative candidate."}
              </span>
            </div>
          </div>

          {handoffError && (
            <p className="text-xs font-medium text-[#C23C45]" role="alert">
              {handoffError}
            </p>
          )}

          {!engineHandoff && <button
            type="button"
            disabled={!selectedCandidateId || isPreparing}
            onClick={prepareEncryptedBallot}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] shadow-sm transition-all duration-75 ease-out select-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#132135]"
          >
            <span>{isPreparing ? "Encrypting ballot and proving selection…" : "Encrypt and prepare ballot"}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>}
          {engineHandoff && <button type="button" onClick={() => setIsReviewOpen(true)} className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-white bg-[#157E92] hover:bg-[#0E6273] shadow-sm transition-colors flex items-center justify-center gap-2"><span>Review and Confirm Selection</span><ArrowRight className="w-4 h-4" aria-hidden="true" /></button>}
        </div>
      </div>

      {/* Accessible Review Confirmation Modal Dialog */}
      <AccessibleDialog
        isOpen={isReviewOpen}
        onClose={() => !isSubmitting && setIsReviewOpen(false)}
        title="Confirm Your Vote Submission"
        description="Please review your choice carefully before handing off to the cryptographic booth."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-[#1E3352] space-y-2">
            <span className="text-xs font-mono uppercase text-slate-500 block">Engine handoff</span>
            <strong className="text-lg text-[#10233F] dark:text-white block">{election.candidates?.find((candidate) => candidate.id === selectedCandidateId)?.name || "Encrypted ballot ready"}</strong>
            <span className="text-xs text-slate-600 dark:text-slate-400 block">The browser generated the election-bound ciphertext and zero knowledge proof artifacts.</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#AA6C0B]/10 border border-[#AA6C0B]/30 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <AlertCircle className="w-4 h-4 text-[#AA6C0B] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Once accepted by the casting engine, a spent nullifier commitment is recorded. You cannot modify or re vote in this contest.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsReviewOpen(false)}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-sm font-semibold transition-all duration-75 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#132135]"
            >
              Back to Ballot
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmVote}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#15805D] hover:bg-[#10664A] active:scale-[0.98] text-white text-sm font-bold shadow-sm transition-all duration-75 ease-out select-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15805D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#132135]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Committing Ballot...</span>
                </>
              ) : (
                <>
                  <Vote className="w-4 h-4" aria-hidden="true" />
                  <span>Confirm and Cast</span>
                </>
              )}
            </button>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
}
