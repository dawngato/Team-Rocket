import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileText, HelpCircle, Lock, Server, ShieldCheck, Users } from "lucide-react";

const scopeSections = [
  {
    title: "Accounts and eligibility",
    icon: Users,
    body: "Account roles and election information are returned by configured services. This prototype does not independently confirm enrollment or determine whether a person is eligible for a specific ballot. The organization operating a deployment must publish its eligibility rules and review process.",
  },
  {
    title: "Ballot handling and privacy",
    icon: Lock,
    body: "Do not submit a real ballot or sensitive personal information through an unapproved deployment. The interface alone cannot establish that identity and ballot records are unlinkable, that every ballot is encrypted as intended, or that a receipt reveals no information about a selection. Those properties require review of the deployed protocol, services, keys, and data handling.",
  },
  {
    title: "Service responses and evidence",
    icon: Server,
    body: "Election states, receipt statuses, results, witness records, and blockchain references shown by the application are service-reported unless a separate verifier explicitly checks them. A displayed value, signature field, transaction hash, or digest is not independent proof of correctness or finality.",
  },
  {
    title: "Availability and disputes",
    icon: ShieldCheck,
    body: "The prototype does not promise service availability, successful ballot delivery, chain finality, or a particular dispute deadline. The organization operating any real election must provide an approved policy for outages, recounts, challenges, retention, and support before voting begins.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 rounded text-sm font-semibold text-[#157E92] transition-colors hover:text-[#0f5b69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        <span>Return to home</span>
      </Link>

      <header className="space-y-3 border-b border-slate-200 pb-7 dark:border-[#1E2E42]">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Prototype notice
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white sm:text-4xl">
          Terms and Operational Scope
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          This page describes the current software prototype. It is not an approved institutional election policy, legal agreement, or certification of the services connected to this interface.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 text-sm text-slate-700 dark:text-slate-300" aria-labelledby="prototype-limit-title">
        <h2 id="prototype-limit-title" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <FileText className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          Before using a deployment
        </h2>
        <p className="leading-relaxed">
          Do not rely on this interface for a real election until the deployment owner has configured and independently reviewed the identity service, ballot services, witness trust keys, blockchain network, and contract. The organization must publish its own approved terms, privacy notice, election rules, retention periods, and contact details.
        </p>
      </section>

      <div className="space-y-6">
        {scopeSections.map(({ title, icon: Icon, body }) => (
          <section key={title} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#1E2E42] dark:bg-[#132135]">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F172A] dark:text-white">
              <Icon className="size-5 text-[#157E92] dark:text-cyan-400" aria-hidden="true" />
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
          </section>
        ))}
      </div>

      <section className="space-y-2 border-t border-slate-200 pt-6 dark:border-[#1E2E42]">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#0F172A] dark:text-white">
          <HelpCircle className="size-4 text-[#157E92] dark:text-cyan-400" aria-hidden="true" />
          Questions and official policies
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          No institutional contact details or election deadlines are configured in this prototype. Contact the organization responsible for the deployment for approved policies and support information.
        </p>
      </section>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-sm dark:border-[#1E2E42]" aria-label="Related policies">
        <Link href="/privacy" className="font-semibold text-[#157E92] underline-offset-4 hover:underline dark:text-cyan-400">Privacy notice</Link>
        <Link href="/security-limits" className="font-semibold text-[#157E92] underline-offset-4 hover:underline dark:text-cyan-400">Security limits</Link>
        <Link href="/accessibility" className="font-semibold text-[#157E92] underline-offset-4 hover:underline dark:text-cyan-400">Accessibility</Link>
      </nav>
    </main>
  );
}
