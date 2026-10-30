export default function ResultsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#17233B] dark:text-white mb-2">Certified Results</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">Results are published only after audit passed, witness final, chain anchor, and auditor attestation.</p>

      <div className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">Student Union Council 2026</h3>
        <div className="space-y-3">
          {["Alex Rivera", "Sam Chen", "Jordan Patel"].map((name, i) => (
            <div key={name} className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-[#1E3352] last:border-0">
              <span className="text-slate-700 dark:text-slate-200">{name}</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">1,240 votes</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Privacy notice:</strong> Results below the anonymity threshold are marked PRIVACY_LIMITED and detail is suppressed.
        </p>
      </div>
    </div>
  );
}
