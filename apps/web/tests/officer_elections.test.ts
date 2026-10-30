import { describe, expect, it } from "vitest";
import { filterOfficerElections, formatUtcDate, summarizeOfficerElections } from "../src/lib/officer_elections";
import type { Election } from "../src/lib/types";

const election = (overrides: Partial<Election>): Election => ({
  id: "elec-1",
  title: "Synthetic Council",
  state: "OPEN",
  opens_at_utc: "2026-10-31T09:00:00Z",
  closes_at_utc: "2026-10-31T17:00:00Z",
  manifest_digest: "sha256:manifest",
  issuance_cutoff_utc: "2026-10-31T08:00:00Z",
  candidates: [],
  ...overrides,
});

describe("officer election data", () => {
  it("summarizes only server-returned lifecycle states", () => {
    expect(summarizeOfficerElections([
      election({ id: "open", state: "OPEN" }),
      election({ id: "draft", state: "DRAFT" }),
      election({ id: "closed", state: "CLOSED" }),
      election({ id: "paused", state: "PAUSED" }),
    ])).toEqual({ active: 2, drafts: 1, governed: 4 });
  });

  it("filters by title, id, contest, and exact lifecycle state", () => {
    const elections = [
      election({ id: "elec-cse", title: "Council", contest: "Computer Science" }),
      election({ id: "elec-arts", title: "Arts Senate", contest: "Humanities", state: "DRAFT" }),
    ];

    expect(filterOfficerElections(elections, "computer", "ALL").map((item) => item.id)).toEqual(["elec-cse"]);
    expect(filterOfficerElections(elections, "", "DRAFT").map((item) => item.id)).toEqual(["elec-arts"]);
    expect(filterOfficerElections(elections, "missing", "ALL")).toEqual([]);
  });

  it("formats server UTC dates deterministically for the UI", () => {
    expect(formatUtcDate("2026-10-31T17:00:00Z")).toContain("17:00");
  });
});
