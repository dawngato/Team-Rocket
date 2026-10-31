import { IdentityApiError } from "./identity_client";
import { publicApiBase } from "./public_api_base";

export interface EnginePublicParameters {
  provider: string;
  version: string;
  protocol: string;
  joint_public_key: string;
  established_protocol: boolean;
}

function configuredBaseUrl(): string {
  return publicApiBase(process.env.NEXT_PUBLIC_ELECTION_ENGINE_BASE || process.env.NEXT_PUBLIC_API_BASE || undefined);
}

export async function getEnginePublicParameters(): Promise<EnginePublicParameters> {
  const base = configuredBaseUrl();
  if (!base) throw new IdentityApiError({ code: "ENGINE_API_NOT_CONFIGURED", message: "The election engine is not configured.", status: 503, retryable: false });
  let response: Response;
  try {
    response = await fetch(`${base}/v1/engine/public_parameters`, { headers: { Accept: "application/json" }, redirect: "error", referrerPolicy: "no-referrer" });
  } catch {
    throw new IdentityApiError({ code: "ENGINE_NETWORK_ERROR", message: "The election engine could not be reached.", status: 503 });
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body || typeof body !== "object") {
    throw new IdentityApiError({ code: "ENGINE_REQUEST_FAILED", message: "The election engine rejected its public parameter request.", status: response.status || 502, retryable: false });
  }
  const value = body as Record<string, unknown>;
  if (typeof value.provider !== "string" || typeof value.version !== "string" || typeof value.protocol !== "string" || typeof value.joint_public_key !== "string" || typeof value.established_protocol !== "boolean") {
    throw new IdentityApiError({ code: "ENGINE_RESPONSE_INVALID", message: "The election engine returned invalid public parameters.", status: 502, retryable: false });
  }
  if (!/^0x[0-9a-f]+$/i.test(value.joint_public_key)) {
    throw new IdentityApiError({ code: "ENGINE_KEY_INVALID", message: "The election engine returned an invalid joint public key.", status: 502, retryable: false });
  }
  return value as unknown as EnginePublicParameters;
}
