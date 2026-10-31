"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  EyeOff,
  Stamp,
  Users,
  Search,
  Smartphone,
  FileText,
  BadgeCheck,
  Cpu,
  GitBranch,
  KeyRound,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Hash,
  Binary,
  Layers,
  HelpCircle,
  AlertCircle,
  FileCode,
  Sparkles,
} from "lucide-react";

interface StageSpecification {
  step: number;
  shortTitle: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  studentExplanation: string;
  technicalDescription: string;
  evidenceAvailable: string[];
  assumptionsAndLimitations: string[];
  protocolFormula?: string;
}

const VERIFICATION_STAGES: StageSpecification[] = [
  {
    step: 1,
    shortTitle: "Eligibility Check",
    title: "1. Check Student Eligibility",
    subtitle: "Requires a configured institutional identity service",
    badge: "Service-dependent",
    icon: Smartphone,
    tag: "Stage 01: Eligibility",
    studentExplanation:
      "The intended flow checks whether a student may take part in an election. This walkthrough does not contact a campus roster or make an eligibility decision.",
    technicalDescription:
      "A live deployment must identify its roster source, define the issuer's role, and record an auditable eligibility response. The prototype walkthrough does not query a campus directory.",
    evidenceAvailable: [
      "The roster source and the date of its snapshot",
      "The configured eligibility service response and issuer identity",
      "An independently reviewable record of the eligibility decision",
    ],
    assumptionsAndLimitations: [
      "The institution must confirm roster accuracy and access controls.",
      "This page does not authenticate a student or issue an eligibility ticket.",
    ],
  },
  {
    step: 2,
    shortTitle: "Ballot Encryption",
    title: "2. Prepare and Protect a Ballot",
    subtitle: "Depends on the deployed client and key management",
    badge: "Implementation-dependent",
    icon: Lock,
    tag: "Stage 02: Ballot Protection",
    studentExplanation:
      "The intended flow protects a ballot before transmission. This walkthrough does not encrypt a selection, create a proof, or submit a ballot.",
    technicalDescription:
      "A release must document the encryption algorithm, public-key distribution, validation rules, and server-side handling. Review the deployed client and service code to confirm which protections are active.",
    evidenceAvailable: [
      "The deployed client and server versions",
      "The election public key and its trusted distribution method",
      "A verifiable record of the ballot validation procedure",
    ],
    assumptionsAndLimitations: [
      "Encryption does not protect a compromised device or prevent coercion.",
      "This page produces no ciphertext or validity proof.",
    ],
  },
  {
    step: 3,
    shortTitle: "Credential Separation",
    title: "3. Separate Eligibility from Ballot Activity",
    subtitle: "Requires a reviewed and deployed blind-credential protocol",
    badge: "Protocol-dependent",
    icon: Stamp,
    tag: "Stage 03: Credential Flow",
    studentExplanation:
      "A blind-credential protocol can separate an eligibility check from a ballot when it is correctly implemented. This walkthrough does not issue or verify a credential.",
    technicalDescription:
      "The issuer, client, and casting service must implement the same reviewed protocol and bind credentials to the election. Operators must also assess network timing and the records available to each service.",
    evidenceAvailable: [
      "The deployed credential protocol and its implementation",
      "Issuer and casting service logs that can be reviewed for data separation",
      "A documented threat model covering timing and operator access",
    ],
    assumptionsAndLimitations: [
      "Separate services alone do not prove that identity and ballot activity cannot be linked.",
      "The walkthrough does not establish anonymity or prevent collusion.",
    ],
  },
  {
    step: 4,
    shortTitle: "Witness Checkpoints",
    title: "4. Publish and Review Checkpoints",
    subtitle: "Requires configured witnesses and an authenticated chain deployment",
    badge: "Configuration-dependent",
    icon: Users,
    tag: "Stage 04: Checkpoint Evidence",
    studentExplanation:
      "Witnesses can sign checkpoints when they are configured and operated. A blockchain transaction can provide additional evidence after the relayer and contract are configured.",
    technicalDescription:
      "Review the signed checkpoint, the pinned witness key, and the chain transaction against trusted values. Running a witness and relayer in one local deployment does not establish independent custody.",
    evidenceAvailable: [
      "A signed checkpoint and its verified digest",
      "A witness key pinned through an independently trusted process",
      "A confirmed transaction for the expected chain and contract",
    ],
    assumptionsAndLimitations: [
      "The local demo does not prove witness independence or chain finality.",
      "Anchoring requires an RPC endpoint, deployed contract, signer, permissions, and election commitment mapping.",
    ],
  },
  {
    step: 5,
    shortTitle: "Receipt Review",
    title: "5. Check Ballot Inclusion",
    subtitle: "Requires a published proof and trusted checkpoint root",
    badge: "Evidence-dependent",
    icon: FileText,
    tag: "Stage 05: Receipt Review",
    studentExplanation:
      "A receipt may help check whether a ballot appears in published evidence. This walkthrough does not verify a receipt or prove that a ballot was counted correctly.",
    technicalDescription:
      "An inclusion check requires a proof tied to a checkpoint root whose authenticity has been established separately. A receipt alone does not prove ballot secrecy or tally correctness.",
    evidenceAvailable: [
      "The receipt and its inclusion proof",
      "The matching published checkpoint",
      "A verifier that checks the proof against an authenticated root",
    ],
    assumptionsAndLimitations: [
      "Evidence must be retained and made available to voters.",
      "The page does not query a live receipt service or validate a proof.",
    ],
  },
  {
    step: 6,
    shortTitle: "Results and Audit",
    title: "6. Review Results and Audit Evidence",
    subtitle: "Requires a defined tally and independent verification process",
    badge: "Verification-dependent",
    icon: BadgeCheck,
    tag: "Stage 06: Results",
    studentExplanation:
      "A displayed result is a report from a service. Independent review requires the inputs, verification rules, and trusted evidence needed to reproduce or check the tally.",
    technicalDescription:
      "The deployment must publish its tally method, relevant inputs, proof package, and verifier. This walkthrough does not compute a tally, validate a proof package, or certify an outcome.",
    evidenceAvailable: [
      "Published result data and the rules used to calculate it",
      "The checkpoint and ballot evidence used by the tally",
      "Independent verifier output and a documented certification process",
    ],
    assumptionsAndLimitations: [
      "An interface status does not establish that a tally is correct.",
      "Completeness depends on the source data and the independent review process.",
    ],
  },
];

