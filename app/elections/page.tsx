import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import StatusBadge from '@/components/StatusBadge';
import { Vote, ArrowRight, Calendar, Users, Award, ExternalLink, ArrowLeft } from 'lucide-react';

export const revalidate = 0;

export default async function ElectionsPage() {
  const elections = await prisma.election.findMany({
    include: {
      candidates: {
        orderBy: { ballotOrder: 'asc' },
      },
      _count: {
        select: {
          ballots: true,
          eligibilities: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
            University Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Campus Elections Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Browse active, scheduled, and concluded student government and council ballots. Every
            election is anchored to cryptographically committed checkpoints.
          </p>
        </div>
        <Link
          href="/student"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all self-start"
        >
          <Vote className="w-4 h-4" /> Go to Voting Booth
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {elections.map((elec) => {
          const eligible = elec._count.eligibilities;
          const ballots = elec._count.ballots;
          const turnout = eligible > 0 ? Math.round((ballots / eligible) * 1000) / 10 : 0;

          return (
            <div
              key={elec.id}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <StatusBadge status={elec.status} size="sm" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {elec.academicSession}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  <Link href={`/elections/${elec.id}`} className="hover:text-brand-600 transition-colors">
                    {elec.title}
                  </Link>
                </h3>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {elec.description}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="font-semibold text-slate-700">{elec.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Candidates:</span>
                    <span className="font-semibold text-slate-700">
                      {elec.candidates.length} registered
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Participation Turnout:</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {turnout}% ({ballots} / {eligible})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/elections/${elec.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Overview
                </Link>

                {elec.status === 'OPEN' && (
                  <Link
                    href={`/student/vote/${elec.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    Cast Ballot <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {elec.status === 'PUBLISHED' && (
                  <Link
                    href={`/elections/${elec.id}/results`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors"
                  >
                    Official Results <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {(elec.status === 'SCHEDULED' || elec.status === 'DRAFT') && (
                  <span className="text-xs text-slate-400 font-medium">Opens Soon</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
