"use client";

import { IdCard, ShieldAlert } from "lucide-react";

/**
 * An ID-card image is not an identity proof. The authoritative roster and
 * identity issuer are the only sources that can grant voting eligibility.
 */
export function StudentIdCardVerifier() {
  return <section className="w-full rounded-2xl border border-amber-300/50 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10"><div className="flex items-start gap-3"><IdCard className="mt-0.5 size-5 text-amber-700 dark:text-amber-300" aria-hidden="true" /><div><h2 className="font-bold text-amber-900 dark:text-amber-200">Student ID images do not verify eligibility</h2><p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-100">HimVote does not grant access from an uploaded image, filename, roll-number format, or browser-generated token. Contact your department roster officer to verify an authoritative enrollment record.</p><p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200"><ShieldAlert className="size-4" aria-hidden="true" /> No voting credential is created by this component.</p></div></div></section>;
}
