"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Users, Vote, Clock, Sparkles, ArrowRight, Lock, FileText, Activity } from "lucide-react";
import Link from "next/link";
import { getStoredTotalStudents } from "../lib/college_voter_store";

interface RecentBallotEvent {
  id: string;
  ballotNumber: number;
  timeAgo: string;
  badge: string;
}

export function CampusLivePulse() {
  // Total college student body (persisted & editable from Admin Console)
  const [totalStudents, setTotalStudents] = useState<number>(4800);
  
  // Starting state for votes cast (automatically updates)
  const [votesCast, setVotesCast] = useState(3412);
  const [isSimulating, setIsSimulating] = useState(true);
  const [lastIncrementTime, setLastIncrementTime] = useState<string>("Just now");
  const [recentEvents, setRecentEvents] = useState<RecentBallotEvent[]>([
    { id: "1", ballotNumber: 3412, timeAgo: "Just now", badge: "Sealed & Counted" },
    { id: "2", ballotNumber: 3411, timeAgo: "14s ago", badge: "Verified by Witness" },
    { id: "3", ballotNumber: 3410, timeAgo: "38s ago", badge: "Sealed & Counted" },
    { id: "4", ballotNumber: 3409, timeAgo: "1m ago", badge: "Sealed & Counted" },
  ]);

  // Synchronize total students count from localStorage / Admin panel updates
  useEffect(() => {
    setTotalStudents(getStoredTotalStudents());

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (customEvent.detail?.count) {
        setTotalStudents(customEvent.detail.count);
      }
    };

    window.addEventListener("himvote_total_students_updated", handleSync);
    return () => window.removeEventListener("himvote_total_students_updated", handleSync);
  }, []);

  // Derived metrics
  const remainingStudents = Math.max(0, totalStudents - votesCast);
  const turnoutPercent = totalStudents > 0 ? ((votesCast / totalStudents) * 100).toFixed(1) : "0.0";

  // Auto-updating live voting pulse simulation
  useEffect(() => {
    if (!isSimulating) return;

    // Simulate real-time campus vote drops every 4-7 seconds
    const interval = setInterval(() => {
      setVotesCast((prev) => {
        if (prev >= totalStudents) return prev;
        const nextVoteNum = prev + 1;

        // Add new anonymous ballot event
        setRecentEvents((old) => [
          {
            id: String(Date.now()),
            ballotNumber: nextVoteNum,
            timeAgo: "Just now",
            badge: Math.random() > 0.4 ? "Sealed & Counted" : "Verified by Independent Node",
          },
          ...old.slice(0, 3),
        ]);

        setLastIncrementTime("Just now");
        return nextVoteNum;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isSimulating, totalStudents]);

  return (
    <div className="w-full max-w-6xl mx-auto my-8 px-4">
      {/* Main Container */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a1626] to-[#040913] border border-cyan-500/25 p-6 md:p-8 shadow-2xl shadow-cyan-950/40">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE CAMPUS ELECTION IN PROGRESS
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              All-College Voting Turnout
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              1 student = 1 vote. Entire campus voting under complete anonymity. No dean, teacher, or server can see your choice.
            </p>
          </div>

          {/* Live indicator & Simulation switch */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-slate-900/80 border border-slate-700/60 rounded-2xl p-2 px-3">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Live Updates:</span>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                isSimulating
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
              title="Toggle simulated live voting for demo"
            >
              {isSimulating ? "Active (Auto-refresh)" : "Paused"}
            </button>
          </div>
        </div>

        {/* 4 Key Counters Grid */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          {/* Total Strength */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Students</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {totalStudents.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Eligible voters in college
            </div>
          </div>

          {/* Votes Cast - Animated */}
          <div className="rounded-2xl bg-cyan-950/30 border border-cyan-500/40 p-5 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold mb-1">
              <span>Votes Cast</span>
              <Vote className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-cyan-200 tracking-tight flex items-baseline gap-1">
              <span>{votesCast.toLocaleString()}</span>
              <span className="text-xs font-normal text-emerald-400 animate-pulse">↑ live</span>
            </div>
            <div className="text-[11px] text-cyan-300/80 mt-1">
              Safely sealed in ballot box
            </div>
          </div>

          {/* Remaining Voters */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Voters Left</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-amber-300 tracking-tight">
              {remainingStudents.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Yet to cast ballot
            </div>
          </div>

          {/* Turnout Percentage */}
          <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold mb-1">
              <span>Campus Turnout</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-300 tracking-tight">
              {turnoutPercent}%
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">
              High student engagement
            </div>
          </div>
        </div>

        {/* Turnout Progress Bar */}
        <div className="relative z-10 bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Progress towards 100% College Participation
            </span>
            <span className="font-bold text-white">{votesCast} / {totalStudents} Votes</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm shadow-cyan-500/50"
              style={{ width: `${turnoutPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
            <span>Polls Opened: 08:00 AM</span>
            <span className="text-emerald-400 font-medium">Turnout target: 80% to set new campus record</span>
            <span>Closes: 05:00 PM</span>
          </div>
        </div>

        {/* Live Anonymous Feed & Student Fairness Note */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Feed Column (2 cols) */}
          <div className="md:col-span-2 bg-slate-900/60 rounded-2xl border border-slate-800 p-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Live Anonymous Ballot Stream
              </span>
              <span className="text-[10px] text-slate-500">Real-time cryptographic proofs</span>
            </div>
            <div className="space-y-2">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs transition-all hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-cyan-300 font-medium">
                      Ballot #{evt.ballotNumber}
                    </span>
                    <span className="text-slate-400 text-[11px] hidden sm:inline">
                      anonymously recorded into Merkle root
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                      {evt.badge}
                    </span>
                    <span className="text-[10px] text-slate-400">{evt.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fairness Assurance for Non-Coders (1 col) */}
          <div className="bg-gradient-to-br from-cyan-950/30 to-slate-900/80 rounded-2xl border border-cyan-500/20 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm mb-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Why this is 100% Fair
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Zero Identity Leak:</strong> Your student ID is detached before the vote enters the box.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Digital Tracking Slip:</strong> You get a private slip to check if your vote was counted.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Independent Observers:</strong> Student council witnesses co-sign every batch.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <Link
                href="/student/elections"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                <span>Cast Your Vote Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/admin"
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Admin Setting →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
