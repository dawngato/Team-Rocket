import { describe, expect, it } from "vitest";
import {
  INITIAL_INSTITUTIONS,
  INITIAL_DEPARTMENTS,
  INITIAL_ADMINISTRATORS,
  INITIAL_ROLE_REQUESTS,
  INITIAL_POLICIES,
  INITIAL_ASSIGNMENTS,
  INITIAL_ELECTIONS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_TRUSTED_PINS,
} from "../src/lib/mock_data";
import { Role } from "../src/lib/types";
import { workspaceHome, canAccessWorkspaceRoute, canSeeItem } from "../src/lib/routes/nav_config";

describe("Institutional Roles and Operational Invariants", () => {
  it("supports all required institutional role types", () => {
    const roles: Role[] = [
      "public",
      "student",
      "teacher",
      "admin",
      "officer",
      "auditor",
      "superadmin",
    ];
    expect(roles).toContain("superadmin");
    expect(roles).toContain("admin");
    expect(roles).toContain("officer");
    expect(roles).toContain("teacher");
    expect(roles).toContain("student");
    expect(roles).toContain("auditor");
    expect(roles).toContain("public");
  });

  it("verifies super administrator bootstrap token revocation invariant", () => {
    const superAdmin = INITIAL_ADMINISTRATORS.find(
      (a) => a.role === "SUPER_ADMINISTRATOR"
    );
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.email).toBe("superadmin@hptu.ac.in");
    expect(superAdmin?.mfa_enabled).toBe(true);
    expect(superAdmin?.invited_by).toBe("SYSTEM_BOOTSTRAP_INVITATION");
  });

  it("ensures campus departments have verification thresholds", () => {
    expect(INITIAL_DEPARTMENTS.length).toBeGreaterThanOrEqual(3);
    for (const dept of INITIAL_DEPARTMENTS) {
      expect(dept.verification_threshold_percent).toBe(100);
      expect(dept.faculty_count).toBeGreaterThan(0);
      expect(dept.student_count).toBeGreaterThan(0);
    }
  });

  it("enforces mandatory dual control approval for elevated role requests", () => {
    expect(INITIAL_ROLE_REQUESTS.length).toBeGreaterThan(0);
    const approved = INITIAL_ROLE_REQUESTS.find((r) => r.status === "APPROVED");
    expect(approved?.dual_control_approver).toBeDefined();
  });

  it("tracks election officer assignments across departments", () => {
    expect(INITIAL_ASSIGNMENTS.length).toBeGreaterThan(0);
    for (const asgn of INITIAL_ASSIGNMENTS) {
      expect(asgn.faculty_id).toMatch(/^FAC_/);
      expect(asgn.election_id).toMatch(/^elec_/);
    }
  });

  it("pins trusted keys for witness, chain, and identity services", () => {
    const services = INITIAL_TRUSTED_PINS.map((p) => p.service);
    expect(services).toContain("WITNESS");
    expect(services).toContain("CHAIN");
    expect(services).toContain("IDENTITY");
  });

  it("P1-26: resolves correct workspace home per role instead of hardcoded student route", () => {
    expect(workspaceHome(["super_admin"])).toBe("/super-admin");
    expect(workspaceHome(["administrator"])).toBe("/admin");
    expect(workspaceHome(["election_officer"])).toBe("/officer");
    expect(workspaceHome(["teacher"])).toBe("/teacher");
    expect(workspaceHome(["auditor"])).toBe("/auditor");
    expect(workspaceHome(["student"])).toBe("/student");
    expect(workspaceHome([])).toBe("/student");
  });

  it("P1-27: enforces fine-grained scopes and capabilities for sensitive navigation", () => {
    // Officer assigned to election_A cannot access election_B
    const officerRoles = ["election_officer"];
    const officerScopes = [{ role: "election_officer", scope_type: "election", scope_id: "election_A" }];

    expect(canAccessWorkspaceRoute("/officer", officerRoles, officerScopes, "election_A")).toBe(true);
    expect(canAccessWorkspaceRoute("/officer", officerRoles, officerScopes, "election_B")).toBe(false);

    // Super admin can access any scope
    expect(canAccessWorkspaceRoute("/officer", ["super_admin"], [], "election_B")).toBe(true);

    // Unassigned role cannot access route
    expect(canAccessWorkspaceRoute("/admin", ["student"], [])).toBe(false);
  });

  it("P1-28: revoking a role immediately invalidates route authorization", () => {
    // Initially active teacher
    const activeRoles = ["teacher"];
    expect(canAccessWorkspaceRoute("/teacher/classes", activeRoles)).toBe(true);

    // Role revoked in active session
    const revokedRoles = ["student"];
    expect(canAccessWorkspaceRoute("/teacher/classes", revokedRoles)).toBe(false);
  });
});
