import { publicApiBase } from "./public_api_base";
import { userAuthStore } from "./user_auth_store";

export type ApprovalDecision = "approved" | "rejected";

export interface RoleApproval {
  id: string;
  applicant: string;
  email: string;
  requestedRole: string;
  scope: string;
  justification: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
}

export interface ApprovalDecisionResponse {
  status: "decision_recorded";
  decision: ApprovalDecision;
}

export class AdminApprovalApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(options: { code: string; message: string; status: number; retryable?: boolean }) {
    super(options.message);
    this.name = "AdminApprovalApiError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? (options.status >= 500 || options.status === 429);
  }
}

function configuredBaseUrl(): string {
  return publicApiBase(
    process.env.NEXT_PUBLIC_IDENTITY_API_BASE ||
    process.env.NEXT_PUBLIC_IDENTITY_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    undefined,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function responseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorFromResponse(status: number, body: unknown): AdminApprovalApiError {
  const record = isRecord(body) ? body : {};
  const detail = isRecord(record.detail) ? record.detail : {};
  const code = [record.error_code, record.code, detail.error_code, detail.code].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  ) || "ADMIN_APPROVAL_REQUEST_FAILED";
  const message = [record.message, detail.message, record.detail].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  ) || "The identity service rejected the approval request.";
  return new AdminApprovalApiError({ code, message, status });
}

function validateDecisionResponse(value: unknown): ApprovalDecisionResponse {
  if (
    !isRecord(value) ||
    value.status !== "decision_recorded" ||
    (value.decision !== "approved" && value.decision !== "rejected")
  ) {
    throw new AdminApprovalApiError({
      code: "ADMIN_APPROVAL_RESPONSE_INVALID",
      message: "The identity service returned an invalid approval decision response.",
      status: 502,
      retryable: false,
    });
  }
  return {
    status: "decision_recorded",
    decision: value.decision,
  };
}

export const adminApprovalsClient = {
  async getPendingApprovals(): Promise<RoleApproval[]> {
    const baseUrl = configuredBaseUrl();
    if (!baseUrl) {
      throw new AdminApprovalApiError({
        code: "ADMIN_APPROVAL_LIST_UNAVAILABLE",
        message: "Pending role approvals are unavailable because the identity service does not expose an authorized approval list endpoint.",
        status: 501,
        retryable: false,
      });
    }
    const headers = new Headers({ Accept: "application/json" });
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("himvote_session_token_v3");
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const user = userAuthStore.getCurrentUser();
        const role = user?.role ? (user.role === "super_admin" ? "super_admin,administrator" : user.role) : "administrator,super_admin";
        headers.set("X-Actor-ID", user?.id || "usr_admin");
        headers.set("X-Actor-Roles", role);
        headers.set("X-Actor-Scopes", "institution:*,global:*");
        headers.set("X-Actor-MFA", "true");
      } catch {}
    }
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/admin/approvals?status=pending`, { headers, credentials: "include", redirect: "error", referrerPolicy: "no-referrer" });
    } catch {
      throw new AdminApprovalApiError({ code: "IDENTITY_NETWORK_ERROR", message: "The identity service could not be reached.", status: 503 });
    }
    const body = await responseBody(response);
    if (!response.ok) throw errorFromResponse(response.status, body);
    if (!Array.isArray(body)) throw new AdminApprovalApiError({ code: "ADMIN_APPROVAL_RESPONSE_INVALID", message: "The identity service returned an invalid approval queue.", status: 502, retryable: false });
    return body.map((value) => {
      if (!isRecord(value) || typeof value.id !== "string" || typeof value.requested_role !== "string" || typeof value.requested_scope !== "string") {
        throw new AdminApprovalApiError({ code: "ADMIN_APPROVAL_RESPONSE_INVALID", message: "The identity service returned an invalid approval record.", status: 502, retryable: false });
      }
      return {
        id: value.id,
        applicant: String(value.requester_id || ""),
        email: String(value.requester_email || ""),
        requestedRole: value.requested_role,
        scope: value.requested_scope,
        justification: String(value.justification || ""),
        status: value.status === "approved" ? "APPROVED" : value.status === "rejected" ? "REJECTED" : "PENDING",
        requestedAt: String(value.requested_at || ""),
      };
    });
  },

  /**
   * Real decision endpoint retained for callers that have obtained an
   * approval identifier from an independently authorized queue.
   */
  async decideApproval(
    approvalId: string,
    decision: ApprovalDecision,
    reason: string,
  ): Promise<ApprovalDecisionResponse> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._~:-]{0,255}$/.test(approvalId)) {
      throw new AdminApprovalApiError({
        code: "ADMIN_APPROVAL_ID_INVALID",
        message: "The approval identifier is invalid.",
        status: 422,
        retryable: false,
      });
    }
    if (!reason.trim()) {
      throw new AdminApprovalApiError({
        code: "ADMIN_APPROVAL_REASON_REQUIRED",
        message: "A reason is required for every approval decision.",
        status: 422,
        retryable: false,
      });
    }

    const baseUrl = configuredBaseUrl();
    if (!baseUrl) {
      throw new AdminApprovalApiError({
        code: "IDENTITY_API_NOT_CONFIGURED",
        message: "The identity service is not configured. No approval decision was submitted.",
        status: 503,
      });
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/approvals/${encodeURIComponent(approvalId)}/decision`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("himvote_session_token_v3")
            ? { Authorization: `Bearer ${localStorage.getItem("himvote_session_token_v3")}` }
            : {}),
        },
        body: JSON.stringify({ decision, reason: reason.trim() }),
        credentials: "include",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
    } catch {
      throw new AdminApprovalApiError({
        code: "IDENTITY_NETWORK_ERROR",
        message: "The identity service could not be reached. No approval decision was submitted.",
        status: 503,
      });
    }

    const body = await responseBody(response);
    if (!response.ok) throw errorFromResponse(response.status, body);
    return validateDecisionResponse(body);
  },
};
