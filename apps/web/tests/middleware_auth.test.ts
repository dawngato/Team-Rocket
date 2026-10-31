import { describe, expect, it } from "vitest";
import { isAuthorizedForPath } from "../src/middleware";

describe("server-side workspace authorization", () => {
  it("keeps student, teacher, officer, and administrator workspaces separate", () => {
    expect(isAuthorizedForPath("/admin", ["administrator"])).toBe(true);
    expect(isAuthorizedForPath("/student", ["administrator"])).toBe(false);
    expect(isAuthorizedForPath("/officer", ["administrator"])).toBe(false);
    expect(isAuthorizedForPath("/admin", ["student"])).toBe(false);
    expect(isAuthorizedForPath("/student", ["student"])).toBe(true);
    expect(isAuthorizedForPath("/teacher", ["teacher"])).toBe(true);
    expect(isAuthorizedForPath("/auditor", ["auditor"])).toBe(true);
  });

  it("requires a matching election scope for direct officer election routes", () => {
    const assigned = [{ scope_type: "election", scope_id: "elec_A" }];
    expect(isAuthorizedForPath("/officer/elections/elec_A/candidates", ["election_officer"], assigned)).toBe(true);
    expect(isAuthorizedForPath("/officer/elections/elec_B/candidates", ["election_officer"], assigned)).toBe(false);
    expect(isAuthorizedForPath("/officer/elections/elec_A", ["election_officer"])).toBe(false);
    expect(isAuthorizedForPath("/officer/elections/elec_B", ["super_admin"])).toBe(true);
  });

  it("allows an institution-wide wildcard grant to reach assigned operations", () => {
    expect(isAuthorizedForPath(
      "/officer/elections/elec_A/candidates",
      ["election_officer"],
      [{ scope_type: "tenant", scope_id: "*" }],
    )).toBe(true);
  });

  it("allows super_admin to access both /super-admin and /admin workspaces", () => {
    expect(isAuthorizedForPath("/super-admin", ["super_admin"])).toBe(true);
    expect(isAuthorizedForPath("/super-admin/role-requests", ["super_admin"])).toBe(true);
    expect(isAuthorizedForPath("/admin", ["super_admin"])).toBe(true);
    expect(isAuthorizedForPath("/admin/approvals", ["super_admin"])).toBe(true);
  });

  it("authorizes administrator accounts for /admin but restricts /super-admin unless holding super_admin", () => {
    expect(isAuthorizedForPath("/admin", ["administrator"])).toBe(true);
    expect(isAuthorizedForPath("/super-admin", ["administrator"])).toBe(false);
    expect(isAuthorizedForPath("/super-admin", ["administrator", "super_admin"])).toBe(true);
    expect(isAuthorizedForPath("/admin", ["administrator", "super_admin"])).toBe(true);
  });
});
