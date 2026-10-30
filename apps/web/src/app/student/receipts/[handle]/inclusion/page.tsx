"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "@/components/StateBadge";
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Play,
  RotateCcw,
  AlertTriangle,
  Fingerprint,
} from "lucide-react";
import { nodeHash, bytesToHex, hexToBytes } from "@/lib/crypto/merkle";

interface ProofStep {
  level: number;
  label: string;
  direction: "left" | "right";
  siblingHex: string;
  computedParentHex?: string;
}

export default function VerifyInclusionPage() {
  const params = useParams();
  const rawHandle = (params?.handle as string) || "HV_24F8_19C2";
  const handleFormatted = decodeURIComponent(rawHandle).replace(/_/g, " ");

  const originalLeafHex = "93699d59f6ae587b09cdfe501c4a67419f80d029f7d57a19e39253cb4f99a58b";
  const expectedRootHex = "deb3384abb0306e861b04a6e760e9fa992f25a5632507a91454a49538880a7e5";

  const [leafHex, setLeafHex] = useState(originalLeafHex);
  const [isTampered, setIsTampered] = useState(false);
  const [computing, setComputing] = useState(false);
  const [computedRoot, setComputedRoot] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<"IDLE" | "PASSED" | "FAILED">("IDLE");
  const [computedSteps, setComputedSteps] = useState<ProofStep[]>([
    {
      level: 0,
      label: "Level 0 Leaf and Sibling (Leaf Index 1)",
      direction: "left",
      siblingHex: "66b2b9b32587b831d704376d8df857e7b92d19e7c7b068f5e72021e4133cda88",
    },
    {
      level: 1,
      label: "Level 1 Subtree Root and Sibling",
      direction: "right",
      siblingHex: "adefd2260b0e81b8fe6708b9fc27b0cdd94c9eab64be84475541cf085c071737",
    },
  ]);

  const handleComputeProof = async () => {
    setComputing(true);
    setVerificationResult("IDLE");

    try {
      let currentBytes = hexToBytes(leafHex);
      const updatedSteps: ProofStep[] = [];

      for (const step of computedSteps) {
        const siblingBytes = hexToBytes(step.siblingHex);
        const parentBytes =
          step.direction === "left"
            ? await nodeHash(siblingBytes, currentBytes)
            : await nodeHash(currentBytes, siblingBytes);

        const parentHex = bytesToHex(parentBytes);
        updatedSteps.push({
          ...step,
          computedParentHex: parentHex,
        });
        currentBytes = parentBytes;
      }

      const finalRoot = bytesToHex(currentBytes);
      setComputedSteps(updatedSteps);
      setComputedRoot(finalRoot);

      if (finalRoot.toLowerCase() === expectedRootHex.toLowerCase()) {
        setVerificationResult("PASSED");
      } else {
        setVerificationResult("FAILED");
      }
    } catch {
      setVerificationResult("FAILED");
    } finally {
      setComputing(false);
    }
  };

  const toggleTamper = () => {
    if (!isTampered) {
      setLeafHex("93699d59f6ae587b09cdfe501c4a67419f80d029f7d57a19e39253cb4f99a5ff");
      setIsTampered(true);
    } else {
      setLeafHex(originalLeafHex);
      setIsTampered(false);
    }
    setVerificationResult("IDLE");
    setComputedRoot(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            RFC 9162 Merkle Audit Path
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Cryptographic Inclusion Verifier
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Receipt: <span className="font-mono font-semibold">{handleFormatted}</span> | Tree Size: 4 Leaves
          </p>
        </div>
        <StateBadge state="WITNESSED" size="md" />
      </div>

      {/* Verifier Control Box */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
              Merkle Branch Evaluation
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Computes SHA-256 intermediate branch hashes using your leaf and verified sibling digests.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTamper}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg font-semibold text-xs border transition-colors flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${
                isTampered
                  ? "border-[#C23C45] bg-[#C23C45]/10 text-[#C23C45]"
                  : "border-slate-300 dark:border-[#1E3352] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isTampered ? "Reset Tamper Drill" : "Simulate Tamper Drill"}</span>
            </button>

            <button
              type="button"
              onClick={handleComputeProof}
              disabled={computing}
              className="min-h-[44px] px-5 py-2 rounded-lg font-bold text-white bg-[#157E92] hover:bg-[#0E6273] transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <Play className={`w-4 h-4 ${computing ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>{computing ? "Evaluating Node Hashes..." : "Verify Merkle Path"}</span>
            </button>
          </div>
        </div>

        {/* Leaf Node Display */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#10233F] dark:text-white flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
              <span>Voter Leaf Hash (Index 1)</span>
            </span>
            {isTampered && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C23C45]/10 text-[#C23C45]">
                TAMPERED BYTE INJECTED
              </span>
            )}
          </div>
          <code className="text-xs font-mono break-all block text-slate-700 dark:text-slate-300">
            {leafHex}
          </code>
        </div>

        {/* Step Cards */}
        <div className="space-y-4 pt-2">
          {computedSteps.map((step) => (
            <div
              key={step.level}
              className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/50 dark:bg-slate-900/30 space-y-3 text-xs font-mono"
            >
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {step.label}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Sibling Position: {step.direction.toUpperCase()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Sibling Hash:</span>
                <span className="text-slate-600 dark:text-slate-400 break-all text-[11px] block">
                  {step.siblingHex}
                </span>
              </div>

              {step.computedParentHex && (
                <div className="pt-2 border-t border-slate-200 dark:border-[#1E3352]">
                  <span className="text-[#15805D] block text-[10px] font-sans font-bold">
                    Computed SHA-256 Parent:
                  </span>
                  <span className="text-[#10233F] dark:text-white break-all text-[11px] block font-bold">
                    {step.computedParentHex}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Target Root and Computed Root Comparison */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-100 dark:bg-slate-900/50 space-y-3 text-xs font-mono">
          <div>
            <span className="text-slate-500 font-sans block font-semibold text-xs uppercase tracking-wider">
              Witnessed Checkpoint Root
            </span>
            <span className="text-[#10233F] dark:text-white font-bold break-all text-xs block mt-0.5">
              {expectedRootHex}
            </span>
          </div>

          {computedRoot && (
            <div className="pt-2 border-t border-slate-200 dark:border-[#1E3352]">
              <span className="text-slate-500 font-sans block font-semibold text-xs uppercase tracking-wider">
                Evaluated Root Digest
              </span>
              <span
                className={`font-bold break-all text-xs block mt-0.5 ${
                  verificationResult === "PASSED"
                    ? "text-[#15805D]"
                    : "text-[#C23C45]"
                }`}
              >
                {computedRoot}
              </span>
            </div>
          )}
        </div>

        {/* Status Announcement Region */}
        <div aria-live="polite">
          {verificationResult === "PASSED" && (
            <div className="p-5 rounded-xl bg-[#15805D]/10 border border-[#15805D]/40 space-y-2">
              <div className="flex items-center gap-2 text-[#15805D] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>Cryptographic Inclusion Confirmed (Zero Discrepancy)</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                The RFC 9162 Merkle path evaluates exactly to the published witness checkpoint digest. Your ballot leaf is certified and immutable.
              </p>
            </div>
          )}

          {verificationResult === "FAILED" && (
            <div className="p-5 rounded-xl bg-[#C23C45]/10 border border-[#C23C45]/40 space-y-2">
              <div className="flex items-center gap-2 text-[#C23C45] font-bold text-sm">
                <XCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>Inclusion Verification Failed (Root Mismatch)</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                The evaluated hash diverges from the witnessed root. Any modification to a leaf or sibling invalidates the entire Merkle branch.
              </p>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-[#1E3352]">
          <Link
            href={`/student/receipts/${encodeURIComponent(rawHandle)}`}
            className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
          >
            <span>Back to Receipt Timeline</span>
          </Link>
          <Link
            href="/audit"
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#10233F] dark:hover:text-white flex items-center gap-1"
          >
            <span>Public Audit Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
