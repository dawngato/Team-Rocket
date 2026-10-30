import Link from "next/link";
import { StateBadge } from "@/components/StateBadge";
import { ElectionState } from "@/lib/types";

const elections = [
  {
    id: "elec-2026-001",
    title: "Student Union Council 2026",
    state: "OPEN" as ElectionState,
    closes_at_utc: "2026-11-14T17:00:00Z",
    candidate_count: 6,
    seats: 3,
  },
  {
    id: "elec-2026-002",
    title: "School of Design Representatives",
    state: "FROZEN" as ElectionState,
    opens_at_utc: "2026-11-20T09:00:00Z",
    candidate_count: 3,
    seats: 2,
  },
];

export default function StudentElectionsPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#17233B] dark:text-white mb-2">My Elections</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">View your eligible elections and casting status.</p>

      <div className="space-y-4">
        {elections.map((e) => (
          <article key={e.id} className="bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#17233B] dark:text-white">{e.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {e.candidate_count} candidates across {e.seats} seats
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StateBadge state={e.state} showDescription />
                <Link
                  href={`/student/elections/${e.id}`}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-[#157E92] rounded-lg hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
                >
                  {e.state === "OPEN" ? "Vote now" : "View details"}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}