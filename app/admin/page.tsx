import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import StatusBadge from '@/components/StatusBadge';
import {
  Lock,
  Vote,
  Users,
  CheckCircle2,
  Plus,
  ShieldCheck,
  FileText,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Administrator Role Required</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
          This portal is restricted to election officials. Please switch to an Administrator account
          (such as Dr. Aris Thorne) using the account selector in the top navigation bar.
        </p>
      </div>
    );
  }

  const elections = await prisma.election.findMany({
    include: {
      candidates: true,
      _count: {
        select: { ballots: true, eligibilities: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRegisteredStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  const totalBallots = await prisma.acceptedBallot.count();
  const totalCheckpoints = await prisma.signedCheckpoint.count();
  const activeElectionsCount = elections.filter((e) => e.status === 'OPEN').length;
  const upcomingElectionsCount = elections.filter((e) => e.status === 'SCHEDULED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Header - Executive White Dashboard (Reference Images 1 & 6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200/70 mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-600" /> Election Board Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Executive Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Signed in as {user.name} ({user.studentId}) • {user.department}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/audit"
            className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-slate-200 shadow-sm"
          >
            <FileText className="w-4 h-4 text-slate-500" /> Audit Log
          </Link>
          <Link
            href="/admin/elections/new"
            className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Election
          </Link>
        </div>
      </div>

      {/* KPI Cards (Inspired by Reference Images 1 & 6) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Eligible Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums mt-3">
            {totalRegisteredStudents}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Database Registered</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Elections</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums mt-3">
            {activeElectionsCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {upcomingElectionsCount} Scheduled
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Accepted Ballots</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums mt-3">
            {totalBallots}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Committed in tree</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Signed Checkpoints</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-teal-600 tabular-nums mt-3">
            {totalCheckpoints}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Ed25519 Anchors</span>
        </div>
      </div>

      {/* Main Table: Configured Elections */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configured Elections</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage candidate manifestos, voter eligibility rosters, and lifecycle state
              transitions.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">Election Title</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4 text-center">Candidates</th>
                <th className="py-3.5 px-4 text-center">Participation</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {elections.map((elec) => {
                const eligible = elec._count.eligibilities;
                const ballots = elec._count.ballots;
                const turnout = eligible > 0 ? Math.round((ballots / eligible) * 1000) / 10 : 0;

                return (
                  <tr key={elec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <Link
                        href={`/admin/elections/${elec.id}`}
                        className="hover:text-brand-600 transition-colors"
                      >
                        {elec.title}
                      </Link>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        {elec.id}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={elec.status} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-slate-500">{elec.department}</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-900 tabular-nums">
                      {elec.candidates.length}
                    </td>
                    <td className="py-4 px-4 text-center tabular-nums">
                      <span className="font-bold text-slate-900">{turnout}%</span>
                      <span className="block text-[10px] text-slate-400">
                        {ballots} / {eligible}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/admin/elections/${elec.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80 transition-colors shadow-sm"
                      >
                        Manage <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
