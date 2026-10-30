import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StatusBadge from '@/components/StatusBadge';
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  Download,
  Terminal,
  ArrowRight,
  TrendingUp,
  FileCode2,
  ArrowLeft,
  Users,
  BarChart3,
} from 'lucide-react';

export const revalidate = 0;

export default async function ElectionResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const election = await prisma.election.findUnique({
    where: { id: params.id },
    include: {
      candidates: {
        orderBy: { ballotOrder: 'asc' },
      },
      manifest: true,
      checkpoints: {
        orderBy: { sequenceNumber: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          ballots: true,
          eligibilities: true,
        },
      },
    },
  });

  if (!election) {
    notFound();
  }

  // Tally votes from acceptedBallot table
  const voteCounts = await prisma.acceptedBallot.groupBy({
    by: ['candidateId'],
    where: { electionId: election.id },
    _count: { candidateId: true },
  });

  const countMap: Record<string, number> = {};
  for (const row of voteCounts) {
    countMap[row.candidateId] = row._count.candidateId;
  }

  const totalBallots = election._count.ballots;
  const totalEligible = election._count.eligibilities;
  const turnout = totalEligible > 0 ? Math.round((totalBallots / totalEligible) * 1000) / 10 : 0;

  const candidateResults = election.candidates.map((cand) => {
    const votes = countMap[cand.id] || 0;
    const percentage = totalBallots > 0 ? Math.round((votes / totalBallots) * 1000) / 10 : 0;
    return {
      ...cand,
      votes,
      percentage,
    };
  });

  candidateResults.sort((a, b) => b.votes - a.votes);

  const topCandidate = candidateResults[0];
  const isTie =
    candidateResults.length > 1 && candidateResults[0].votes === candidateResults[1].votes;

  const latestCheckpoint = election.checkpoints[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/elections"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Elections
      </Link>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={election.status} />
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Officially Certified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {election.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Published on:{' '}
              {election.publishedAt
                ? new Date(election.publishedAt).toLocaleString()
                : 'Pending Official Publication'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/elections/${election.id}/live`}
              className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-emerald-200/80 shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" /> Live Interactive Charts
            </Link>
            <Link
              href={`/api/elections/${election.id}/export`}
              target="_blank"
              className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-slate-200 shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" /> Export Package
            </Link>
            <Link
              href={`/verify?electionId=${election.id}`}
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Terminal className="w-4 h-4" /> Run Audit
            </Link>
          </div>
        </div>

        {/* WINNER / OUTCOME BANNER */}
        {election.status === 'PUBLISHED' && topCandidate && (
          <div className="mt-6 p-6 rounded-3xl bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/15 flex-shrink-0">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  {isTie ? 'Electoral Tie Declared' : 'Official Winner Declared'}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {isTie
                    ? `${candidateResults[0].name} & ${candidateResults[1].name}`
                    : topCandidate.name}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isTie
                    ? 'Both candidates received an identical vote tally'
                    : `${topCandidate.department} • Received ${topCandidate.votes} votes (${topCandidate.percentage}%)`}
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-emerald-200 sm:pl-6">
              <span className="text-xs text-slate-500 block">Total Certified Ballots</span>
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {totalBallots}
              </span>
              <span className="text-xs text-emerald-700 block mt-0.5 font-semibold">
                {turnout}% Voter Participation
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Horizontal Candidate Bar Chart (Inspired by Reference Image 3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" /> Candidate Vote Breakdown (Horizontal
              Distribution)
            </h2>

            <div className="space-y-6">
              {candidateResults.map((cand, idx) => {
                const isWinner = !isTie && idx === 0 && cand.votes > 0;

                return (
                  <div key={cand.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        {isWinner && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                        )}
                        <span className="text-slate-900 font-bold text-sm">{cand.name}</span>
                        <span className="text-slate-400 font-normal">
                          ({cand.department})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-900 font-bold tabular-nums">
                          {cand.votes} votes
                        </span>
                        <span className="text-slate-500 ml-2 font-mono text-[11px]">
                          {cand.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar (Reference Image 3 Style) */}
                    <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isWinner
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-gradient-to-r from-brand-600 to-indigo-500'
                        }`}
                        style={{ width: `${Math.max(4, cand.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Verification Terminal Box */}
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                <Terminal className="w-4 h-4" />
                Standalone Python 3 Verification Command
              </span>
              <span className="text-[11px] text-slate-400 font-sans">Zero Dependencies</span>
            </div>

            <p className="text-slate-400 mb-3 text-[11px] font-sans">
              To verify these exact election results on an air-gapped terminal without trusting our web server:
            </p>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-teal-300 select-all overflow-x-auto text-[11px] leading-relaxed">
              python scripts/verify_election.py \<br />
              &nbsp;&nbsp;--manifest artifacts/{election.id}/election_manifest.json \<br />
              &nbsp;&nbsp;--ballots artifacts/{election.id}/accepted_ballots.jsonl \<br />
              &nbsp;&nbsp;--checkpoint artifacts/{election.id}/signed_checkpoint.json \<br />
              &nbsp;&nbsp;--public-key artifacts/{election.id}/trusted_auditor_public_key.pem
            </div>
          </div>
        </div>

        {/* Cryptographic Commitment Proof Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> Signed Commitments
            </h3>

            <div className="space-y-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Committed Merkle Root:
                </span>
                <span className="font-mono text-slate-900 break-all text-[11px] bg-slate-50 p-2.5 rounded-2xl block border border-slate-200 mt-1 font-semibold">
                  {election.merkleRoot}
                </span>
              </div>

              {latestCheckpoint && (
                <>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Auditor Checkpoint Sequence:
                    </span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      #{latestCheckpoint.sequenceNumber} (Ballots: {latestCheckpoint.ballotCount})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Ed25519 Checkpoint Signature:
                    </span>
                    <span className="font-mono text-slate-700 break-all text-[10px] bg-slate-50 p-2.5 rounded-2xl block border border-slate-200 mt-1">
                      {latestCheckpoint.signature}
                    </span>
                  </div>
                </>
              )}

              {election.manifest && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Manifest SHA-256 Hash:
                  </span>
                  <span className="font-mono text-slate-700 break-all text-[10px] bg-slate-50 p-2 rounded-2xl block border border-slate-200 mt-1">
                    {election.manifest.manifestHash}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href={`/verify?electionId=${election.id}`}
                className="w-full py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs transition-colors text-center border border-teal-200"
              >
                Run Verification Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
