export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#17233B] dark:text-white mb-2">How verification works</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">Every meaningful state has a different label, proof, and promise.</p>

      <div className="space-y-6">
        {[
          { step: "1", title: "Eligibility verified", detail: "A teacher or administrator matches your record to the approved enrollment source." },
          { step: "2", title: "Credential issued", detail: "You receive one blind credential per election. The issuer never sees your selection." },
          { step: "3", title: "Ballot cast", detail: "Your encrypted ballot is committed atomically. You receive a receipt handle." },
          { step: "4", title: "Witness signature", detail: "An independent witness signs the Merkle checkpoint." },
          { step: "5", title: "Chain anchor", detail: "The final digest reaches chain finality. Nothing on chain identifies you." },
          { step: "6", title: "Audit and publication", detail: "An independent auditor verifies and signs. Results are published only then." },
        ].map((item) => (
          <div key={item.step} className="flex gap-4 p-4 bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl">
            <span className="w-8 h-8 rounded-full bg-[#157E92] text-white text-sm font-bold flex-shrink-0 flex items-center justify-center">{item.step}</span>
            <div>
              <h3 className="font-bold text-[#17233B] dark:text-white">{item.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}