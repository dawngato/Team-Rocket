'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Search,
  Check,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  department: string;
  academicYear: number;
  shortBio: string;
  manifesto: string;
  campaignPriorities: string;
  photoUrl?: string | null;
  ballotOrder: number;
}

interface ElectionData {
  id: string;
  title: string;
  description: string;
  department: string;
  status: string;
  startTime: string;
  endTime: string;
  candidates: Candidate[];
  userEligibility?: {
    isEligible: boolean;
    hasVoted: boolean;
    receiptCode?: string | null;
  } | null;
}

export default function VoteBoothPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [election, setElection] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success state
  const [submissionResult, setSubmissionResult] = useState<{
    receiptCode: string;
    leafIndex: number;
    merkleRoot: string;
    timestamp: string;
  } | null>(null);

  const fetchElection = async () => {
    try {
      const res = await fetch(`/api/elections/${params.id}`);
      const data = await res.json();
      if (data.election) {
        setElection(data.election);
      } else {
        setErrorMsg('Election not found');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElection();
  }, [params.id]);

  const handleSubmitVote = async () => {
    if (!selectedCandidateId) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/elections/${params.id}/ballots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: selectedCandidateId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ballot');
      }

      setSubmissionResult(data);
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading confidential voting booth...
      </div>
    );
  }

  if (!election) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Election Unavailable</h1>
        <p className="text-xs text-slate-500 mt-1">{errorMsg || 'Could not load election details.'}</p>
        <Link href="/student" className="mt-4 inline-block text-xs font-semibold text-brand-600">
          Return to Student Dashboard
        </Link>
      </div>
    );
  }

  // If student has already voted
  if (election.userEligibility?.hasVoted && !submissionResult) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200/60">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Entitlement Consumed
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Ballot Already Accepted</h1>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            You have already cast a ballot in this election. Each student account is entitled to exactly
            one accepted vote to guarantee fair, tamper-evident elections.
          </p>

          {election.userEligibility.receiptCode && (
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-sm mx-auto text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Your Saved Receipt Tracking Code:
              </span>
              <span className="font-mono text-xs font-bold text-slate-900 block select-all">
                {election.userEligibility.receiptCode}
              </span>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/student"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Back to Dashboard
            </Link>
            {election.userEligibility.receiptCode && (
              <Link
                href={`/student/verify-receipt?code=${election.userEligibility.receiptCode}&electionId=${election.id}`}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" /> Verify Inclusion Proof
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SUCCESS CONFIRMATION SCREEN
  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-lg text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200/60 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Confirmed & Committed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Your Vote Has Been Recorded
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Thank you for participating. Your ballot has been mathematically incorporated into the
            election's cryptographic Merkle tree and verified by the independent auditor.
          </p>

          {/* Clean Receipt Box */}
          <div className="mt-8 p-6 bg-slate-50 border border-slate-200/90 rounded-3xl text-left shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Official Ballot Receipt
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Tree Leaf #{submissionResult.leafIndex}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Anonymous Receipt Tracking Code
                </span>
                <span className="font-mono text-base sm:text-lg font-bold text-brand-700 select-all tracking-wider block mt-0.5">
                  {submissionResult.receiptCode}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Committed Merkle Root
                </span>
                <span className="font-mono text-[11px] text-slate-700 break-all select-all block mt-0.5">
                  {submissionResult.merkleRoot}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span>
                Notice: To preserve ballot secrecy, this receipt contains only the mathematical inclusion
                proof and never reveals your chosen candidate.
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/elections/${election.id}/live`}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <BarChart3 className="w-4 h-4" />
              Watch Live Results & Charts
            </Link>
            <Link
              href={`/student/verify-receipt?code=${submissionResult.receiptCode}&electionId=${election.id}`}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify My Ballot Inclusion
            </Link>
            <Link
              href="/student"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedCandidate = election.candidates.find((c) => c.id === selectedCandidateId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/student"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Dashboard
      </Link>

      {/* Progress Step Indicator (Inspired by Reference Images 2 & 7) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-8 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span className="text-slate-900 font-bold flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-[10px]">
              1
            </span>
            Review Candidates
          </span>
          <span className="text-slate-900 font-bold flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]">
              2
            </span>
            Select
          </span>
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">
              3
            </span>
            Confirm
          </span>
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">
              4
            </span>
            Receipt
          </span>
        </div>
      </div>

      {/* Election Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">
          <Vote className="w-4 h-4" /> Official Confidential Voting Booth
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {election.title}
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {election.description}
        </p>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Department: <strong className="text-slate-800">{election.department}</strong></span>
          <span>Deadline: <strong className="text-slate-800">{new Date(election.endTime).toLocaleDateString()}</strong></span>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Candidate Selection List (Inspired by Reference Images 2, 5 & 7) */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          <span>Choose 1 Candidate</span>
          <span>{election.candidates.length} Registered</span>
        </div>

        {election.candidates.map((cand) => {
          const isSelected = selectedCandidateId === cand.id;
          let priorities: string[] = [];
          try {
            priorities = JSON.parse(cand.campaignPriorities);
          } catch (e) {
            priorities = [];
          }

          return (
            <div
              key={cand.id}
              onClick={() => setSelectedCandidateId(cand.id)}
              className={`cursor-pointer rounded-3xl p-6 border transition-all ${
                isSelected
                  ? 'bg-brand-50/40 border-brand-500 shadow-md ring-2 ring-brand-500/15'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Selection Radio Circle */}
                <div
                  className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>

                {cand.photoUrl ? (
                  <img
                    src={cand.photoUrl}
                    alt={cand.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 flex-shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0 border border-slate-200 text-lg">
                    {cand.name.charAt(0)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">{cand.name}</h3>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Ballot #{cand.ballotOrder}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-0.5 font-medium">
                    {cand.department} • Year {cand.academicYear}
                  </div>

                  <p className="text-xs text-slate-600 mt-2 font-medium italic">
                    "{cand.shortBio}"
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {cand.manifesto}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Bar (Clean White) */}
      <div className="sticky bottom-6 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 shadow-xl flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
            Selected Choice:
          </span>
          <span className="text-sm font-bold text-slate-900">
            {selectedCandidate ? selectedCandidate.name : 'No candidate selected'}
          </span>
        </div>

        <button
          disabled={!selectedCandidateId}
          onClick={() => setIsConfirmModalOpen(true)}
          className={`px-6 py-3 rounded-2xl font-semibold text-xs shadow-md transition-all flex items-center gap-2 ${
            selectedCandidateId
              ? 'bg-brand-600 hover:bg-brand-500 text-white cursor-pointer shadow-brand-500/20'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          Review & Confirm Vote <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* CONFIRMATION MODAL - Inspired by Reference Image 7 */}
      {isConfirmModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-left">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <Vote className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Please review your selection</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to submit your vote? Once committed, your voting entitlement is
              consumed and cannot be reversed.
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Candidate Choice
              </span>
              <span className="text-base font-bold text-slate-900 block">
                {selectedCandidate.name}
              </span>
              <span className="text-xs text-slate-500">
                {selectedCandidate.department} • Ballot #{selectedCandidate.ballotOrder}
              </span>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200/70 text-emerald-800 rounded-2xl text-[11px] leading-relaxed">
              <Lock className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              <strong>Ballot Secrecy Guarantee:</strong> Your vote is confidential. Your student ID
              is strictly decoupled and will never appear on the ballot leaf.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                disabled={isSubmitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Change Selection
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleSubmitVote}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-colors flex items-center gap-2"
              >
                {isSubmitting ? 'Recording Ballot...' : 'Confirm and Submit Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
