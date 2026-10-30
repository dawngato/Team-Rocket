export default function SecurityLimitsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#17233B] dark:text-white mb-2">Security limits</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">HimVote reports what its verifier confirmed. It does not claim to be unhackable or completely anonymous.</p>

      <div className="space-y-4">
        {[
          { label: "Coercion", detail: "The system cannot prevent a voter from being coerced outside the booth." },
          { label: "Compromised devices", detail: "A compromised phone or computer can leak credentials or selections." },
          { label: "Timing correlation", detail: "Network timing could theoretically link a voter to a ballot in small electorates." },
          { label: "Collusion of all authorities", detail: "If issuer, witness, and auditor collude, some guarantees are weakened." },
          { label: "Small electorates", detail: "Results for very small groups are marked PRIVACY_LIMITED and detail suppressed." },
          { label: "Stolen credentials", detail: "A stolen credential with the voter's authentication can cast a ballot." },
        ].map((item) => (
          <div key={item.label} className="flex gap-4 p-4 bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl">
            <span className="text-red-600 dark:text-red-400 font-bold">{item.label}</span>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}