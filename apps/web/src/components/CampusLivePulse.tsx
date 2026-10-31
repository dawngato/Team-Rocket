"use client";

import { ShieldAlert } from "lucide-react";

/** Deprecated: live activity must come from a server-backed aggregate feed. */
export function CampusLivePulse() {
  return <div className="rounded-2xl border border-amber-300/50 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><ShieldAlert className="mr-2 inline size-4" aria-hidden="true" />Live campus activity is unavailable until an authoritative aggregate feed is configured.</div>;
}
