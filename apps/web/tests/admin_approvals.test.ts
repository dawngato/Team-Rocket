import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  adminApprovalsClient,
  AdminApprovalApiError,
} from "../src/lib/admin_approvals";

const originalIdentityBase = process.env.NEXT_PUBLIC_IDENTITY_API_BASE;
const originalApiBase = process.env.NEXT_PUBLIC_API_BASE;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalIdentityBase === undefined) delete process.env.NEXT_PUBLIC_IDENTITY_API_BASE;
  else process.env.NEXT_PUBLIC_IDENTITY_API_BASE = originalIdentityBase;
  if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE;
  else process.env.NEXT_PUBLIC_API_BASE = originalApiBase;
});

describe("admin approval integration", () => {
  it("fails closed because the backend has no pending approval list contract", async () => {
    await expect(adminApprovalsClient.getPendingApprovals()).rejects.toMatchObject({
      code: "ADMIN_APPROVAL_LIST_UNAVAILABLE",
      status: 501,
      retryable: false,
    });
  });

  it("submits decisions only through the authorized identity endpoint", async () => {
    process.env.NEXT_PUBLIC_IDENTITY_API_BASE = "https://identity.example.test/";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "decision_recorded", decision: "approved" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      adminApprovalsClient.decideApproval("approval_123", "approved", "Independent review complete"),
    ).resolves.toEqual({ status: "decision_recorded", decision: "approved" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/v1/approvals/approval_123/decision",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ decision: "approved", reason: "Independent review complete" }),
      }),
    );
  });

  it("does not submit when the identity service is not configured", async () => {
    delete process.env.NEXT_PUBLIC_IDENTITY_API_BASE;
    delete process.env.NEXT_PUBLIC_API_BASE;
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      adminApprovalsClient.decideApproval("approval_123", "rejected", "Insufficient evidence"),
    ).rejects.toMatchObject({
      code: "IDENTITY_API_NOT_CONFIGURED",
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed decision responses instead of reporting success", async () => {
    process.env.NEXT_PUBLIC_IDENTITY_API_BASE = "https://identity.example.test";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "decision_recorded", decision: "maybe" }), { status: 200 }),
    );

    await expect(
      adminApprovalsClient.decideApproval("approval_123", "approved", "Independent review complete"),
    ).rejects.toMatchObject({
      code: "ADMIN_APPROVAL_RESPONSE_INVALID",
      status: 502,
    });
  });

  it("keeps the page free of seeded applicants and local decision mutations", () => {
    const page = readFileSync(resolve(__dirname, "../src/app/admin/approvals/page.tsx"), "utf8");
    expect(page).not.toContain("Alok Nath Sen");
    expect(page).not.toContain("Pooja Hegde");
    expect(page).not.toContain("setApprovals((prev)");
    expect(page).not.toContain("Decision recorded to immutable audit ledger");
  });

  it("exposes typed client errors for callers without masking unavailable infrastructure", () => {
    const error = new AdminApprovalApiError({
      code: "ADMIN_APPROVAL_LIST_UNAVAILABLE",
      message: "not available",
      status: 501,
      retryable: false,
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.retryable).toBe(false);
  });
});
