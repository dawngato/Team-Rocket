"use client";

import React, { useEffect, useState } from "react";
import { Users, Vote, Clock, Sparkles, Activity, CheckCircle2, ShieldCheck, ArrowRight, Hourglass, UserCheck } from "lucide-react";
import Link from "next/link";
import { getStoredElectionConfig, type ElectionConfig } from "../lib/college_voter_store";

interface LiveBallotEvent {
  id: string;
  ballotNumber: number;
  timeAgo: string;
}

export function LiveTurnoutHeroWidget() {
  // Config state (Total Students, End Time, Candidates)
  const [config, setConfig] = useState<ElectionConfig>({
    totalStudents: 4800,
    endTimeIso: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    candidatesCount: 6,
  });
  
  // Starting live votes cast
  const [votesCast, setVotesCast] = useState<number>(3412);
  const [isLive, setIsLive] = useState<boolean>(true);
  
  // Countdown state
  const [timeLeftStr, setTimeLeftStr] = useState<string>("Calculating...");
  const [isElectionEnded, setIsElectionEnded] = useState<boolean>(false);

  // Live anonymous incoming ballot stream
  const [recentEvents, setRecentEvents] = useState<LiveBallotEvent[]>([
    { id: "1", ballotNumber: 3412, timeAgo: "Just now" },
    { id: "2", ballotNumber: 3411, timeAgo: "18s ago" },
    { id: "3", ballotNumber: 3410, timeAgo: "42s ago" },
  ]);

  // Sync with Admin Panel updates
  useEffect(() => {
    setConfig(getStoredElectionConfig());

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<ElectionConfig>>;
      if (customEvent.detail) {
        setConfig((prev) => ({
          ...prev,
          ...customEvent.detail,
        }));
      }
    };

    window.addEventListener("himvote_election_config_updated", handleSync);
    return () => window.removeEventListener("himvote_election_config_updated", handleSync);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const updateCountdown = () => {
      const endMs = new Date(config.endTimeIso).getTime();
      const nowMs = Date.now();
      const diffMs = endMs - nowMs;

      if (diffMs <= 0) {
        setTimeLeftStr("Polls Closed");
        setIsElectionEnded(true);
        setIsLive(false);
        return;
      }

      setIsElectionEnded(false);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (n: number) => String(n).padStart(2, "0");
      setTimeLeftStr(`${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [config.endTimeIso]);

  // Derived calculations
  const remainingStudents = Math.max(0, config.totalStudents - votesCast);
  const turnoutPercent = config.totalStudents > 0 ? ((votesCast / config.totalStudents) * 100).toFixed(1) : "0.0";

  // Real-time live vote increments
  useEffect(() => {
    if (!isLive || isElectionEnded) return;

    const interval = setInterval(() => {
      setVotesCast((prev) => {
        if (prev >= config.totalStudents) return prev;
        const nextNum = prev + 1;

        setRecentEvents((old) => [
          { id: String(Date.now()), ballotNumber: nextNum, timeAgo: "Just now" },
          ...old.slice(0, 2),
        ]);

        return nextNum;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isLive, isElectionEnded, config.totalStudents]);

  return (
    <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a1829] to-[#040c17] border border-cyan-500/30 p-5 sm:p-6 shadow-2xl shadow-cyan-950/50">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Widget Header */}
      <div className="relative z-10 flex items-center justify-between gap-2 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Activity className="size-4 animate-pulse" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Live College Electorate
            </h3>
            <p className="text-[11px] text-cyan-300/80">
              Entire campus voting as one equal community
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          isElectionEnded
            ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
        }`}>
          <span className={`size-1.5 rounded-full ${isElectionEnded ? "bg-amber-400" : "bg-emerald-400 animate-ping"}`} />
          {isElectionEnded ? "Election Closed" : "Polling Live"}
        </span>
      </div>

      {/* ADMIN CONTROLLED DYNAMIC BANNER: TIME LEFT & CANDIDATES */}
      <div className="relative z-10 grid grid-cols-2 gap-2.5 my-3">
        {/* Countdown to Election Close */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-2.5 px-3 flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Hourglass className="size-3.5 animate-spin" style={{ animationDuration: "6s" }} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-amber-300/80 block tracking-wider">
              Voting Closes In
            </span>
            <span className="text-xs sm:text-sm font-mono font-extrabold text-amber-200 tracking-tight block truncate">
              {timeLeftStr}
            </span>
          </div>
        </div>

        {/* Candidates Available */}
        <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/30 p-2.5 px-3 flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <UserCheck className="size-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-cyan-300/80 block tracking-wider">
              Contesting Candidates
            </span>
            <span className="text-xs sm:text-sm font-mono font-extrabold text-cyan-200 tracking-tight block">
              {config.candidatesCount} Nominees
            </span>
          </div>
        </div>
      </div>

      {/* 3 Main Stat Cards */}
      <div className="relative z-10 grid grid-cols-3 gap-2.5 my-3">
        {/* Total Students */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
            <Users className="size-3 text-cyan-400" />
            <span>Total</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {config.totalStudents.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Students</p>
        </div>

        {/* Votes Cast */}
        <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/40 p-3.5 text-center relative overflow-hidden ring-1 ring-cyan-500/30">
          <div className="flex items-center justify-center gap-1 text-cyan-300 text-[10px] uppercase font-bold tracking-wider mb-1">
            <Vote className="size-3 text-cyan-300" />
            <span>Voted</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono flex items-center justify-center gap-1">
            <span>{votesCast.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-400 font-sans font-bold animate-pulse">↑</span>
          </div>
          <p className="text-[10px] text-cyan-300/80 mt-0.5">Ballots in box</p>
        </div>

        {/* Left */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
            <Clock className="size-3 text-amber-400" />
            <span>Left</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
            {remainingStudents.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Remaining</p>
        </div>
      </div>

      {/* Turnout Progress Bar */}
      <div className="relative z-10 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
            <Sparkles className="size-3 text-cyan-400" />
            <span>College Turnout</span>
          </span>
          <span className="font-mono font-bold text-emerald-400 text-xs">
            {turnoutPercent}%
          </span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
          <div
            className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm shadow-cyan-500/50"
            style={{ width: `${turnoutPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
          <span>Target: 80% turnout</span>
          <span>{votesCast} of {config.totalStudents} cast</span>
        </div>
      </div>

      {/* Live Anonymous Incoming Stream */}
      <div className="relative z-10 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-3">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
            Real-time Anonymous Ticker
          </span>
          <span className="text-slate-500 text-[9px]">Zero identity stored</span>
        </div>
        <div className="space-y-1.5">
          {recentEvents.map((evt) => (
            <div
              key={evt.id}
              className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-2.5 py-1.5 text-[11px]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                <span className="font-mono text-cyan-300 font-semibold">
                  Ballot #{evt.ballotNumber}
                </span>
                <span className="text-slate-400 text-[10px]">
                  sealed into box
                </span>
              </div>
              <span className="text-[10px] text-slate-400">{evt.timeAgo}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 flex items-center gap-1 text-[10px]">
          <ShieldCheck className="size-3 text-emerald-400" />
          <span>Configured by Election Commission</span>
        </span>
        <Link
          href="/admin"
          className="text-cyan-400 hover:text-cyan-300 font-semibold text-[10px] transition-colors inline-flex items-center gap-1"
        >
          <span>Admin Settings</span>
          <ArrowRight className="size-2.5" />
        </Link>
      </div>
    </div>
  );
}
