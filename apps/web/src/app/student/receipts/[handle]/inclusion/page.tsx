"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Fingerprint,
  Layers,
  Play,
  XCircle,
} from "lucide-react";
import { castingClient } from "@/lib/casting_client";
import {
  evaluateInclusionProof,
  type InclusionProofStep,
} from "@/lib/crypto/merkle";
import type { ReceiptStatusResponse } from "@/lib/types";
import { ReceiptStatusBadge } from "../../../../components/ReceiptStatusBadge";

function decodeHandle(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isInclusionEvidence(
  receipt: ReceiptStatusResponse | null,
): receipt is ReceiptStatusResponse & {
  tree_size: number;
  leaf_hash: string;
  merkle_root: string;
  merkle_proof: string[];
} {
  return Boolean(
    receipt &&
      receipt.status !== "REJECTED" &&
      typeof receipt.tree_size === "number" &&
      Number.isSafeInteger(receipt.tree_size) &&
      receipt.tree_size > 0 &&
      typeof receipt.leaf_hash === "string" &&
      typeof receipt.merkle_root === "string" &&
      Array.isArray(receipt.merkle_proof),
  );
}

export default function VerifyInclusionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawHandle = typeof params?.handle === "string" ? params.handle : "";
  const handle = rawHandle ? decodeHandle(rawHandle) : "";
  const electionId = searchParams?.get("election_id") || "";

  const [receipt, setReceipt] = useState<ReceiptStatusResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(handle && electionId));
  const [error, setError] = useState<string | null>(null);
  const [leafHex, setLeafHex] = useState("");
  const [isTampered, setIsTampered] = useState(false);
  const [computing, setComputing] = useState(false);
  const [computedRoot, setComputedRoot] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<"IDLE" | "PASSED" | "FAILED">("IDLE");
  const [computedSteps, setComputedSteps] = useState<InclusionProofStep[]>([]);

  useEffect(() => {
    if (!handle || !electionId) {
      setLoading(false);
      setReceipt(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setReceipt(null);
    setError(null);
    setComputedRoot(null);
    setComputedSteps([]);
    setVerificationResult("IDLE");
    setIsTampered(false);

    void castingClient
      .getReceiptStatus(electionId, handle)
      .then((nextReceipt) => {
        if (cancelled) return;
        setReceipt(nextReceipt);
        setLeafHex(nextReceipt.leaf_hash || "");
      })
      .catch((cause) => {
        if (cancelled) return;
        setReceipt(null);
        setLeafHex("");
        setError(cause instanceof Error ? cause.message : "Receipt evidence could not be retrieved.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [electionId, handle]);

  const evidence = useMemo(
    () => (isInclusionEvidence(receipt) ? receipt : null),
    [receipt],
  );

  const handleComputeProof = async () => {
    if (!evidence) return;
    setComputing(true);
    setVerificationResult("IDLE");

    try {
      const evaluation = await evaluateInclusionProof({
        leafIndex: evidence.leaf_index,
        treeSize: evidence.tree_size,
        leafHashHex: leafHex,
        proofHex: evidence.merkle_proof,
        expectedRootHex: evidence.merkle_root,
      });
      setComputedSteps(evaluation.steps);
      setComputedRoot(evaluation.computedRootHex);
      setVerificationResult(evaluation.valid ? "PASSED" : "FAILED");
    } catch {
      setComputedSteps([]);
      setComputedRoot(null);
      setVerificationResult("FAILED");
    } finally {
      setComputing(false);
    }
  };

  const toggleTamper = () => {
    if (!evidence || !leafHex) return;
    setIsTampered((current) => !current);
    setLeafHex((current) => {
      if (!current) return current;
      const replacement = current.at(-1)?.toLowerCase() === "0" ? "1" : "0";
      return current.slice(0, -1) + replacement;
    });
    setComputedRoot(null);
    setComputedSteps([]);
    setVerificationResult("IDLE");
  };

  const receiptLink = `/student/receipts/${encodeURIComponent(handle)}${electionId ? `?election_id=${encodeURIComponent(electionId)}` : ""}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex min-w-0 flex-col gap-5 border-b border-slate-200 pb-6 dark:border-[#1E3352] sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href={receiptLink}
            className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#157E92] hover:bg-[#157E92]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to receipt
          </Link>
          <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded bg-[#157E92]/10 px-2.5 py-1 text-xs font-semibold text-[#0E6273] dark:text-[#7DD3FC]">
            <Layers className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Service-returned receipt evidence</span>
          </div>
          <h1 className="text-balance text-2xl font-bold tracking-tight text-[#10233F] dark:text-white sm:text-3xl">
            Merkle Inclusion Path Checker
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            This page computes whether the path returned by the casting service matches its supplied root. A match does not authenticate the root, verify a witness signature, or prove blockchain finality.
          </p>
        </div>
        <ReceiptStatusBadge status={receipt?.status ?? "UNKNOWN"} size="md" />
      </header>

      {loading && (
        <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm text-[#6B4707] dark:text-[#FCD34D]" role="status">
          Loading inclusion fields from the configured casting service…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-5 text-sm leading-relaxed text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {error} No inclusion claim can be made from this response.
        </div>
      )}

      {!loading && !error && (!handle || !electionId) && (
        <div className="rounded-xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-5 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
          This verifier needs both an opaque receipt handle and its election context. Return to the receipt page generated by the original submission.
        </div>
      )}

      {!loading && !error && receipt && !evidence && (
        <div className="rounded-xl border border-[#AA6C0B]/35 bg-[#AA6C0B]/10 p-5 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]" role="status">
          The casting service returned status <strong>{receipt.status}</strong>, but did not return a complete leaf hash, tree size, witness root, and audit path. Inclusion cannot be verified from this response.
        </div>
      )}

      {evidence && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] sm:p-8" aria-labelledby="proof-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="proof-heading" className="text-lg font-bold text-[#10233F] dark:text-white">
                  RFC 9162 audit path
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  The service supplied the tree size, leaf digest, root, and sibling digests. Only those values are evaluated here; their source and signatures are not authenticated by this page.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={toggleTamper}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${
                    isTampered
                      ? "border-[#C23C45] bg-[#C23C45]/10 text-[#C23C45]"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-[#1E3352] dark:bg-[#132135] dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  {isTampered ? "Reset tamper drill" : "Simulate tamper drill"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleComputeProof()}
                  disabled={computing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#157E92] px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Play className={`size-4 ${computing ? "animate-spin" : ""}`} aria-hidden="true" />
                  {computing ? "Evaluating path…" : "Verify Merkle path"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#1E3352] dark:bg-slate-900/30 sm:col-span-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#10233F] dark:text-white">
                  <Fingerprint className="size-3.5 text-[#157E92]" aria-hidden="true" />
                  Leaf digest at index {evidence.leaf_index}
                </div>
                <code className="mt-2 block break-all text-xs text-slate-700 dark:text-slate-300">{leafHex}</code>
                {isTampered && <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#C23C45]">Local tamper drill changed one leaf bit</p>}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#1E3352] dark:bg-slate-900/30">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Service-reported tree size</p>
                <p className="mt-2 font-mono text-lg font-bold text-[#10233F] dark:text-white">{evidence.tree_size}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#1E3352] dark:bg-slate-900/30">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Service-reported root</p>
                <code className="mt-2 block break-all text-[11px] text-[#10233F] dark:text-white">{evidence.merkle_root}</code>
              </div>
            </div>
          </section>

          {computedSteps.length > 0 && (
            <section className="space-y-4" aria-label="Computed Merkle path">
              {computedSteps.map((step, index) => (
                <div key={`${step.siblingHex}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#1E3352] dark:bg-[#132135]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-sm font-bold text-[#10233F] dark:text-white">Path step {index + 1}</h3>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sibling on {step.direction}</span>
                  </div>
                  <p className="mt-2 break-all font-mono text-[11px] text-slate-600 dark:text-slate-400">Sibling {step.siblingHex}</p>
                  <p className="mt-2 break-all border-t border-slate-100 pt-2 font-mono text-[11px] font-bold text-[#10233F] dark:border-[#1E3352] dark:text-white">Parent {step.computedParentHex}</p>
                </div>
              ))}
            </section>
          )}

          {computedRoot && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-[#1E3352] dark:bg-slate-900/30" aria-live="polite">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Computed root</p>
              <code className={`mt-2 block break-all text-xs font-bold ${verificationResult === "PASSED" ? "text-[#15805D]" : "text-[#C23C45]"}`}>{computedRoot}</code>
            </section>
          )}

          {verificationResult === "PASSED" && (
            <div className="rounded-xl border border-[#15805D]/40 bg-[#15805D]/10 p-5 text-sm leading-relaxed text-[#146C4F] dark:text-[#6EE7B7]" role="status">
              <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5" aria-hidden="true" />Inclusion root match confirmed</div>
              <p className="mt-2">This confirms the supplied leaf is included in the supplied witnessed tree. It does not prove voter intent, ballot secrecy, tally correctness, or independent witness operation.</p>
            </div>
          )}

          {verificationResult === "FAILED" && (
            <div className="rounded-xl border border-[#C23C45]/40 bg-[#C23C45]/10 p-5 text-sm leading-relaxed text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
              <div className="flex items-center gap-2 font-bold"><XCircle className="size-5" aria-hidden="true" />Inclusion verification failed</div>
              <p className="mt-2">The supplied path does not reconstruct the supplied root. Treat the returned evidence as inconsistent and do not retry a ballot because of this result.</p>
            </div>
          )}
        </>
      )}

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        A Merkle inclusion result authenticates placement in the supplied evidence path only. It is not a claim of full election privacy, cast-as-intended verification, coercion resistance, or production independence.
      </p>
    </main>
  );
}
