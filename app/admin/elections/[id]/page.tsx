'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import {
  ArrowLeft,
  Lock,
  Vote,
  ShieldCheck,
  CheckCircle2,
  Users,
  Plus,
  Download,
  AlertCircle,
  Play,
  StopCircle,
  FileCheck2,
  Upload,
} from 'lucide-react';

export default function AdminElectionDetailPage({ params }: { params: { id: string } }) {
  const [election, setElection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Candidate draft
  const [newCandName, setNewCandName] = useState('');
  const [newCandDept, setNewCandDept] = useState('Computer Science & Engineering');
  const [newCandBio, setNewCandBio] = useState('');
  const [newCandManifesto, setNewCandManifesto] = useState('');

  // Eligibility bulk import draft
  const [importStudentIds, setImportStudentIds] = useState('');
  const [eligibilities, setEligibilities] = useState<any[]>([]);

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

  const fetchEligibilities = async () => {
    try {
      const res = await fetch(`/api/elections/${params.id}/eligibility`);
      const data = await res.json();
      if (data.eligibilities) {
        setEligibilities(data.eligibilities);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchElection();
    fetchEligibilities();
  }, [params.id]);

  const handleStateTransition = async (targetStatus: string) => {
    setIsTransitioning(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/elections/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update state');
      }

      setSuccessMsg(`Election state successfully updated to ${targetStatus}`);
      fetchElection();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName.trim()) return;

    try {
      const res = await fetch(`/api/elections/${params.id}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCandName.trim(),
          department: newCandDept,
          academicYear: 3,
          shortBio: newCandBio.trim(),
          manifesto: newCandManifesto.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add candidate');
      }

      setSuccessMsg(`Candidate ${newCandName} registered.`);
      setNewCandName('');
      setNewCandBio('');
      setNewCandManifesto('');
      fetchElection();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleImportEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = importStudentIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) return;

    try {
      const res = await fetch(`/api/elections/${params.id}/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: ids }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Eligibility import failed');
      }

      setSuccessMsg(
        `Imported ${data.importedCount} new voters (${data.skippedCount} already existed/unregistered).`
      );
      setImportStudentIds('');
      fetchEligibilities();
      fetchElection();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePublishResults = async () => {
    setIsTransitioning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/elections/${params.id}/publish`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish results');
      }

      setSuccessMsg('Results officially sealed, signed with Ed25519, and published!');
      fetchElection();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsTransitioning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
        Loading election administration controls...
      </div>
    );
  }

  if (!election) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Election Not Found</h1>
        <Link href="/admin" className="text-sm font-semibold text-blue-600 mt-2 block">
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={election.status} size="lg" />
              <span className="text-xs font-semibold text-slate-400 font-mono">{election.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {election.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {election.department} • {election.academicSession}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/api/elections/${election.id}/export`}
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export Bundle
            </Link>

            {election.status === 'PUBLISHED' && (
              <Link
                href={`/elections/${election.id}/results`}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                View Public Results
              </Link>
            )}
          </div>
        </div>

        {/* State Machine Transition Actions */}
        <div className="pt-6">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
            State Machine Operations
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {election.status === 'DRAFT' && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateTransition('OPEN')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Open Election for Voting
              </button>
            )}

            {election.status === 'SCHEDULED' && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateTransition('OPEN')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Open Election Now
              </button>
            )}

            {election.status === 'OPEN' && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateTransition('CLOSED')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" /> Close Voting Period
              </button>
            )}

            {election.status === 'CLOSED' && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateTransition('VERIFIED')}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" /> Mark Audit Verified
              </button>
            )}

            {election.status === 'VERIFIED' && (
              <button
                disabled={isTransitioning}
                onClick={handlePublishResults}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Seal & Publish Results
              </button>
            )}

            {election.status === 'PUBLISHED' && (
              <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                Election is in terminal certified PUBLISHED state.
              </span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Candidates Section */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Registered Candidates ({election.candidates.length})
              </h2>
              <span className="text-[11px] text-slate-400">
                {election.status === 'DRAFT' ? 'Editable' : 'Frozen (Audited)'}
              </span>
            </div>

            <div className="space-y-3">
              {election.candidates.map((cand: any) => (
                <div
                  key={cand.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{cand.name}</span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      {cand.department} • Ballot #{cand.ballotOrder}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{cand.id}</span>
                </div>
              ))}
            </div>

            {/* Add Candidate Form (only if DRAFT/SCHEDULED) */}
            {(election.status === 'DRAFT' || election.status === 'SCHEDULED') && (
              <form onSubmit={handleAddCandidate} className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Add Additional Candidate
                </span>
                <input
                  type="text"
                  required
                  placeholder="Candidate Full Name"
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={newCandDept}
                  onChange={(e) => setNewCandDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <textarea
                  rows={2}
                  placeholder="Short Bio"
                  value={newCandBio}
                  onChange={(e) => setNewCandBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                >
                  Save Candidate
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Eligibility Section */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Eligible Voters ({eligibilities.length})
              </h2>
              <span className="text-xs text-slate-400 tabular-nums">
                {eligibilities.filter((e) => e.hasVoted).length} Voted
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
              {eligibilities.map((el) => (
                <div key={el.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{el.user.name}</span>
                    <span className="block text-[11px] text-slate-400 font-mono">
                      {el.studentId} • {el.user.department}
                    </span>
                  </div>
                  <div>
                    {el.hasVoted ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Voted
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bulk Eligibility Import Form */}
            <form onSubmit={handleImportEligibility} className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Bulk Register Eligible Student IDs
              </span>
              <p className="text-[11px] text-slate-400">
                Enter student IDs separated by comma or newlines (e.g. STU-2026-001, STU-2026-002).
              </p>
              <textarea
                rows={2}
                placeholder="STU-2026-001, STU-2026-002, STU-2026-003..."
                value={importStudentIds}
                onChange={(e) => setImportStudentIds(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Assign Eligibility
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
