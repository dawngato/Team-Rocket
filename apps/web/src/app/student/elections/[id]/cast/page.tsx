"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileCheck2,
  Fingerprint,
  Hash,
  Info,
  KeyRound,
  Lock,
  LockKeyhole,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  Vote,
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";
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
  const [submitPhase, setSubmitPhase] = useState<"review" | "encrypting" | "committing" | "finalized">("review");
  const [engineHandoff, setEngineHandoff] = useState<EngineBallotHandoff | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    void electionClient
      .getElection(electionId)
      .then((nextElection) => {
        if (!cancelled) {
          setElection(nextElection);
          setElectionError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setElection(null);
          setElectionError("The election manifest could not be loaded. Ballot casting is unavailable until the election service responds.");
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
      setHandoffError(
        "The engine handoff could not be read. Return to the supported booth and try again.",
      );
    }
  }, [electionId]);

  // Trap focus and handle escape for the confirmation dialog
  useEffect(() => {
    if (!isReviewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        setIsReviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReviewOpen, isSubmitting]);

  const handleConfirmVote = async () => {
    if (!election || !engineHandoff) {
      setHandoffError(
        "An approved encrypted-ballot booth must complete the handoff before submission.",
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitPhase("encrypting");

    try {
      // Small intentional pause for the confidential encryption visual transition
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitPhase("committing");

      const response = await castingClient.castBallot(engineHandoff);

      // Record in local and session storage
      try {
        const sessionRecord = {
          electionId: election.id,
          title: election.title,
          handle: response.handle,
          timestamp: new Date().toISOString(),
        };
        const stored = JSON.parse(window.localStorage.getItem("himvote_receipts") || "[]");
        stored.unshift(sessionRecord);
        window.localStorage.setItem("himvote_receipts", JSON.stringify(stored.slice(0, 20)));

        const sessionStored = JSON.parse(
          window.sessionStorage.getItem("himvote_session_receipts") || "[]",
        );
        sessionStored.unshift(sessionRecord);
        window.sessionStorage.setItem(
          "himvote_session_receipts",
          JSON.stringify(sessionStored.slice(0, 20)),
        );
      } catch {}

      setSubmitPhase("finalized");
      await new Promise((resolve) => setTimeout(resolve, 400));
      setIsReviewOpen(false);
      router.push(
        `/student/elections/${election.id}/pending?handle=${encodeURIComponent(response.handle)}`,
      );
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "The ballot could not be submitted.");
      setIsSubmitting(false);
      setSubmitPhase("review");
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
      const credentialProof = window.sessionStorage.getItem(
        getCredentialProofStorageKey(election.id),
      );
      if (!credentialProof) {
        throw new Error(
          "No verified credential proof is present in this browser session. Please obtain your blind credential before casting.",
        );
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
      window.sessionStorage.setItem(
        getEngineHandoffStorageKey(election.id),
        JSON.stringify(nextHandoff),
      );
      setEngineHandoff(nextHandoff);
    } catch (error) {
      setHandoffError(
        error instanceof Error ? error.message : "The encrypted ballot could not be created.",
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/student" },
    { label: "Elections", href: "/student/elections" },
    {
      label: election?.title || "Contest",
      href: election ? `/student/elections/${encodeURIComponent(election.id)}` : undefined,
    },
    { label: "Cast Encrypted Ballot" },
  ];

  if (isLoadingElection) {
    return (
      <div className="mx-auto max-w-[1850px] px-4 py-16 text-center text-sm text-slate-600 dark:text-slate-300">
        <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-3 border-[#157E92] border-t-transparent" />
        <span>Loading authoritative election manifest and encryption parameters…</span>
      </div>
    );
  }

  if (electionError || !election) {
    return (
      <div className="mx-auto max-w-[1850px] px-4 py-12">
        <div
          className="rounded-2xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-6 text-sm text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {electionError || "Election manifest was not returned by the election service."}
        </div>
      </div>
    );
  }

  if (election.state !== "OPEN") {
    return (
      <main className="mx-auto max-w-[1850px] space-y-6 px-4 py-12 sm:px-6 lg:px-10">
        <Breadcrumbs items={breadcrumbs} />
        <div
          className="rounded-2xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-6 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]"
          role="status"
        >
          This election is not currently accepting ballots. The authoritative election service reports state:{" "}
          <strong>{election.state}</strong>.
        </div>
        <StateBadge state={election.state} showDescription />
      </main>
    );
  }

  const selectedCandidate = election.candidates?.find((c) => c.id === selectedCandidateId);

  // Workflow steps
  const currentStep = !selectedCandidateId ? 1 : !engineHandoff ? 2 : 3;

  return (
    <main className="mx-auto flex w-full max-w-[1850px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <Breadcrumbs items={breadcrumbs} />

      {/* Header Banner */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-7 dark:border-[#1E3352] xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#157E92]/10 px-3 py-1 text-xs font-semibold text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
            <Lock className="size-3.5" aria-hidden="true" />
            <span>Election Booth · Configured Service</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white sm:text-4xl">
            Prepare and Submit a Ballot
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {election.title} · <span className="font-semibold text-slate-800 dark:text-slate-200">Contest:</span>{" "}
            {election.contest}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Privacy Properties Not Verified Here</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-600 shadow-xs dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300">
            <Cpu className="size-4 text-[#157E92]" />
            <span>Local Ballot Encryption</span>
          </div>
        </div>
      </header>

      {/* Animated Step Progress Indicator */}
      <nav aria-label="Voting Workflow Steps" className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
              currentStep >= 1
                ? "border-[#157E92] bg-[#157E92]/5 text-[#10233F] dark:bg-[#157E92]/10 dark:text-white"
                : "border-slate-200 bg-white text-slate-400 dark:border-[#1E3352] dark:bg-[#132135]"
            }`}
          >
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                currentStep > 1
                  ? "bg-emerald-600 text-white"
                  : currentStep === 1
                  ? "bg-[#157E92] text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800"
              }`}
            >
              {currentStep > 1 ? <CheckCircle2 className="size-4" /> : "1"}
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step 1
              </span>
              <strong className="text-xs font-bold">Select Candidate</strong>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
              currentStep >= 2
                ? "border-[#157E92] bg-[#157E92]/5 text-[#10233F] dark:bg-[#157E92]/10 dark:text-white"
                : "border-slate-200 bg-white text-slate-400 dark:border-[#1E3352] dark:bg-[#132135]"
            }`}
          >
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                currentStep > 2
                  ? "bg-emerald-600 text-white"
                  : currentStep === 2
                  ? "bg-[#157E92] text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800"
              }`}
            >
              {currentStep > 2 ? <CheckCircle2 className="size-4" /> : "2"}
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step 2
              </span>
              <strong className="text-xs font-bold">Seal Encrypted Ballot</strong>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
              currentStep >= 3
                ? "border-[#157E92] bg-[#157E92]/5 text-[#10233F] dark:bg-[#157E92]/10 dark:text-white"
                : "border-slate-200 bg-white text-slate-400 dark:border-[#1E3352] dark:bg-[#132135]"
            }`}
          >
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                currentStep === 3
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800"
              }`}
            >
              3
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step 3
              </span>
              <strong className="text-xs font-bold">Review &amp; Cast</strong>
            </div>
          </div>
        </div>
      </nav>

      {/* Stretched Widescreen Grid: Booth Left + Cryptographic Security Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Ballot Card (8 Cols on Widescreen) */}
        <section
          className="lg:col-span-8 flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-[#1E3352] dark:bg-[#132135]"
          aria-labelledby="ballot-choices-heading"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2
                id="ballot-choices-heading"
                className="text-xl font-bold tracking-tight text-[#10233F] dark:text-white"
              >
                Official Ballot Choices
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Rule: {election.selection_rule}. Your selection is encrypted directly on your device before dispatch.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {election.candidates?.length || 0} Candidates Listed
            </span>
          </div>

          {/* Interactive Digital Ballot Selection Cards */}
          <div
            className="grid grid-cols-1 gap-3.5"
            role="radiogroup"
            aria-label="Official ballot candidate choices"
          >
            {(election.candidates || []).map((candidate) => {
              const isSelected = selectedCandidateId === candidate.id;
              return (
                <motion.label
                  key={candidate.id}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`group relative flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-all select-none ${
                    isSelected
                      ? "border-[#157E92] bg-[#157E92]/[0.06] shadow-sm dark:border-[#38BDF8] dark:bg-[#157E92]/15 ring-2 ring-[#157E92]/20"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/70 dark:border-[#1E3352] dark:bg-slate-900/40 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="candidate"
                      value={candidate.id}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedCandidateId(candidate.id);
                        setEngineHandoff(null);
                        setHandoffError(null);
                      }}
                      className="sr-only"
                    />
                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? "border-[#157E92] bg-[#157E92] text-white dark:border-[#38BDF8] dark:bg-[#38BDF8]"
                          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="size-2 rounded-full bg-white dark:bg-slate-950"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-base font-bold text-[#10233F] dark:text-white">
                        {candidate.name}
                      </strong>
                      <span className="font-mono text-[11px] text-slate-400">
                        {candidate.id}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {candidate.statement || candidate.contest || "Authorized ballot candidate."}
                    </p>
                  </div>
                </motion.label>
              );
            })}

            {(!election.candidates || election.candidates.length < 2) && (
              <p className="text-xs text-[#C23C45]" role="alert">
                The authoritative election manifest does not contain at least two candidates.
              </p>
            )}
          </div>

          {/* Sealing & Action Zone */}
          <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div
              className={`rounded-xl border p-4 text-xs transition-all ${
                engineHandoff
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              }`}
              role="status"
            >
              <div className="flex items-start gap-3">
                {engineHandoff ? (
                  <ShieldCheck className="size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                )}
                <div>
                  <strong className="block font-bold">
                    {engineHandoff
                      ? "Encrypted Ballot Data Prepared"
                      : "Ballot Data Not Prepared"}
                  </strong>
                  <p className="mt-0.5 leading-relaxed text-xs opacity-90">
                    {engineHandoff
                      ? "The browser prepared ballot ciphertext and proof data using parameters returned by the configured engine. This page does not independently verify the protocol or deployment privacy properties."
                      : selectedCandidateId
                      ? "Prepare ballot ciphertext and proof data in this browser using the configured engine parameters."
                      : "Please select a candidate choice above to proceed."}
                  </p>
                </div>
              </div>
            </div>

            {handoffError && (
              <div
                className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-3.5 text-xs font-semibold text-[#8B2630] dark:text-[#FCA5A5]"
                role="alert"
              >
                {handoffError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!engineHandoff ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  disabled={!selectedCandidateId || isPreparing}
                  onClick={prepareEncryptedBallot}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#157E92] px-6 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#0E6273] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
                >
                  {isPreparing ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Encrypting Ballot &amp; Generating ZK Proofs…</span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      <span>Seal Encrypted Ballot</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </motion.button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setIsReviewOpen(true)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Vote className="size-4" />
                    <span>Review &amp; Cast Confidential Ballot</span>
                    <ArrowRight className="size-4" />
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => {
                      setEngineHandoff(null);
                      setSelectedCandidateId(null);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Reset Choice</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Aside: Cryptographic Security & Booth Invariants (4 Cols on Widescreen) */}
        <aside className="lg:col-span-4 flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-[#1E3352] dark:bg-[#132135] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#157E92] dark:text-[#38BDF8]">
              <ShieldCheck className="size-4" />
                      <span>Protocol Status</span>
            </div>
            <h3 className="text-base font-bold text-[#10233F] dark:text-white">
              Privacy and Cryptography Limits
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              This browser uses the configured engine parameters to prepare ballot data. A successful preparation does not establish that identity and ballot records are unlinkable, that keys are independently controlled, or that a deployment follows the intended protocol.
            </p>
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500">
                <span>Session role:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Eligibility is service-determined</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Ballot Type:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Encrypted Ballot</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Receipt:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Returned by casting service</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 dark:border-[#1E3352] dark:bg-slate-900/40 space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Hash className="size-3.5 text-[#157E92]" />
              <span>Manifest Digest</span>
            </h4>
            <code className="block rounded-lg bg-white p-2.5 font-mono text-[11px] text-slate-600 break-all dark:bg-[#132135] dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              {election.manifest_digest || "Not provided"}
            </code>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Digest returned by the election service. This page does not recompute or authenticate it.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="size-4 text-amber-700 dark:text-amber-400" />
              <span>Single Submission Notice</span>
            </div>
            <p className="leading-relaxed opacity-90">
              Check the election details before submitting. The configured casting service may not allow a replacement after it accepts a ballot. Blockchain anchoring and finality depend on deployment configuration.
            </p>
          </div>
        </aside>
      </div>

      {/* Ballot Submission Confirmation Dialog with Animated Lock Sequence */}
      <AnimatePresence>
        {isReviewOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-dialog-title"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsReviewOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Modal Dialog Content */}
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-[#1E3352] dark:bg-[#132135]"
            >
              {/* Animated Lock Sequence & Encryption State */}
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="relative mb-3 flex size-16 items-center justify-center rounded-2xl bg-[#157E92]/10 text-[#157E92] dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]">
                  <motion.div
                    animate={
                      submitPhase === "encrypting"
                        ? { rotate: 360, scale: [1, 1.1, 1] }
                        : submitPhase === "committing"
                        ? { scale: [1, 1.2, 1] }
                        : {}
                    }
                    transition={{
                      repeat: submitPhase !== "review" ? Infinity : 0,
                      duration: 1.2,
                    }}
                  >
                    {isSubmitting ? (
                      <LockKeyhole className="size-8" />
                    ) : (
                      <Lock className="size-8" />
                    )}
                  </motion.div>
                  {isSubmitting && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.4, opacity: [0.2, 0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                      className="absolute inset-0 rounded-2xl bg-[#157E92]/20"
                    />
                  )}
                </div>

                <h3
                  id="confirmation-dialog-title"
                  className="text-xl font-extrabold text-[#10233F] dark:text-white"
                >
                  {submitPhase === "encrypting"
                    ? "Sealing Confidential Ciphertext…"
                    : submitPhase === "committing"
                    ? "Submitting to configured casting service…"
                    : "Confirm Encrypted Ballot Submission"}
                </h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {submitPhase === "encrypting"
                    ? "Executing non-interactive zero-knowledge proof generation and local blinding."
                    : submitPhase === "committing"
                    ? "Waiting for a response from the configured casting service."
                    : "Review your selection before submission. The service may not permit a replacement after acceptance."}
                </p>
              </div>

              {/* Candidate Selection Summary Box */}
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4.5 dark:border-[#1E3352] dark:bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Selected Candidate</span>
                  <span className="text-[#157E92] dark:text-[#38BDF8]">Selected</span>
                </div>
                <strong className="block text-lg font-extrabold text-[#10233F] dark:text-white">
                  {selectedCandidate?.name || "Candidate choice ready"}
                </strong>
                <p className="text-xs text-slate-500">
                  {selectedCandidate?.contest || election.title}
                </p>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Candidate Identifier:</span>
                  <code className="font-mono">{selectedCandidate?.id}</code>
                </div>
              </div>

              {/* Protocol Secrecy Invariant Notice */}
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Data-flow note:</strong> The casting request includes election and credential proof data alongside encrypted ballot data. This interface does not independently establish whether operational records can link those values to an identity.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsReviewOpen(false)}
                  className="flex-1 min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Back to Ballot
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmVote}
                  className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sealing &amp; Submitting…</span>
                    </>
                  ) : (
                    <>
                      <Vote className="size-4" />
                      <span>Confirm &amp; Cast Ballot</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
