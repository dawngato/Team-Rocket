import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import StatusBadge from '@/components/StatusBadge';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Vote,
  Search,
  FileCheck2,
  Users,
  Activity,
  Terminal,
  ChevronRight,
  Layers,
  Sparkles,
  HelpCircle,
  UserCheck,
  BarChart3,
} from 'lucide-react';

export const revalidate = 0;

async function getDashboardData() {
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

  const totalRegisteredStudents = await prisma.user.count({
    where: { role: 'STUDENT' },
  });

  const totalBallotsAccepted = await prisma.acceptedBallot.count();
  const totalCheckpointsSigned = await prisma.signedCheckpoint.count();

  return {
    elections,
    totalRegisteredStudents,
    totalBallotsAccepted,
    totalCheckpointsSigned,
  };
}

export default async function HomePage() {
  const data = await getDashboardData();
  const activeElections = data.elections.filter((e) => e.status === 'OPEN');
  const publishedElections = data.elections.filter((e) => e.status === 'PUBLISHED');

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFBFD]">
      {/* HERO SECTION - PURE WHITE CANVAS WITH FLOATING ILLUSTRATION */}
      <section className="relative bg-white pt-16 pb-20 border-b border-slate-100 overflow-hidden">
        {/* Very subtle ambient lighting */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand-50/60 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-50/50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                Designed for transparent campus elections • Spring 2026
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Every Vote{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">
                  Matters.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-normal">
                A simpler, more transparent way for university communities to participate in student
                elections. Protected with mathematical ballot secrecy and independently verifiable
                cryptographic checkpoints.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all flex items-center gap-2 text-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  Student Registration
                </Link>
                <Link
                  href="/elections/elec-spring-2026-pres/live"
                  className="px-6 py-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition-all flex items-center gap-2 text-sm shadow-sm"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Live Results & Pie Charts
                </Link>
                <Link
                  href="/elections"
                  className="px-5 py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 font-semibold transition-all flex items-center gap-2 text-sm shadow-sm"
                >
                  <Vote className="w-4 h-4" />
                  Elections
                </Link>
              </div>

              {/* Minimal Metrics Pill Strip */}
              <div className="pt-8 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                    {activeElections.length}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">Active Voting</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                    {data.totalRegisteredStudents}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">Eligible Voters</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                    {data.totalBallotsAccepted}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">Ballots Cast</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                    {data.totalCheckpointsSigned}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">Signed Roots</div>
                </div>
              </div>
            </div>

            {/* Right Column: Original Frontend Component Illustration (Reference Style) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm sm:max-w-md bg-white rounded-3xl p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-200/80 animate-float-subtle">
                {/* Header of Mock Ballot */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                      Sample Student Ballot
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      Student Council Election 2026
                    </h3>
                  </div>
                  <StatusBadge status="OPEN" size="sm" />
                </div>

                {/* Candidate Selection List (Inspired by Reference Images 2, 5 & 7) */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl border-2 border-brand-500 bg-brand-50/40 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        JB
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Jordan Blake</span>
                        <span className="text-[11px] text-slate-500">Computer Science • Year 3</span>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                      ✓
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between opacity-80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                        SL
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Samantha Lee</span>
                        <span className="text-[11px] text-slate-500">School of Law • Year 2</span>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border border-slate-300" />
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between opacity-80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                        DW
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Devante Washington</span>
                        <span className="text-[11px] text-slate-500">Business & Economics • Year 4</span>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border border-slate-300" />
                  </div>
                </div>

                {/* Turnout Mini-Gauge */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-brand-600" /> Live Participation
                    </span>
                    <span className="font-bold text-slate-900">62.5% Turnout</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[62.5%] h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full" />
                  </div>
                </div>

                {/* Trust Verification Pill */}
                <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Your vote is confidential and mathematically verifiable.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK RECEIPT VERIFIER CALLOUT */}
      <section className="-mt-6 max-w-4xl mx-auto px-4 w-full relative z-10">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              Ballot Secrecy Maintained
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Hold a Ballot Tracking Receipt?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm your ballot was included in the accepted Merkle root without revealing who you voted for.
            </p>
          </div>
          <Link
            href="/student/verify-receipt"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex-shrink-0 shadow-sm"
          >
            Verify Receipt Inclusion
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* HOW VOTING WORKS - 3 STEP WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
            Simple 3-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            How University Voting Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Participate in campus decisions in less than two minutes from any phone or browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-sm hover-lift">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm mb-4">
              01
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Review Candidates</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Read transparent manifestos, candidate priorities, and platform commitments. Compare
              candidates side-by-side without distractions.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-sm hover-lift">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-4">
              02
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Cast Confidential Vote</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authenticate with your student identity to consume your one voting entitlement. Your
              choice is decoupled and stored anonymously.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-sm hover-lift">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
              03
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Verify Ballot Inclusion</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Receive an anonymous tracking receipt. Check the mathematical Merkle path proof to confirm
              your ballot is counted in the official checkpoint.
            </p>
          </div>
        </div>
      </section>

      {/* ACTIVE ELECTIONS SECTION */}
      <section className="bg-white py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Current Ballots
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Active Campus Elections
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Eligible students can vote now using their university credentials.
              </p>
            </div>
            <Link
              href="/elections"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              All Elections ({data.elections.length})
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {activeElections.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-xs">
              No voting periods currently open. Please check upcoming elections.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeElections.map((elec) => {
                const eligible = elec._count.eligibilities;
                const ballots = elec._count.ballots;
                const turnout = eligible > 0 ? (ballots / eligible) * 100 : 0;

                return (
                  <div
                    key={elec.id}
                    className="bg-[#FAFBFD] border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <StatusBadge status={elec.status} />
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          {elec.department}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        <Link href={`/elections/${elec.id}`} className="hover:text-brand-600 transition-colors">
                          {elec.title}
                        </Link>
                      </h3>

                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {elec.description}
                      </p>

                      {/* Candidates Preview */}
                      <div className="mt-5 pt-4 border-t border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Candidates ({elec.candidates.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {elec.candidates.map((cand) => (
                            <span
                              key={cand.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-sm"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                              {cand.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Turnout Progress Bar */}
                      <div className="mt-5 pt-4 border-t border-slate-200/70">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Activity className="w-3.5 h-3.5 text-brand-600" /> Operational Turnout
                          </span>
                          <span className="tabular-nums font-bold text-slate-900">
                            {Math.round(turnout * 10) / 10}% ({ballots} / {eligible})
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, turnout))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Closes: {elec.endTime.toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/elections/${elec.id}`}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          Details
                        </Link>
                        <Link
                          href={`/student/vote/${elec.id}`}
                          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                        >
                          Vote Now <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* WHY TRANSPARENCY MATTERS (CLEAN WHITE CARDS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Trust & Security
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Why Mathematical Transparency Matters
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Built so nobody—not even the university network administrators—can manipulate results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Strict Identity Privacy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your student profile consumes an entitlement atomically, but accepted ballots contain
              zero student ID columns in the database.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">SHA-256 Merkle Trees</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every ballot is linked in an append-only tree. Altering or deleting a vote
              mathematically breaks the root commitment.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Signed Checkpoints</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The independent auditor signs sequence roots with Ed25519 digital signatures, preventing
              retroactive tampering.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Zero-Trust Python CLI</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Anyone can download raw JSON artifacts and verify the election offline using a
              zero-dependency Python 3 script.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
