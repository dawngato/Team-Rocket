import { describe, expect, it } from "vitest";
import {
  canAccessWorkspaceRoute,
  visibleWorkspaceNav,
  workspaceHome,
} from "../src/lib/routes/nav_config";

function labelsFor(roles: string[]): string[] {
  return visibleWorkspaceNav(roles).flatMap((group) => group.items.map((item) => item.label));
}

describe("server granted workspace navigation", () => {
  it("does not expose privileged navigation to an unknown or guest role", () => {
    expect(labelsFor([])).toEqual([]);
    expect(labelsFor(["public"])).toEqual([]);
    expect(canAccessWorkspaceRoute("/admin", [])).toBe(false);
    expect(canAccessWorkspaceRoute("/auditor", ["student"])).toBe(false);
  });

  it("keeps student navigation separate from staff workspaces", () => {
    const labels = labelsFor(["student"]);
    expect(labels).toEqual(expect.arrayContaining(["Overview", "My elections", "My eligibility", "Receipts", "Published results", "Student help", "Account settings"]));
    expect(labels).not.toEqual(expect.arrayContaining(["My classes", "Election builder", "Audit logs", "Trusted keys"]));
    expect(canAccessWorkspaceRoute("/student/elections", ["student"])).toBe(true);
    expect(canAccessWorkspaceRoute("/teacher/classes", ["student"])).toBe(false);
  });

  it("unions explicitly granted capabilities without making roles hierarchical", () => {
    const labels = labelsFor(["teacher", "auditor"]);
    expect(labels).toEqual(expect.arrayContaining(["My classes", "Student verification", "Evidence", "Trusted keys", "Verify results"]));
    expect(labels).not.toContain("Election builder");
    expect(canAccessWorkspaceRoute("/teacher", ["teacher", "auditor"])).toBe(true);
    expect(canAccessWorkspaceRoute("/officer", ["teacher", "auditor"])).toBe(false);
  });

  it("normalizes backend role aliases and resolves a safe workspace home", () => {
    expect(workspaceHome(["superadmin"])).toBe("/super-admin");
    expect(workspaceHome(["officer"])).toBe("/officer");
    expect(canAccessWorkspaceRoute("/account", ["auditor"])).toBe(true);
  });
});
