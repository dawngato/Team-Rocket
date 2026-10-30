import type { Election, ElectionState } from "./types";

export interface OfficerElectionMetrics {
  active: number;
  drafts: number;
  governed: number;
}

const ACTIVE_STATES = new Set<ElectionState>(["OPEN", "FROZEN", "SCHEDULED", "PAUSED", "CLOSING"]);

export function filterOfficerElections(
  elections: Election[],
  query: string,
  state: ElectionState | "ALL",
): Election[] {
  const normalizedQuery = query.trim().toLowerCase();
  return elections.filter((election) => {
    const matchesQuery = [election.title, election.id, election.contest ?? ""]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (state === "ALL" || election.state === state);
  });
}

export function summarizeOfficerElections(elections: Election[]): OfficerElectionMetrics {
  return {
    active: elections.filter((election) => ACTIVE_STATES.has(election.state)).length,
    drafts: elections.filter((election) => election.state === "DRAFT").length,
    governed: elections.length,
  };
}

export function formatUtcDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
