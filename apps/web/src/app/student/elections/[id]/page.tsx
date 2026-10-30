import Link from "next/link";
import { StateBadge } from "@/components/StateBadge";
import { ElectionState } from "@/lib/types";

export default function ElectionDetailPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <nav className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Link href="/student/elections" className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          Back to elections
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-[#17233B] dark:text-white mb-2">Student Union Council 2026</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Choose representatives for the central student body and campus committees.</p>

      <div className="grid gap-4">
        <div className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">Your status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Eligibility</span>
              <StateBadge state="OPEN" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Credential</span>
              <span className="text-[#157E92] font-medium">Available</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Votes cast</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">0 of 1</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">Candidates</h3>
          <div className="space-y-3">
            {["Alex Rivera", "Sam Chen", "Jordan Patel"].map((name, i) => (
              <div key={name} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-[#1E3352] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <input
                  type="radio"
                  name="candidate"
                  className="w-5 h-5 text-[#157E92] border-slate-300 focus-visible:ring-2 focus-visible:ring-[#157E92]"
                />
                <span className="text-slate-700 dark:text-slate-200">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}