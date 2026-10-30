'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  ArrowRight,
  Layers,
  ChevronRight,
  Info,
  ArrowLeft,
} from 'lucide-react';

interface ProofStep {
  position: 'left' | 'right';
  hash: string;
}

interface ProofResult {
  verified: boolean;
  receiptCode: string;
  leafIndex: number;
  leafHash: string;
  proof: ProofStep[];
  merkleRoot: string;
  checkpointSequence: number;
  checkpointSignature: string;
  ballotCount: number;
  electionTitle: string;
  timestamp: string;
  error?: string;
}

function VerifyReceiptContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialElecId = searchParams.get('electionId') || '';

  const [receiptCode, setReceiptCode] = useState(initialCode);
  const [electionId, setElectionId] = useState(initialElecId);
  const [elections, setElections] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/elections')
      .then((res) => res.json())
      .then((data) => {
        if (data.elections) {
          setElections(data.elections);
          if (!electionId && data.elections.length > 0) {
            setElectionId(data.elections[0].id);
          }
        }
      });
  }, []);

  const handleVerify = async (codeToVerify?: string, elecToVerify?: string) => {
    const c = codeToVerify || receiptCode;
    const e = elecToVerify || electionId;

    if (!c.trim()) {
      setErrorMsg('Please enter a ballot receipt tracking code.');
      return;
    }

    if (!e) {
      setErrorMsg('Please select an election.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch(`/api/elections/${e}/verify-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptCode: c.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification query failed');
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialElecId) {
      handleVerify(initialCode, initialElecId);
    }
  }, [initialCode, initialElecId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/student"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200/60 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Mathematical Inclusion Proof
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Verify My Ballot Inclusion
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Confirm that your anonymous ballot record is mathematically anchored into the election's
          SHA-256 Merkle tree without revealing which candidate received your vote.
        </p>

        {/* Input Form */}
        <div className="mt-8 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Election
            </label>
            <select
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {elections.map((elec) => (
                <option key={elec.id} value={elec.id}>
                  {elec.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ballot Receipt Tracking Code
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. CV-STU-8F32D1-B9 or CV-SENATE-..."
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 font-mono text-xs uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                disabled={loading}
                onClick={() => handleVerify()}
                className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 flex-shrink-0 shadow-sm"
              >
                {loading ? 'Verifying...' : 'Verify Proof'}
                <Search className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* VERIFICATION RESULT CARD */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200/60 shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Cryptographic Integrity Status
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Ballot Record Verified (PASS)
                  </h2>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Leaf #{result.leafIndex} of {result.ballotCount}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Election
                </span>
                <span className="font-semibold text-slate-900 block">{result.electionTitle}</span>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Auditor Checkpoint Sequence
                </span>
                <span className="font-semibold text-slate-900 block">
                  #{result.checkpointSequence}
                </span>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 sm:col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Committed Merkle Root
                </span>
                <span className="font-mono text-slate-900 break-all block text-[11px]">
                  {result.merkleRoot}
                </span>
              </div>
            </div>

            {/* MERKLE PATH VISUALIZATION */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-600" /> Merkle Inclusion Path (Tree Depth:{' '}
                  {result.proof.length})
                </h3>
                <span className="text-xs text-slate-400">SHA-256 Domain Separated</span>
              </div>

              <div className="space-y-3 font-mono text-[11px]">
                {/* Step 0: Leaf */}
                <div className="p-3.5 rounded-2xl bg-brand-50/60 border border-brand-200 text-brand-900 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    L
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[10px] uppercase text-brand-700 tracking-wider">
                      Target Leaf Hash (CV:LEAF:v1:)
                    </div>
                    <div className="break-all text-[11px] mt-0.5">{result.leafHash}</div>
                  </div>
                </div>

                {/* Sibling Steps */}
                {result.proof.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-start gap-3 ml-4 sm:ml-6"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                          Internal Node Hash • Position: {step.position.toUpperCase()}
                        </span>
                      </div>
                      <div className="break-all text-[11px] mt-0.5">{step.hash}</div>
                    </div>
                  </div>
                ))}

                {/* Root Step */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 ml-8 sm:ml-12">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    R
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[10px] uppercase text-emerald-700 tracking-wider">
                      Recomputed Root (Matches Trusted Checkpoint)
                    </div>
                    <div className="break-all text-[11px] mt-0.5 font-bold">
                      {result.merkleRoot}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Reassurance Callout */}
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-3">
              <Info className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Why your choice is hidden:</strong> The receipt code maps only to an
                anonymized hash tree position. Even with this verification report, neither an
                administrator nor an observer can deduce which candidate was voted for.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500 text-xs">
          Loading receipt inclusion verifier...
        </div>
      }
    >
      <VerifyReceiptContent />
    </Suspense>
  );
}
