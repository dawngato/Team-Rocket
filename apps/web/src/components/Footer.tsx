"use client";

import React from "react";
import Link from "next/link";
import { Vote, Shield, Lock, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#10233F] transition-colors py-12 px-4 sm:px-6 lg:px-8 text-sm">
      <div className="w-full max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-[#10233F] dark:text-white">
            <span className="w-7 h-7 rounded-lg bg-[#157E92] flex items-center justify-center text-white">
              <Vote className="w-4 h-4" aria-hidden="true" />
            </span>
            <span>HimVote</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
            Institutional campus election platform for inspectable workflows, cryptographic evidence review, and strict boundary controls.
          </p>
          <div className="text-xs text-slate-500 dark:text-slate-500">
            Accessibility support is implemented in the tested web scope. Platform audits remain in progress.
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-3">
            Public Audits
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/audit" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Public Audit Explorer
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Verification Architecture
              </Link>
            </li>
            <li>
              <Link href="/results" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Published Results
              </Link>
            </li>
            <li>
              <Link href="/security-limits" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Security Limits and Assumptions
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-3">
            Institutional Portals
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/student/elections" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Student Voting Portal
              </Link>
            </li>
            <li>
              <Link href="/teacher/verification-queue" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Teacher Verification Queue
              </Link>
            </li>
            <li>
              <Link href="/officer/create" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Election Officer Desk
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Administrative Console
              </Link>
            </li>
            <li>
              <Link href="/super-admin" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Super Administrator
              </Link>
            </li>
            <li>
              <Link href="/auditor" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Independent Auditor Workspace
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-3">
            Standards and Compliance
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/accessibility" className="text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-[#38BDF8] transition-colors">
                Accessibility Statement
              </Link>
            </li>
            <li>
              <span className="text-slate-500 dark:text-slate-500 text-xs block">
                Languages: English and Hindi
              </span>
            </li>
            <li>
              <span className="text-slate-500 dark:text-slate-500 text-xs block">
                Zero third party tracking cookies
              </span>
            </li>
            <li>
              <span className="text-slate-500 dark:text-slate-500 text-xs block">
                Separate Identity and Casting Origins
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="w-full max-w-[1800px] mx-auto mt-10 pt-6 border-t border-slate-200 dark:border-[#1E3352] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-500">
        <div>HimVote Institutional Election System. Open Standards Verification.</div>
        <div className="mt-2 sm:mt-0">All cryptographic proofs reproducible offline.</div>
      </div>
    </footer>
  );
}
