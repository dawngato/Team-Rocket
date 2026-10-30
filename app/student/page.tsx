import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import StatusBadge from '@/components/StatusBadge';
import {
  Vote,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  ArrowRight,
  User,
  Award,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  FileCheck2,
  Activity,
} from 'lucide-react';

export const revalidate = 0;

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Student Identity Access</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
          You are currently signed in with an {user?.role || 'Guest'} role. Please switch to a student
          identity (such as Alex Chen or Maya Patel) using the account selector in the top navigation bar.
        </p>
      </div>
    );
  }

  // Get student's eligibilities
  const eligibilities = await prisma.voterEligibility.findMany({
    where: { userId: user.id },
    include: {
      election: {
        include: {
          candidates: true,
          _count: {
            select: { ballots: true, eligibilities: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const openElections = eligibilities.filter((e) => e.election.status === 'OPEN');
  const votedCount = eligibilities.filter((e) => e.hasVoted).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Welcome Card - Inspired by Reference Images 0, 4, 8 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-brand-500/15 flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Student Portal
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Active Student
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              ID: <span className="font-mono text-slate-700 font-bold">{user.studentId}</span> •{' '}
              {user.department} • Academic Year {user.year}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/elections/elec-spring-2026-pres/live"
            className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" /> Live Visual Presentation
          </Link>
          <Link
            href="/student/verify-receipt"
            className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <Search className="w-4 h-4 text-brand-600" /> Verify Ballot Receipt
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Eligible Ballots</span>
            <Vote className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {eligibilities.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Assigned to you</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Open for Voting</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2 tabular-nums">
            {openElections.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Ready to vote</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Ballots Cast</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {votedCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Recorded in tree</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Verified Receipts</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-teal-600 mt-2 tabular-nums">
            {votedCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Proof available</span>
        </div>
      </div>

      {/* Eligible Elections Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Assigned Elections</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Elections configured for your department and academic standing.
        </p>
      </div>

      {eligibilities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-xs">
          No active elections currently assigned to your student identity.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eligibilities.map((el) => {
            const elec = el.election;
            const isOpen = elec.status === 'OPEN';
            const hasVoted = el.hasVoted;

            return (
              <div
                key={el.id}
                className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusBadge status={elec.status} size="sm" />
                    {hasVoted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ballot Accepted
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3.5 h-3.5 text-brand-600" /> Ready to Vote
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Scheduled</span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    <Link href={`/elections/${elec.id}`} className="hover:text-brand-600 transition-colors">
                      {elec.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {elec.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Department:</span>
                      <span className="font-semibold text-slate-700">{elec.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Candidates:</span>
                      <span className="font-semibold text-slate-700">
                        {elec.candidates.length} on ballot
                      </span>
                    </div>
                  </div>

                  {hasVoted && el.receiptCode && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        Your Tracking Receipt Code:
                      </span>
                      <span className="font-mono font-bold text-slate-900 tracking-wider text-xs select-all block mt-0.5">
                        {el.receiptCode}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/elections/${elec.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Details
                  </Link>

                  {isOpen && !hasVoted && (
                    <Link
                      href={`/student/vote/${elec.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-sm transition-colors"
                    >
                      <Vote className="w-3.5 h-3.5" /> Cast Ballot
                    </Link>
                  )}

                  {hasVoted && el.receiptCode && (
                    <Link
                      href={`/student/verify-receipt?code=${el.receiptCode}&electionId=${elec.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Verify Proof
                    </Link>
                  )}

                  {elec.status === 'PUBLISHED' && (
                    <Link
                      href={`/elections/${elec.id}/results`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold transition-colors"
                    >
                      Official Results
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
