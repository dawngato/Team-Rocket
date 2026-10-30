import { stableJson } from "./crypto_utils";

export interface WitnessFinalCheckpoint {
  status: string;
  election_id: string;
  checkpoint_sequence: number;
  witness_sequence: number;
  previous_witness_sequence: number;
  checkpoint_digest: string;
  checkpoint: Record<string, unknown>;
  witness_public_key: string;
  witness_signature: string;
  is_final: boolean;
  witnessed_at_utc: string;
  verification: "INDEPENDENT_PASS" | "LIMITED" | "FAIL";
  verification_reason: string;
}

export class WitnessApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 503) { super(message); this.name = "WitnessApiError"; this.status = status; }
}

function baseUrl(): string { return (process.env.NEXT_PUBLIC_WITNESS_BASE || "").replace(/\/$/, ""); }

function hexBytes(value: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) throw new Error("hex value is invalid");
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

async function verifyPinnedSignature(value: Record<string, unknown>, electionId: string): Promise<{ verification: WitnessFinalCheckpoint["verification"]; verification_reason: string }> {
  const pinned = process.env.NEXT_PUBLIC_WITNESS_PUBLIC_KEY?.trim().toLowerCase();
  const publicKey = typeof value.witness_public_key === "string" ? value.witness_public_key.toLowerCase() : "";
  if (!pinned) return { verification: "LIMITED", verification_reason: "No out-of-band witness public-key pin is configured." };
  if (publicKey !== pinned) return { verification: "FAIL", verification_reason: "Witness key does not match the configured out-of-band pin." };
  try {
    const previousSequence = value.previous_witness_sequence;
    if (typeof previousSequence !== "number" || !Number.isSafeInteger(previousSequence) || !value.checkpoint || typeof value.checkpoint !== "object") throw new Error("checkpoint binding fields are invalid");
    const binding = new TextEncoder().encode(`HIMVOTE_WITNESS_V1:${electionId}:${previousSequence}:${stableJson(value.checkpoint)}`);
    const key = await crypto.subtle.importKey("raw", hexBytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
    const valid = await crypto.subtle.verify({ name: "Ed25519" }, key, hexBytes(String(value.witness_signature)), binding);
    return valid ? { verification: "INDEPENDENT_PASS", verification_reason: "Signature matches the pinned witness key and canonical checkpoint binding." } : { verification: "FAIL", verification_reason: "Witness signature verification failed." };
  } catch {
    return { verification: "FAIL", verification_reason: "Witness signature or canonical checkpoint binding is malformed." };
  }
}

export async function getFinalCheckpoint(electionId: string): Promise<WitnessFinalCheckpoint> {
  const base = baseUrl();
  if (!base) throw new WitnessApiError("The independent witness service is not configured.");
  let response: Response;
  try { response = await fetch(`${base}/elections/${encodeURIComponent(electionId)}/final`, { headers: { Accept: "application/json" }, redirect: "error", referrerPolicy: "no-referrer" }); }
  catch { throw new WitnessApiError("The independent witness service could not be reached."); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body || typeof body !== "object") throw new WitnessApiError("The witness service did not return a final checkpoint.", response.status || 502);
  const value = body as Record<string, unknown>;
  if (value.election_id !== electionId || value.is_final !== true || typeof value.checkpoint_digest !== "string" || typeof value.witness_public_key !== "string" || typeof value.witness_signature !== "string" || typeof value.witnessed_at_utc !== "string" || !value.checkpoint || typeof value.checkpoint !== "object") throw new WitnessApiError("The witness returned an invalid final checkpoint.", 502);
  const verification = await verifyPinnedSignature(value, electionId);
  return { ...value, ...verification } as unknown as WitnessFinalCheckpoint;
}
