import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StatusBadge from '@/components/StatusBadge';
import {
  ShieldCheck,
  Calendar,
  Building,
  Vote,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  FileCheck2,
  Activity,
  Layers,
  ArrowLeft,
} from 'lucide-react';

export const revalidate = 0;

export default async function ElectionDetailPage({
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
      checkpoints: {
        orderBy: { sequenceNumber: 'desc' },
        take: 3,
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

  const eligibleCount = election._count.eligibilities;
  const ballotCount = election._count.ballots;
  const turnout = eligibleCount > 0 ? Math.round((ballotCount / eligibleCount) * 1000) / 10 : 0;

  const states = ['DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'VERIFIED', 'PUBLISHED'];
  const currentStateIndex = states.indexOf(election.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/elections"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Elections
      </Link>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={election.status} size="lg" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {election.department} • {election.academicSession}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {election.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              {election.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <Link
              href={`/elections/${election.id}/live`}
              className="px-4 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200/80 transition-all flex items-center gap-2 shadow-sm"
            >
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              Live Visual Results (Charts)
            </Link>

            {election.status === 'OPEN' && (
              <Link
                href={`/student/vote/${election.id}`}
                className="px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
              >
                <Vote className="w-4 h-4" /> Cast Confidential Ballot
              </Link>
            )}

            {election.status === 'PUBLISHED' && (
              <Link
                href={`/elections/${election.id}/results`}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> View Certified Results
              </Link>
            )}

            <Link
              href={`/verify?electionId=${election.id}`}
              className="px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <FileCheck2 className="w-4 h-4 text-brand-600" /> Verify Checkpoints
            </Link>
          </div>
        </div>

        {/* State Machine Progress Tracker */}
        <div className="pt-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Election Lifecycle State Machine
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {states.map((st, idx) => {
              const isPast = idx < currentStateIndex;
              const isCurrent = idx === currentStateIndex;

              return (
                <div
                  key={st}
                  className={`px-3 py-2 rounded-2xl text-center border text-xs font-semibold ${
                    isCurrent
                      ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm ring-1 ring-brand-500/20'
                      : isPast
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-white border-slate-100 text-slate-300'
                  }`}
                >
                  <span className="block text-[10px] text-slate-400 font-mono">0{idx + 1}</span>
                  {st}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Candidates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Registered Candidates ({election.candidates.length})
            </h2>
            <span className="text-xs text-slate-400">Fixed at voting start</span>
          </div>

          <div className="space-y-5">
            {election.candidates.map((cand) => {
              let priorities: string[] = [];
              try {
                priorities = JSON.parse(cand.campaignPriorities);
              } catch (e) {
                priorities = [];
              }

              return (
                <div
                  key={cand.id}
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    {cand.photoUrl ? (
                      <img
                        src={cand.photoUrl}
                        alt={cand.name}
                        className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-600 flex-shrink-0 border border-slate-200">
                        {cand.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900">{cand.name}</h3>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Ballot #{cand.ballotOrder}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {cand.department} • Year {cand.academicYear}
                      </div>

                      <p className="text-xs text-slate-600 mt-2 font-medium italic">
                        "{cand.shortBio}"
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Platform & Manifesto:
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">{cand.manifesto}</p>
                      </div>

                      {priorities.length > 0 && (
                        <div className="mt-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Key Campaign Commitments:
                          </span>
                          <ul className="space-y-1.5">
                            {priorities.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-slate-600"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Turnout & Checkpoints Info */}
        <div className="space-y-6">
          {/* Turnout Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-600" /> Operational Turnout
              </h3>
              <span className="text-xs font-bold text-slate-900 tabular-nums">{turnout}%</span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(5, turnout))}%` }}
              />
            </div>

            <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Accepted Ballots:</span>
                <span className="font-bold text-slate-900 tabular-nums">{ballotCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Eligible Voters:</span>
                <span className="font-bold text-slate-900 tabular-nums">{eligibleCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Entitlements:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {Math.max(0, eligibleCount - ballotCount)}
                </span>
              </div>
            </div>

            {election.status === 'OPEN' && (
              <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] leading-relaxed">
                <Lock className="w-3.5 h-3.5 inline mr-1 text-amber-700" />
                <strong>Voter Privacy Guarantee:</strong> Live candidate vote distributions are
                withheld during active voting to prevent strategic voter manipulation or coercion.
              </div>
            )}
          </div>

          {/* Cryptographic Checkpoint */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> Cryptographic Integrity
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Current Merkle Root:
                </span>
                <span className="font-mono text-slate-800 break-all text-[11px] bg-slate-50 p-2.5 rounded-2xl block border border-slate-200 mt-1">
                  {election.merkleRoot || 'Uncommitted'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Checkpoint Sequence:
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  #{election.checkpointSeq}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100">
              <Link
                href={`/verify?electionId=${election.id}`}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center justify-between"
              >
                <span>Verify with Python Standalone Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
