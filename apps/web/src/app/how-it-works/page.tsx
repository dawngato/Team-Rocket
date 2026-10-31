"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const verificationStages = [
    {
      step: 1,
      shortTitle: "Booth Check-In",
      title: "1. Roll Number & College ID Verification",
      icon: Smartphone,
      tag: "Step 1: In The Student Booth",
      summary: "You prove you are an eligible enrolled student, but your personal ID is never attached to your ballot.",
      plainStory:
        "Jab aap voting booth open karte ho, system sirf ye verify karta hai ki aap college ke valid student ho ya nahi. Jaise hi verification complete hoti hai, aapko ek private digital token mil jata hai.",
      bulletPoints: [
        "Roll number cross-referenced with official college enrollment roster.",
        "Non-ID photos (selfies, memes) are automatically rejected.",
        "Your student identity stops here : it is never sent to the voting box.",
      ],
      badge: "Zero Identity Leak",
    },
    {
      step: 2,
      shortTitle: "Secret Ballot",
      title: "2. The Digital Curtain (End-to-End Encryption)",
      icon: Lock,
      tag: "Step 2: Private Choice",
      summary: "Your vote is locked inside your browser before sending. Nobody can peek into your choice.",
      plainStory:
        "Aap screen par jis candidate ko select karte ho, wo phone/laptop ke andar hi ek digital lock me band ho jata hai. Wi-Fi router, college server admin, ya HOD koi bhi nahi dekh sakta aapne kiske naam par tap kiya.",
      bulletPoints: [
        "Client-side encryption locks candidate choice before leaving phone.",
        "University professors, database admins, and Wi-Fi sniffers see only random cipher numbers.",
        "No outside pressure or intimidation can reveal your pick.",
      ],
      badge: "100% Secret Choice",
    },
    {
      step: 3,
      shortTitle: "Identity Severed",
      title: "3. Tearing Off The Name Tag (Blind Credential)",
      icon: Stamp,
      tag: "Step 3: Anonymization Barrier",
      summary: "The supported protocol is designed to separate eligibility from the encrypted ballot before casting.",
      plainStory:
        "Jaise physical election me ballot paper ko fold karke dabba me daalte hain taaki kiska vote hai ye pata na chale, waise hi yahan software aapka Roll Number vote se alag kar deta hai. Dabba me sirf anonymous vote girta hai.",
      bulletPoints: [
        "A reviewed blind-credential protocol is required to separate eligibility from the encrypted ballot.",
        "The local development engine and deployment telemetry do not establish an absolute privacy guarantee.",
        "The casting service rejects reused credential nullifiers when the authoritative service is available.",
      ],
      badge: "Protocol dependent",
    },
    {
      step: 4,
      shortTitle: "Campus Witnesses",
      title: "4. Witness checkpoints",
      icon: Users,
      tag: "Step 4: Tamper Prevention",
      summary: "Configured witness services can sign checkpoints, but local witness custody is not independent by default.",
      plainStory:
        "College administration akele dabba handle nahi kar sakti. Student council, faculty observers, aur independent nodes har voting batch par digital signature karte hain. Agar ek bhi vote chupke se badla gaya, toh system turant alarm baja deta hai.",
      bulletPoints: [
        "Independent custody and pinned roots are required before witness signatures provide an external integrity check.",
        "The local ledger records append-only evidence, but database administrators remain within the local threat boundary.",
        "Offline verification can validate released evidence only when the verifier receives trusted keys out of band.",
      ],
      badge: "Evidence checkpoint",
    },
    {
      step: 5,
      shortTitle: "Personal Receipt",
      title: "5. Track Your Vote on Counting Day",
      icon: FileText,
      tag: "Step 5: Voter Verification",
      summary: "You walk away with an anonymous tracking slip. Verify that your vote was actually counted.",
      plainStory:
        "Vote daalte hi screen par ek anonymous receipt number aata hai (jaise courier ka tracking code). Result wale din aap apna receipt code enter karke check kar sakte ho ki aapka vote dabba me safely count hua ya nahi!",
      bulletPoints: [
        "Instant private receipt slip issued directly to voter screen.",
        "Verify your vote was included in the final tally without exposing candidate choice.",
        "If election committee manipulates count, your receipt proves the fraud publicly.",
      ],
      badge: "Verifiable by You",
    },
    {
      step: 6,
      shortTitle: "Honest Tally",
      title: "6. Transparent Counting & Certified Results",
      icon: BadgeCheck,
      tag: "Step 6: Certified Winner",
      summary: "When polls close, results are decrypted mathematically with verifiable margins.",
      plainStory:
        "5:00 PM par polls close hote hi mathematical counting hoti hai. Winner candidate, total margin, aur turnout breakdown sabhi students ke liye live board par public kar diya jata hai.",
      bulletPoints: [
        "Mathematical tally computation with public proof verification.",
        "Clear margin of victory, percentage turnout, and audit trail available to all.",
        "Complete democracy in broad daylight : no closed-door counting.",
      ],
      badge: "Public & Final",
    },
  ];

  const current = verificationStages[activeStep - 1];
  const CurrentIcon = current.icon;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
          <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Campus Democracy in Action</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          How Your Vote Stays 100% Fair & Secret
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          No complicated math lectures. Here is how HimVote protects your voice from teacher pressure, senior politics, and backroom rigging in 6 clean steps.
        </p>
      </div>

      {/* 6 Step Progress Selector */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {verificationStages.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStep === stage.step;
            return (
              <button
                key={stage.step}
                type="button"
                onClick={() => setActiveStep(stage.step)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isActive
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 shadow-md ring-2 ring-cyan-500/40"
                    : "border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400">
                    Step {stage.step}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-500" : "text-slate-400"}`} />
                </div>
                <span className="text-xs font-bold truncate mt-2">
                  {stage.shortTitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#0f1d30] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1E3352] pb-6">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <CurrentIcon className="size-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {current.tag}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#10233F] dark:text-white mt-1">
                  {current.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {current.summary}
                </p>
              </div>
            </div>

            <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold shrink-0">
              {current.badge}
            </span>
          </div>

          {/* Explanation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: In Plain Student Words */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-[#1E3352] space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="text-sm">📋</span>
                <span>Simple Student Explanation</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {current.plainStory}
              </p>
            </div>

            {/* Right: Technical Guarantee Without AI Jargon */}
            <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fairness & Security Guarantees</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {current.bulletPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Real Student Fears vs System Truth Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#0f1d30] shadow-sm overflow-hidden p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#10233F] dark:text-white">
            Common Campus Doubts vs. HimVote Truth
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Why you can cast your vote without worrying about consequences.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-4 py-3">Student's Real Doubt</th>
                <th scope="col" className="px-4 py-3">How We Stop It</th>
                <th scope="col" className="px-4 py-3">Proof For You</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              <tr>
                <td className="px-4 py-3.5 font-bold text-amber-500">"HOD ya Teacher dekh lenge maine kisko vote diya?"</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Vote phone ke andar lock hota hai aur roll number turant detach ho jata hai.</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">Zero record stored on server</td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-amber-500">"Seniors ya campus neta mere par pressure daalenge?"</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Aap kisi ke saamne smile karke bol sakte ho ki unhe vote diya : booth me sirf aapki marzi chalti hai.</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">100% private digital booth</td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-amber-500">"Mera vote counting me secretly delete toh nahi kar denge?"</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Har student ko ek secret digital tracking receipt milti hai. Counting wale din search karke dabba me apna vote check karo.</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">Individual tracking receipt</td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-amber-500">"Election Committee fake votes daal kar result badal degi?"</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Multiple student & faculty witnesses har batch par digital co-sign karte hain. Koi akela result manipulate nahi kar sakta.</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">Multi-witness co-signature</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-[#10233F]/40 border border-cyan-500/25">
        <div>
          <h3 className="font-extrabold text-base text-white">
            Ready to Cast Your Honest Vote?
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Check active elections, review candidate manifestos, and exercise your power.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/elections"
            className="px-5 py-2.5 font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all text-xs flex items-center gap-2 shadow-md"
          >
            <span>Explore Active Elections</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/results"
            className="px-4 py-2.5 font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 rounded-xl transition-colors text-xs"
          >
            <span>Live Results</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
