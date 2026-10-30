"use client";

import {
  base64UrlDecode,
  base64UrlEncode,
  bigIntToBytes,
  bytesToBigInt,
  modInverse,
  modPow,
  randomHex,
  sha256,
  stableJson,
} from "./crypto_utils";

export interface IssuerPublicKey {
  key_id: string;
  algorithm: string;
  n: string;
  e: number;
  modulus_len: number;
}

export interface CredentialRequestState {
  election_id: string;
  voter_token: string;
  blinding_factor_r: string;
  issuer_key_id: string;
  modulus_n: string;
  modulus_e: number;
  modulus_len: number;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left;
  let b = right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function modulusFromKey(key: IssuerPublicKey): bigint {
  const modulus = BigInt(key.n.startsWith("0x") ? key.n : `0x${key.n}`);
  if (modulus <= 0n || key.e <= 1 || key.modulus_len < 128) throw new Error("Issuer public key is invalid");
  return modulus;
}

export async function createCredentialRequest(
  electionId: string,
  key: IssuerPublicKey,
): Promise<{ handoff: { type: "himvote.engine.credential.v1"; election_id: string; blinded_request: string }; state: CredentialRequestState }> {
  const modulus = modulusFromKey(key);
  const token = randomHex(32);
  const digest = await sha256(token);
  const message = bytesToBigInt(digest) % modulus;
  if (message <= 1n) return createCredentialRequest(electionId, key);

  let r = 0n;
  do {
    r = (bytesToBigInt(crypto.getRandomValues(new Uint8Array(key.modulus_len))) % (modulus - 2n)) + 2n;
  } while (gcd(r, modulus) !== 1n);

  const blinded = (message * modPow(r, BigInt(key.e), modulus)) % modulus;
  const state: CredentialRequestState = {
    election_id: electionId,
    voter_token: token,
    blinding_factor_r: r.toString(10),
    issuer_key_id: key.key_id,
    modulus_n: modulus.toString(16),
    modulus_e: key.e,
    modulus_len: key.modulus_len,
  };
  return {
    handoff: {
      type: "himvote.engine.credential.v1",
      election_id: electionId,
      blinded_request: base64UrlEncode(bigIntToBytes(blinded, key.modulus_len)),
    },
    state,
  };
}

export async function finalizeCredential(
  state: CredentialRequestState,
  manifestDigest: string,
  blindSignatureResponse: string,
): Promise<string> {
  const modulus = BigInt(`0x${state.modulus_n}`);
  const blindSignature = bytesToBigInt(base64UrlDecode(blindSignatureResponse));
  if (blindSignature <= 0n || blindSignature >= modulus) throw new Error("Issuer returned an invalid blind signature");
  const signature = (blindSignature * modInverse(BigInt(state.blinding_factor_r), modulus)) % modulus;
  const tokenDigest = await sha256(state.voter_token);
  const message = bytesToBigInt(tokenDigest) % modulus;
  if (modPow(signature, BigInt(state.modulus_e), modulus) !== message) {
    throw new Error("Blind signature verification failed");
  }
  const proof = {
    election_id: state.election_id,
    manifest_digest: manifestDigest,
    voter_token: state.voter_token,
    signature: `0x${signature.toString(16)}`,
  };
  return base64UrlEncode(new TextEncoder().encode(stableJson(proof)));
}
