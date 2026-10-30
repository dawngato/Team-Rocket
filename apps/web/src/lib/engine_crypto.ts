"use client";

import { base64UrlEncode, modInverse, modPow, randomBytes, sha256, stableJson } from "./crypto_utils";
import { bytesToBigInt } from "./crypto_utils";

const P = BigInt("0x87A8E61DB4B6663CFFBBD19C651959998CEEF608660DD0F25D2CEED4435E3B00E00DF8F1D61957D4FAF7DF4561B2AA3016C3D91134096FAA3BF4296D830E9A7C209E0C6497517ABD5A8A9D306BCF67ED91F9E6725B4758C022E0B1EF4275BF7B6C5BFC11D45F9088B941F54EB1E59BB8BC39A0BF12307F5C4FDB70C581B23F76B63ACAE1CAA6B7902D52526735488A0EF13C6D9A51BFA4AB3AD8347796524D8EF6A167B5A41825D967E144E5140564251CCACB83E6B486F6B3CA3F7971506026C0B857F689962856DED4010ABD0BE621C3A3960A54E710C375F26375D7014103A4B54330C198AF126116D2276E11715F693877FAD7EF09CADB094AE91E1A1597");
const G = BigInt("0x3FB32C9B73134D0B2E77506660EDBD484CA7B18F21EF205407F4793A1A0BA12510DBC15077BE463FFF4FED4AAC0BB555BE3A6C1B0C6B47B1BC3773BF7E8C6F62901228F8C28CBB18A55AE31341000A650196F931C77A57F2DDF463E5E9EC144B777DE62AAAB8A8628AC376D282D6ED3864E67982428EBC831D14348F6F2F9193B5045AF2767164E1DFC967C1FB3F2E55A4BD1BFFE83B9C80D052B985D182EA0ADB2A3B7313D3FE14C8484B1E052588B9B7D2BBD2DF016199ECD06E1557CD0915B3353BBB64E0EC377FD028370DF92B52C7891428CDC67EB6184B523D1DB246C32F63078490F00EF8D647D148D47954515E2327CFEF98C582664B4C0F6CC41659");
const Q = BigInt("0x8CF83642A709A097B447997640129DA299B1A47D1EB3750BA308B0FE64F5FBD3");

type ScalarInput = string | bigint | Record<string, unknown> | unknown[];

function hex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function minimalBytes(value: bigint): Uint8Array {
  const hexValue = value.toString(16).padStart(value === 0n ? 2 : 1, "0");
  const normalized = hexValue.length % 2 ? `0${hexValue}` : hexValue;
  const output = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < output.length; index += 1) output[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  return output;
}

async function hashToScalar(...items: ScalarInput[]): Promise<bigint> {
  const chunks = items.map((item) => {
    if (typeof item === "bigint") return minimalBytes(item);
    if (typeof item === "string") return new TextEncoder().encode(item);
    return new TextEncoder().encode(stableJson(item));
  });
  const combined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
  return bytesToBigInt(await sha256(combined)) % Q;
}

async function randomScalar(): Promise<bigint> {
  let candidate = 0n;
  do candidate = bytesToBigInt(randomBytes(32)); while (candidate === 0n || candidate >= Q);
  return candidate;
}

