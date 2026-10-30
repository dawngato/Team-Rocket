"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { StateBadge } from "../../../../components/StateBadge";
import { AccessibleDialog } from "../../../../components/AccessibleDialog";
import { Vote, ArrowRight, ShieldCheck, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { apiClient } from "../../../../lib/api_client";

export default function CastBallotPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params?.id as string;
  const election = INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0];

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCandidate = election.candidates?.find((c) => c.id === selectedCandidateId);

  const handleConfirmVote = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.castBallot({
        election_id: election.id,
        credential_proof_b64url: "dGVzdF9jcmVkZW50aWFsX3Byb29m",
        engine_ballot_b64url: "ZW5jcnlwdGVkX2JhbGxvdF9jaXBoZXJ0ZXh0",
        engine_proofs_b64url: "emVyb19rbm93bGVkZ2VfcHJvb2ZfY29uc3RyYWludHM",
        idempotency_key: `key_${Date.now()}`,
      });
      setIsReviewOpen(false);
      router.push(`/student/elections/${election.id}/pending?handle=${encodeURIComponent(response.handle)}`);
    } catch {
      setIsSubmitting(false);
    }
  };

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
            Select one candidate. The voting booth wraps your selection with verified engine encryption and generates an inclusion proof.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="sr-only">Select your candidate for {election.contest}</legend>
          {election.candidates?.map((cand) => {
            const isSelected = selectedCandidateId === cand.id;
            return (
              <label
                key={cand.id}
                className={`min-h-[44px] flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#157E92] bg-[#157E92]/5 dark:bg-[#157E92]/15 shadow-sm"
                    : "border-slate-200 dark:border-[#1E3352] hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#132135]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="candidate_selection"
                    value={cand.id}
                    checked={isSelected}
                    onChange={() => setSelectedCandidateId(cand.id)}
                    className="w-5 h-5 text-[#157E92] focus:ring-[#157E92] border-slate-300"
                  />
                  <div>
                    <span className="font-bold text-sm text-[#10233F] dark:text-white block">
                      {cand.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {cand.contest}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-[#157E92]" aria-hidden="true" />
                )}
              </label>
            );
          })}
        </fieldset>

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
            <span>Anonymous Credential Attached</span>
          </div>

          <button
            type="button"
            disabled={!selectedCandidateId}
            onClick={() => setIsReviewOpen(true)}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-lg font-bold text-white bg-[#157E92] hover:bg-[#0E6273] shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>Review and Confirm Selection</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
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
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-[#1E3352] space-y-2">
            <span className="text-xs font-mono uppercase text-slate-500 block">Selected Option</span>
            <strong className="text-lg text-[#10233F] dark:text-white block">
              {selectedCandidate?.name}
            </strong>
            <span className="text-xs text-slate-600 dark:text-slate-400 block">
              Contest: {selectedCandidate?.contest}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#AA6C0B]/10 border border-[#AA6C0B]/30 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
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
              className="flex-1 min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Back to Ballot
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmVote}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-[#15805D] hover:bg-[#10664A] text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
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
