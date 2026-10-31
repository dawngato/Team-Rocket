"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Shield,
  Eye,
  Keyboard,
  Contrast,
  Volume2,
  Sparkles,
  Smartphone,
  HelpCircle,
  FileCheck2,
  ArrowLeft,
  Scale,
  Monitor,
  HeartHandshake,
} from "lucide-react";

export default function AccessibilityStatementPage() {
  const compliancePillars = [
    {
      title: "1. Perceivable",
      subtitle: "Information and user interface components must be presentable to users in ways they can perceive.",
      icon: Eye,
      points: [
        {
          name: "Strict Contrast Ratios (WCAG 1.4.3 & 1.4.11)",
          detail:
            "Text and images of text maintain a minimum contrast ratio of 4.5:1 against backgrounds, and 3:1 for large text and critical UI boundaries across both dark and light institutional themes.",
        },
        {
          name: "Comprehensive Text Alternatives (WCAG 1.1.1)",
          detail:
            "All informational iconography, candidate portraits, institutional badges, and Merkle tree diagrams include descriptive alternative text. Purely decorative elements are explicitly marked with aria-hidden='true'.",
        },
        {
          name: "Non-Reliance on Color Alone (WCAG 1.4.1)",
          detail:
            "Color is never used as the sole visual means of conveying information, indicating an action, prompting a response, or distinguishing a verification state. All statuses combine color with text labels and distinct geometric iconography.",
        },
        {
          name: "Responsive 200% Zoom & Text Scaling (WCAG 1.4.4 & 1.4.10)",
          detail:
            "Content can be enlarged up to 200% without loss of content, clipped text, or requiring horizontal scrolling on standard desktop and tablet viewports.",
        },
      ],
    },
    {
      title: "2. Operable",
      subtitle: "User interface components and navigation must be fully operable via keyboard and assistive hardware.",
      icon: Keyboard,
      points: [
        {
          name: "100% Keyboard Operability (WCAG 2.1.1 & 2.1.2)",
          detail:
            "Every interactive element—including navigation menus, candidate selection radios, modal dialogs, and offline receipt downloads—is fully navigable using standard Tab, Shift+Tab, Enter, Space, and Arrow keys, with zero keyboard traps.",
        },
        {
          name: "High-Visibility Focus Indicators (WCAG 2.4.7)",
          detail:
            "All interactive controls feature distinct, high-contrast focus rings (focus-visible:ring-2 focus-visible:ring-cyan-500) to ensure clear tracking for keyboard-only users.",
        },
        {
          name: "Generous 44×44px Touch Targets (WCAG 2.5.5)",
          detail:
            "Interactive controls, touch inputs, and menu buttons meet or exceed the 44×44 CSS pixel target dimension to prevent accidental presses on touch devices and assist motor-impaired voters.",
        },
        {
          name: "Reduced Motion Support (WCAG 2.2.2 & 2.3.3)",
          detail:
            "The platform strictly honors operating system prefers-reduced-motion settings. Non-essential motion, floating animations, and slide-in drawer transitions are replaced with instantaneous or gentle cross-fades.",
        },
      ],
    },
    {
      title: "3. Understandable",
      subtitle: "Information and the operation of the user interface must be understandable and predictable.",
      icon: Contrast,
      points: [
        {
          name: "Predictable Navigation & Consistency (WCAG 3.2.3 & 3.2.4)",
          detail:
            "Navigation mechanisms, action bars, and status cards appear in consistent order and behavioral patterns across all pages.",
        },
        {
          name: "Contextual Error Identification (WCAG 3.3.1 & 3.3.3)",
          detail:
            "Input errors during authentication, roll lookups, or ballot sealing are explicitly identified, described in plain text, and accompanied by actionable suggestions for resolution.",
        },
        {
          name: "Accessible Form Labels & ARIA Live Announcements (WCAG 3.3.2 & 4.1.3)",
          detail:
            "All form inputs feature permanent, explicitly associated labels and descriptive helper text. Dynamic state updates (such as consensus verification progress) utilize ARIA live regions (aria-live='polite').",
        },
      ],
    },
    {
      title: "4. Robust",
      subtitle: "Content must be robust enough that it can be interpreted reliably by a wide variety of user agents and assistive technologies.",
      icon: Monitor,
      points: [
        {
          name: "Semantic HTML5 Architecture (WCAG 4.1.1 & 4.1.2)",
          detail:
            "Pages are structured using native semantic elements (<header>, <nav>, <main>, <section>, <article>, <footer>) providing logical landmark navigation for screen reader users.",
        },
        {
          name: "WAI-ARIA 1.2 Compliance",
          detail:
            "Custom widgets, dropdown menus, and disclosures conform strictly to W3C WAI-ARIA authoring patterns, including proper aria-expanded, aria-controls, and role attributes.",
        },
        {
          name: "Cross-Platform Assistive Tech Verification",
          detail:
            "The interface is continually tested against industry-standard screen readers: NVDA and JAWS on Windows, VoiceOver on macOS and iOS, and TalkBack on Android.",
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Back to Home Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#157E92] hover:text-[#0f5b69] dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Return to Institutional Home</span>
      </Link>

      {/* Header Banner */}
      <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-cyan-500/20">
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span>Universal Access Standard</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          Accessibility Statement &amp; WCAG 2.1 AA Commitment
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          HimVote is committed to ensuring digital accessibility for all students, faculty, staff, and campus community members,
          including individuals with visual, auditory, motor, speech, and cognitive disabilities. We consider universal accessibility
          a non-negotiable security requirement: an election system that cannot be used independently and privately by all voters
          fails its fundamental democratic mission.
        </p>
      </div>

      {/* Institutional Conformance Statement Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#10233F] to-[#0A1627] text-white space-y-3 shadow-lg border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            <Shield className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>Formal Conformance Target: WCAG 2.1 Level AA</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
            Institutional Audit Standard
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          This digital platform adheres to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA,
          established by the World Wide Web Consortium (W3C). These guidelines define requirements for making web content
          more accessible to people with disabilities and more usable for everyone.
        </p>
      </div>

      {/* Detailed Compliance Pillars */}
      <div className="space-y-8">
        {compliancePillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-[#157E92] dark:text-cyan-400 shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
                    {pillar.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {pillar.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {pillar.points.map((point) => (
                  <div
                    key={point.name}
                    className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{point.name}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
                      {point.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Physical Kiosk & In-Person Accommodations */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/70 dark:bg-[#0E1A2B] space-y-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <HeartHandshake className="w-4 h-4 text-[#157E92] dark:text-cyan-400" />
          <span>Physical Campus Kiosk Accommodations &amp; Alternate Formats</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          For students and staff requiring specialized physical hardware, campus polling stations provide wheelchair-accessible
          voting kiosks equipped with high-contrast tactile keypads, audio ballot narration via 3.5mm stereo headphone jacks,
          and adjustable-height display mounts. Large-print and Braille ballot verification instructions are available at all
          designated student union polling locations upon request.
        </p>
      </div>

      {/* Assistance, Feedback & Contact Office */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-base text-[#10233F] dark:text-white">
          <HelpCircle className="w-5 h-5 text-[#157E92] dark:text-cyan-400" />
          <span>Accessibility Assistance, Feedback &amp; Remediation Process</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          We welcome feedback on the accessibility of HimVote. If you experience an accessibility barrier or require an
          alternate accommodation while verifying credentials, reviewing candidates, casting a ballot, or inspecting cryptographic receipts,
          please contact our institutional accessibility coordinator:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              Office of Student Disability &amp; Accessibility Services
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Campus Administrative Block, Ground Floor, Room 104
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Email: <span className="font-mono text-cyan-600 dark:text-cyan-400">accessibility@himvote.hptu.ac.in</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              Remediation &amp; Response Timeline
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Inquiries and barrier reports are acknowledged within <strong>1 business day</strong>.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Emergency voting assistance is available continuously during active election polling windows.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-6 border-t border-slate-200 dark:border-[#1E3352] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>Reviewed &amp; Certified under WCAG 2.1 AA • Academic Year 2026</span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-cyan-600 dark:hover:text-cyan-400 underline">
            Terms of Service
          </Link>
          <Link href="/security-limits" className="hover:text-cyan-600 dark:hover:text-cyan-400 underline">
            Cryptographic Security Boundaries
          </Link>
        </div>
      </div>
    </div>
  );
}
