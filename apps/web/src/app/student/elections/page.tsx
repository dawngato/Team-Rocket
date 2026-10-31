"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Vote, ArrowRight, Clock, Users, AlertCircle, RefreshCw } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

export default function StudentElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchElections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await electionClient.getElections();
      setElections(data || []);
      setError(null);
    } catch (err: unknown) {
      setElections([]);
      setError(err instanceof Error ? err.message : "Unable to retrieve student elections from the authoritative server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchElections();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="border-b border-slate-200 dark:border-[#1E3352] pb-6">
        <h1 className="text-2xl font-extrabold text-[#10233F] dark:text-white">
          Eligible Student Elections
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Select an active contest to verify your blind credential and cast your ballot.
        </p>
      </div>

      {loading ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
          <div className="h-16 bg-slate-100 dark:bg-slate-900 rounded" />
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-red-800 dark:text-red-300">
            Authoritative Election Service Error
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={fetchElections}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : elections.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] space-y-3">
          <Vote className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            No elections are currently available.
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            There are currently no active or scheduled election contests assigned to your student cohort.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {elections.map((elec) => (
            <div
              key={elec.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">{elec.id}</span>
                  <StateBadge state={elec.state} />
                </div>
                <h2 className="text-base font-bold text-[#10233F] dark:text-white">
                  {elec.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {elec.contest}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex items-center justify-between">
                <Link
                  href={elec.state === "OPEN" ? `/student/elections/${elec.id}/cast` : `/student/elections/${elec.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline"
                >
                  <span>{elec.state === "OPEN" ? "Enter Voting Booth" : "Inspect Details"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
