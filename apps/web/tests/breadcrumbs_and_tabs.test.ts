import { describe, expect, it } from "vitest";
import { buildWorkspaceBreadcrumbs } from "../src/components/Breadcrumbs";

describe("breadcrumbs generation and accessibility", () => {
  it("generates root breadcrumb when at workspace root", () => {
    const crumbs = buildWorkspaceBreadcrumbs("/student", "/student");
    expect(crumbs).toEqual([{ label: "Workspace", href: "/student" }]);
  });

  it("builds multi-tier breadcrumbs for student election casting sub-routes", () => {
    const crumbs = buildWorkspaceBreadcrumbs(
      "/student/elections/elec-1234567890/cast",
      "/student"
    );
    expect(crumbs.length).toBe(4);
    expect(crumbs[0]).toEqual({ label: "Workspace", href: "/student" });
    expect(crumbs[1]).toEqual({ label: "Elections", href: "/student/elections" });
    expect(crumbs[2].label).toContain("Election elec-123");
    expect(crumbs[3]).toEqual({ label: "Cast", href: undefined });
  });

  it("builds multi-tier breadcrumbs for officer election lifecycle sub-routes", () => {
    const crumbs = buildWorkspaceBreadcrumbs(
      "/officer/elections/elec_math_2026/lifecycle",
      "/officer"
    );
    expect(crumbs.length).toBe(4);
    expect(crumbs[0]).toEqual({ label: "Workspace", href: "/officer" });
    expect(crumbs[1]).toEqual({ label: "Elections", href: "/officer/elections" });
    expect(crumbs[2].label).toContain("Election elec_mat");
    expect(crumbs[3]).toEqual({ label: "Lifecycle", href: undefined });
  });

  it("builds clean breadcrumbs for administrative pages", () => {
    const crumbs = buildWorkspaceBreadcrumbs("/admin/approvals", "/admin");
    expect(crumbs).toEqual([
      { label: "Workspace", href: "/admin" },
      { label: "Approvals", href: undefined },
    ]);
  });
});
