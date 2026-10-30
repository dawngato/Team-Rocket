'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Vote,
  Users,
  Award,
  AlertCircle,
  Building,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

interface LiveResultsData {
  election: {
    id: string;
    title: string;
    status: string;
    department: string;
    academicSession: string;
    totalBallots: number;
    totalEligible: number;
    turnoutPercentage: number;
    isProjectedSample: boolean;
    disclaimer: string;
  };
  candidateShares: Array<{
    id: string;
    name: string;
    department: string;
    academicYear: number;
    ballotOrder: number;
    votes: number;
    percentage: number;
    color: string;
  }>;
  timeline: Array<{
    timestamp: string;
    timeLabel: string;
    ballots: number;
  }>;
  departmentStats: Array<{
    department: string;
    registered: number;
    voted: number;
    turnout: number;
  }>;
}

export default function LiveResultsPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<LiveResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchResults = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/elections/${params.id}/live-results`);
      const json = await res.json();
      if (json.election) {
        setData(json);
        setLastUpdated(new Date());
      } else {
        setErrorMsg('Could not fetch election live results');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // Poll every 8 seconds for live voting updates
    const interval = setInterval(() => {
      fetchResults(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Connecting to live voting stream & aggregating real-time candidate distribution...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Election Data Unavailable</h1>
        <p className="text-xs text-slate-500 mt-1">{errorMsg || 'Could not load election details.'}</p>
        <Link href="/elections" className="mt-4 inline-block text-xs font-semibold text-brand-600">
          Return to Elections List
        </Link>
      </div>
    );
  }

  const { election, candidateShares, timeline, departmentStats } = data;
  const isVotingOpen = election.status === 'OPEN';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/elections/${election.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Election Overview
      </Link>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={election.status} />
              {isVotingOpen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/70">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Real-Time Stream
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200/70">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Certified Final Tally
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {election.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {election.department} • {election.academicSession} • Last updated{' '}
              {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchResults(true)}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 shadow-sm transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>

            {isVotingOpen && (
              <Link
                href={`/student/vote/${election.id}`}
                className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
              >
                <Vote className="w-4 h-4" /> Cast My Vote
              </Link>
            )}
          </div>
        </div>

        {/* Disclaimer Notice Banner as explicitly requested by user */}
        {isVotingOpen && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
            <Activity className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Sample Visual Presentation Notice:</strong> This dashboard renders a sample
              visual presentation of current real-time voting data so students can track campus
              engagement. Because voting remains open, final certified results may vary slightly from
              this live sample once officially audited and sealed upon election close.
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Accepted Ballots
          </span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {election.totalBallots}
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">Recorded in tree</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Eligible Student Voters
          </span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {election.totalEligible}
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">Assigned to election</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Live Turnout Rate
          </span>
          <div className="text-3xl font-extrabold text-brand-600 mt-2 tabular-nums">
            {election.turnoutPercentage}%
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">Campus participation</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Leading Candidate
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-2 truncate">
            {candidateShares[0]?.name || 'No votes yet'}
          </div>
          <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
            {candidateShares[0]?.votes || 0} votes ({candidateShares[0]?.percentage || 0}%)
          </span>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* CHART 1: DONUT / PIE CHART (Vote Share Distribution) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-brand-600" /> Candidate Vote Share (Donut Chart)
              </h2>
              <span className="text-xs text-slate-400 font-medium">Real-time percentage</span>
            </div>

            <div className="h-72 w-full">
              {election.totalBallots === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No ballots recorded yet. Be the first to vote!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={candidateShares}
                      dataKey="votes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {candidateShares.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, props: any) => [
                        `${value} votes (${props.payload.percentage}%)`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: '1rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Legend Badges */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            {candidateShares.map((cand) => (
              <span
                key={cand.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cand.color }}
                />
                <span>{cand.name}</span>
                <span className="text-slate-400 text-[11px] tabular-nums font-mono">
                  {cand.percentage}%
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* CHART 2: CANDIDATE HORIZONTAL BAR DISTRIBUTION */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Vote Tallies & Ranking
              </h2>
              <span className="text-xs text-slate-400 font-medium">Sorted by count</span>
            </div>

            <div className="space-y-5 my-3">
              {candidateShares.map((cand, idx) => (
                <div key={cand.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cand.color }}
                      />
                      {cand.name}
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({cand.department})
                      </span>
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">
                      {cand.votes} votes ({cand.percentage}%)
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(4, cand.percentage)}%`,
                        backgroundColor: cand.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Denominator: {election.totalBallots} valid submitted ballots</span>
            <span className="font-semibold text-slate-600">Calculated from SQLite database</span>
          </div>
        </div>
      </div>

      {/* SECOND ROW: CUMULATIVE PARTICIPATION OVER TIME & DEPARTMENT TURNOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 3: VOTING VELOCITY OVER TIME (Line Chart) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Participation Momentum Over Time
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cumulative accepted ballots over election timeline
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {timeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Awaiting first ballot submissions...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="timeLabel" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ballots"
                    name="Accepted Ballots"
                    stroke="#304FFE"
                    strokeWidth={3}
                    dot={{ fill: '#304FFE', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 4: DEPARTMENT PARTICIPATION (Bar Chart) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-600" /> Department Turnout Breakdown
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Turnout % per academic faculty (Preserves individual vote secrecy)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {departmentStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Department data aggregating...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} domain={[0, 100]} unit="%" />
                  <YAxis
                    type="category"
                    dataKey="department"
                    stroke="#64748B"
                    fontSize={10}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val}% (${item.payload.voted} / ${item.payload.registered} voted)`,
                      'Participation',
                    ]}
                    contentStyle={{
                      borderRadius: '1rem',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="turnout" fill="#10B981" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
