export default function AuditPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#17233B] dark:text-white mb-2">Public Audit Explorer</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">Inspect published evidence packages and verification results.</p>

      <div className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">Available evidence</h3>
        <div className="space-y-3">
          {[
            { label: "Manifest digest", value: "sha256:..." },
            { label: "Final checkpoint", value: "sha256:..." },
            { label: "Chain anchor tx", value: "0x..." },
            { label: "Auditor attestation", value: "Available" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center p-3 bg-[#F3F6FA] dark:bg-[#0B1524] rounded-lg border border-slate-200 dark:border-[#1E3352]">
              <span className="text-slate-600 dark:text-slate-400 text-sm">{item.label}</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-xs">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