interface FAQItem {
  question: string;
  formalConcern: string;
  mitigation: string;
  verificationEvidence: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Does this page verify that my vote is anonymous?",
    formalConcern:
      "Voters need to know whether their identity can be linked to ballot activity.",
    mitigation:
      "This page does not verify anonymity. A live deployment needs a reviewed credential protocol, separated service records, and an assessment of network and operator access.",
    verificationEvidence:
      "Review the deployed client, identity and casting service data flows, logs, credential protocol, and independent security assessment.",
  },
  {
    question: "Does this walkthrough check my enrollment?",
    formalConcern:
      "A student should know whether an eligibility result came from an authoritative roster.",
    mitigation:
      "No. The walkthrough does not contact an enrollment roster or issue a voting credential. A live eligibility decision must come from the institution's configured service.",
    verificationEvidence:
      "Confirm the roster source, service endpoint, issuer identity, and auditable response for the deployed election.",
  },
  {
    question: "Is a ballot encrypted when I click through the stages?",
    formalConcern:
      "A demonstration should not imply that a real ballot or cryptographic proof was created.",
    mitigation:
      "No ballot is encrypted or submitted by this page. The deployed voting client and its key configuration determine whether encryption is active.",
    verificationEvidence:
      "Inspect the deployed client and server code, public-key distribution, and actual ballot request before relying on encryption claims.",
  },
  {
    question: "Are the witnesses independent?",
    formalConcern:
      "A witness signature is useful only if the key and its operator can be trusted.",
    mitigation:
      "A signature does not establish operational independence. The institution must document who controls each witness, where it runs, and how its key is pinned.",
    verificationEvidence:
      "Review witness ownership, infrastructure, key custody, signed checkpoint history, and the out-of-band trust process.",
  },
  {
    question: "Does a receipt prove that the final result is correct?",
    formalConcern:
      "Voters may mistake ballot inclusion evidence for a verified tally.",
    mitigation:
      "No. A receipt can support an inclusion check when a matching proof and authenticated root are available. Tally correctness requires separate evidence and review.",
    verificationEvidence:
      "Check the inclusion proof and root, then review the tally inputs, calculation method, proof package, and independent verifier output.",
  },
  {
    question: "Has a result been anchored and confirmed on a blockchain?",
    formalConcern:
      "A configured integration path is different from a confirmed transaction.",
    mitigation:
      "This walkthrough does not submit or verify a blockchain transaction. Anchoring requires a configured RPC endpoint, deployed contract, relayer signer, permissions, and election commitment mapping.",
    verificationEvidence:
      "Verify the transaction receipt, chain ID, contract address, committed value, and confirmation depth using trusted chain data.",
  },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(0);

  const currentStage = VERIFICATION_STAGES[activeStep - 1];
  const CurrentIcon = currentStage.icon;

  return (
    <div className="w-full max-w-[1850px] mx-auto py-12 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-12">
      {/* Institutional Top Header */}
      <header className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25">
          <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          <span>Prototype Workflow Overview</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          How the HimVote Election Workflow Is Designed
        </h1>

        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl mx-auto">
          HimVote demonstrates campus election workflows and evidence views. Available privacy and verification protections depend on deployed clients, services, configuration, and independently trusted evidence.
        </p>

        {/* High-level design areas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-left">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10233F] dark:text-white">
              <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>Cryptographic Integrity Checks</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Ballot encryption and validity checks depend on the deployed client and server implementation.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10233F] dark:text-white">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Tamper-Evident Ledger</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Merkle checkpoints can support integrity checks when proofs and trusted roots are available.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10233F] dark:text-white">
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>Multi-Witness Notarization</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Configured witnesses can sign checkpoints. Their operational independence must be established separately.
            </p>
          </div>
        </div>
      </header>

      {/* 6-Stage Interactive Step Navigation */}
      <section className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VERIFICATION_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStep === stage.step;
            return (
              <button
                key={stage.step}
                type="button"
                onClick={() => setActiveStep(stage.step)}
                className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between overflow-hidden ${
                  isActive
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-300 shadow-md ring-2 ring-cyan-500/30 bg-cyan-500/10"
                    : "border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
                aria-pressed={isActive}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeStep"
                    className="absolute inset-0 bg-cyan-500/10 dark:bg-cyan-500/15 border-2 border-cyan-500 rounded-2xl pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Stage {stage.step}
                  </span>
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"
                    }`}
                  />
                </div>
                <div className="relative z-10 mt-3">
                  <p className="text-xs font-bold leading-tight">
                    {stage.shortTitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Animated Active Stage Detailed Exploration Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#0f1d30] shadow-sm space-y-8"
          >
            {/* Stage Title and Status Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1E3352] pb-6">
              <div className="flex items-start gap-4">
                <div className="size-14 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
                  <CurrentIcon className="size-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-mono">
                    {currentStage.tag}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#10233F] dark:text-white mt-0.5">
                    {currentStage.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {currentStage.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                  <span>{currentStage.badge}</span>
                </span>
                {currentStage.protocolFormula && (
                  <span className="hidden xl:inline-block px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-[#1E3352] font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {currentStage.protocolFormula}
                  </span>
                )}
              </div>
            </div>

            {/* 4 Dedicated Deep-Dive Quadrants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quadrant 1: Student-Friendly Overview */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-[#1E3352] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Student-Friendly Overview</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {currentStage.studentExplanation}
                </p>
              </div>

              {/* Quadrant 2: Technical & Cryptographic Description */}
              <div className="p-5 sm:p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Technical & Cryptographic Specification</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {currentStage.technicalDescription}
                </p>
              </div>

              {/* Quadrant 3: Evidence to Review */}
              <div className="p-5 sm:p-6 rounded-2xl bg-emerald-950/15 border border-emerald-500/25 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Evidence to Review</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {currentStage.evidenceAvailable.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quadrant 4: Assumptions, Boundaries & Limitations */}
              <div className="p-5 sm:p-6 rounded-2xl bg-amber-950/15 border border-amber-500/25 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Assumptions, Boundaries & Limitations</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {currentStage.assumptionsAndLimitations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold shrink-0">⚠</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              role="note"
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <Sparkles className="size-4" aria-hidden="true" />
                <span>Walkthrough Scope</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                This page is an instructional overview. It does not query student records, issue credentials,
                encrypt or submit ballots, contact witnesses, verify proofs, calculate results, or send
                blockchain transactions. Use configured services and independent evidence to verify those operations.
              </p>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#1E3352]">
              <button
                type="button"
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E3352] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous Stage
              </button>

              <span className="text-xs font-mono text-slate-400">
                Stage {activeStep} of {VERIFICATION_STAGES.length}
              </span>

              <button
                type="button"
                disabled={activeStep === VERIFICATION_STAGES.length}
                onClick={() => setActiveStep((prev) => Math.min(VERIFICATION_STAGES.length, prev + 1))}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Next Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Interactive FAQ Matrix: Student Concerns in Formal English */}
      <section className="rounded-3xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#0f1d30] shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-mono mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Interactive Governance & Security Matrix</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#10233F] dark:text-white">
            Frequently Addressed Security & Privacy Inquiries
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            These answers distinguish intended design from protections that require deployment evidence.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = selectedFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-[#1E3352] overflow-hidden transition-all bg-slate-50/50 dark:bg-slate-900/40"
              >
                <button
                  type="button"
                  onClick={() => setSelectedFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-sm font-bold text-[#10233F] dark:text-white">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-cyan-500" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-200 dark:border-[#1E3352] space-y-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono text-[10px] block mb-1">
                          Underlying Student Concern:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {item.formalConcern}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-950/30 border border-cyan-500/20">
                        <span className="font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider font-mono text-[10px] block mb-1">
                          Design Considerations:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                          {item.mitigation}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/25">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono text-[10px] block mb-1">
                          Evidence to Review:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-mono text-[11px]">
                          {item.verificationEvidence}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Navigational CTA Section */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-[#10233F]/40 border border-cyan-500/25 shadow-lg">
        <div className="space-y-1">
          <h3 className="font-extrabold text-lg text-white">
            Inspect the Public Cryptographic Evidence
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Review evidence fields returned by configured services. This explorer does not independently verify every signature, chain transaction, or tally.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/audit"
            className="px-5 py-2.5 font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all text-xs flex items-center gap-2 shadow-md"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Open Audit Explorer</span>
          </Link>
          <Link
            href="/elections"
            className="px-4 py-2.5 font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 rounded-xl transition-colors text-xs"
          >
            <span>Active Campus Contests</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
