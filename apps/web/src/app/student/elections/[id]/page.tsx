"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Vote, Clock, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

export default function StudentElectionDetailPage() {
  const params = useParams();
  const electionId = typeof params?.id === "string" ? params.id : "";
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchElection = async () => {
    if (!electionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await electionClient.getElection(electionId);
      setElection(data);
      setError(null);
    } catch (err: unknown) {
      setElection(null);
      setError(err instanceof Error ? err.message : "The authoritative election manifest could not be retrieved.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchElection();
  }, [electionId]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <nav className="flex gap-2 overflow-x-auto pb-2">
        <Link
          href="/student/elections"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to elections</span>
        </Link>
      </nav>

      {loading ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded" />
        </div>
      ) : error || !election ? (
        <div className="p-8 text-center rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-red-800 dark:text-red-300">
            Authoritative Manifest Unavailable
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error || "The requested election does not exist or cannot be validated against the server manifest."}
          </p>
          <button
            onClick={fetchElection}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">{election.id}</span>
            <StateBadge state={election.state} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#10233F] dark:text-white">
              {election.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {election.contest}
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#0E1A2B] rounded-xl border border-slate-100 dark:border-[#1E3352] text-xs space-y-2 font-mono">
            <div>
              <span className="text-slate-400">Manifest Digest: </span>
              <span className="text-slate-800 dark:text-slate-200 break-all">{election.manifest_digest || "Unsealed"}</span>
            </div>
            <div>
              <span className="text-slate-400">Polls Close: </span>
              <span className="text-slate-800 dark:text-slate-200">{election.closes_at_utc ? new Date(election.closes_at_utc).toLocaleString() : "TBD"}</span>
            </div>
          </div>

          {election.state === "OPEN" ? (
            <Link
              href={`/student/elections/${election.id}/cast`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#157E92] hover:bg-[#116676] text-white font-bold text-sm shadow-sm transition"
            >
              <Vote className="w-4 h-4" />
              <span>Enter Private Voting Booth</span>
            </Link>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Polling is not currently open for this election.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
