export interface WitnessFinalCheckpoint {
  status: string;
  election_id: string;
  checkpoint_sequence: number;
  witness_sequence: number;
  checkpoint_digest: string;
  checkpoint: Record<string, unknown>;
  witness_public_key: string;
  witness_signature: string;
  is_final: boolean;
  witnessed_at_utc: string;
}

export class WitnessApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 503) { super(message); this.name = "WitnessApiError"; this.status = status; }
}

function baseUrl(): string { return (process.env.NEXT_PUBLIC_WITNESS_BASE || "").replace(/\/$/, ""); }

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
  return value as unknown as WitnessFinalCheckpoint;
}
