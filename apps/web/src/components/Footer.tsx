"use client";

import React from "react";
import Link from "next/link";
import { Vote, Shield, Lock, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="apple-footer w-full py-14 px-5 sm:px-8 text-sm">
      <div className="w-full max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <div className="apple-brand">
            <span className="apple-brand-mark">
              <Vote className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span>HimVote</span>
          </div>
          <p className="text-[#6e6e73] dark:text-[#a1a1a6] text-xs leading-relaxed">
            Institutional campus election platform for inspectable workflows, cryptographic evidence review, and strict boundary controls.
          </p>
          <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
            Accessibility support is implemented in the tested web scope. Platform audits remain in progress.
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-xs tracking-wider uppercase text-[#6e6e73] dark:text-[#a1a1a6] mb-3">
            Public Audits
          </h3>
          <ul className="flex flex-col gap-2">
            <li>
                <Link href="/audit" className="apple-footer-link">
                Public Audit Explorer
              </Link>
            </li>
            <li>
                <Link href="/how-it-works" className="apple-footer-link">
                Verification Architecture
              </Link>
            </li>
            <li>
                <Link href="/results" className="apple-footer-link">
                Published Results
              </Link>
            </li>
            <li>
                <Link href="/security-limits" className="apple-footer-link">
                Security Limits and Assumptions
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-xs tracking-wider uppercase text-[#6e6e73] dark:text-[#a1a1a6] mb-3">
            Institutional Portals
          </h3>
          <ul className="flex flex-col gap-2">
            <li>
                <Link href="/student/elections" className="apple-footer-link">
                Student Voting Portal
              </Link>
            </li>
            <li>
                <Link href="/teacher/verification-queue" className="apple-footer-link">
                Teacher Verification Queue
              </Link>
            </li>
            <li>
                <Link href="/officer/create" className="apple-footer-link">
                Election Officer Desk
              </Link>
            </li>
            <li>
                <Link href="/admin" className="apple-footer-link">
                Administrative Console
              </Link>
            </li>
            <li>
                <Link href="/super-admin" className="apple-footer-link">
                Super Administrator
              </Link>
            </li>
            <li>
                <Link href="/auditor" className="apple-footer-link">
                Independent Auditor Workspace
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-xs tracking-wider uppercase text-[#6e6e73] dark:text-[#a1a1a6] mb-3">
            Standards and Compliance
          </h3>
          <ul className="flex flex-col gap-2">
            <li>
                <Link href="/accessibility" className="apple-footer-link">
                Accessibility Statement
              </Link>
            </li>
            <li>
                <span className="text-[#6e6e73] dark:text-[#a1a1a6] text-xs block">
                Languages: English and Hindi
              </span>
            </li>
            <li>
                <span className="text-[#6e6e73] dark:text-[#a1a1a6] text-xs block">
                Zero third party tracking cookies
              </span>
            </li>
            <li>
                <span className="text-[#6e6e73] dark:text-[#a1a1a6] text-xs block">
                Separate Identity and Casting Origins
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="w-full max-w-[1280px] mx-auto mt-12 pt-6 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
        <div>HimVote Institutional Election System. Open Standards Verification.</div>
        <div className="mt-2 sm:mt-0">All cryptographic proofs reproducible offline.</div>
      </div>
    </footer>
  );
}