async function disjunctiveProof(
  manifestDigest: string,
  electionId: string,
  candidateId: string,
  publicKey: bigint,
  randomness: bigint,
  plaintextVote: 0 | 1,
) {
  const a = modPow(G, randomness, P);
  const b = (modPow(publicKey, randomness, P) * modPow(G, BigInt(plaintextVote), P)) % P;
  const bDivG = (b * modInverse(G, P)) % P;
  let a0: bigint; let b0: bigint; let a1: bigint; let b1: bigint; let c0: bigint; let c1: bigint; let z0: bigint; let z1: bigint;
  if (plaintextVote === 0) {
    c1 = await randomScalar(); z1 = await randomScalar();
    a1 = (modPow(G, z1, P) * modPow(modInverse(a, P), c1, P)) % P;
    b1 = (modPow(publicKey, z1, P) * modPow(modInverse(bDivG, P), c1, P)) % P;
    const w0 = await randomScalar(); a0 = modPow(G, w0, P); b0 = modPow(publicKey, w0, P);
    const total = await hashToScalar(manifestDigest, electionId, candidateId, a, b, a0, b0, a1, b1);
    c0 = (total - c1 + Q) % Q; z0 = (w0 + c0 * randomness) % Q;
  } else {
    c0 = await randomScalar(); z0 = await randomScalar();
    a0 = (modPow(G, z0, P) * modPow(modInverse(a, P), c0, P)) % P;
    b0 = (modPow(publicKey, z0, P) * modPow(modInverse(b, P), c0, P)) % P;
    const w1 = await randomScalar(); a1 = modPow(G, w1, P); b1 = modPow(publicKey, w1, P);
    const total = await hashToScalar(manifestDigest, electionId, candidateId, a, b, a0, b0, a1, b1);
    c1 = (total - c0 + Q) % Q; z1 = (w1 + c1 * randomness) % Q;
  }
  return { a0: hex(a0), b0: hex(b0), a1: hex(a1), b1: hex(b1), c0: hex(c0), c1: hex(c1), z0: hex(z0), z1: hex(z1) };
}

export async function createEncryptedBallot(input: {
  electionId: string;
  manifestDigest: string;
  candidates: string[];
  selectedCandidateId: string;
  jointPublicKey: string;
}) {
  if (!input.candidates.includes(input.selectedCandidateId) || input.candidates.length < 2) throw new Error("The approved candidate set is invalid");
  const publicKey = BigInt(input.jointPublicKey);
  const ballotId = `ballot_${Array.from(randomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const ciphertexts: Array<Record<string, string>> = [];
  const disjunctiveProofs: Array<Record<string, string>> = [];
  let sumA = 1n; let sumB = 1n; let sumR = 0n;
  for (const candidateId of input.candidates) {
    const vote = candidateId === input.selectedCandidateId ? 1 : 0;
    const randomness = await randomScalar();
    const a = modPow(G, randomness, P);
    const b = (modPow(publicKey, randomness, P) * modPow(G, BigInt(vote), P)) % P;
    ciphertexts.push({ candidate_id: candidateId, a: hex(a), b: hex(b) });
    disjunctiveProofs.push({ candidate_id: candidateId, ...(await disjunctiveProof(input.manifestDigest, input.electionId, candidateId, publicKey, randomness, vote as 0 | 1)) });
    sumA = (sumA * a) % P; sumB = (sumB * b) % P; sumR = (sumR + randomness) % Q;
  }
  // The challenge binds the exact aggregate ciphertext, matching the engine implementation.
  const w = await randomScalar();
  const aComm = modPow(G, w, P); const bComm = modPow(publicKey, w, P);
  const c = await hashToScalar(input.manifestDigest, input.electionId, "sum_proof_constant", sumA, sumB, aComm, bComm);
  const z = (w + c * sumR) % Q;
  const ballot = { election_id: input.electionId, manifest_digest: input.manifestDigest, ballot_id: ballotId, ciphertexts };
  const proofs = { disjunctive_proofs: disjunctiveProofs, sum_proof: { a_comm: hex(aComm), b_comm: hex(bComm), c: hex(c), z: hex(z) }, public_key: input.jointPublicKey };
  const trackingDigest = await sha256(stableJson(ballot));
  return {
    engine_ballot_b64url: base64UrlEncode(new TextEncoder().encode(stableJson(ballot))),
    engine_proofs_b64url: base64UrlEncode(new TextEncoder().encode(stableJson(proofs))),
    tracking_code: Array.from(trackingDigest, (byte) => byte.toString(16).padStart(2, "0")).join(""),
  };
}
