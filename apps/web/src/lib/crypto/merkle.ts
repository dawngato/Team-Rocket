export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) throw new TypeError("Invalid hexadecimal data");
  return Uint8Array.from({ length: hex.length / 2 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

async function sha256(value: Uint8Array): Promise<Uint8Array> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", value);
  return new Uint8Array(digest);
}

export async function leafHash(canonicalBytes: Uint8Array): Promise<Uint8Array> {
  const input = new Uint8Array(canonicalBytes.length + 1);
  input[0] = 0;
  input.set(canonicalBytes, 1);
  return sha256(input);
}

export async function nodeHash(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  const input = new Uint8Array(left.length + right.length + 1);
  input[0] = 1;
  input.set(left, 1);
  input.set(right, left.length + 1);
  return sha256(input);
}

export async function merkleTreeHash(leaves: Uint8Array[]): Promise<Uint8Array> {
  if (leaves.length === 0) return sha256(new Uint8Array());
  if (leaves.length === 1) return leaves[0];
  const split = 2 ** (Math.floor(Math.log2(leaves.length - 1)));
  const left = await merkleTreeHash(leaves.slice(0, split));
  const right = await merkleTreeHash(leaves.slice(split));
  return nodeHash(left, right);
}
