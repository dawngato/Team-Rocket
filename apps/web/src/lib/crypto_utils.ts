"use client";

export function stableJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, normalize(item)]),
      );
    }
    return input;
  };
  return JSON.stringify(normalize(value));
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256(value: Uint8Array | string): Promise<Uint8Array> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt(`0x${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("") || "0"}`);
}

export function bigIntToBytes(value: bigint, length?: number): Uint8Array {
  if (value < 0n) throw new Error("Cannot encode a negative integer");
  let hex = value.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const minimum = new Uint8Array(hex ? hex.length / 2 : 1);
  for (let index = 0; index < minimum.length; index += 1) {
    minimum[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2) || "0", 16);
  }
  if (!length) return minimum;
  if (minimum.length > length) throw new Error("Integer does not fit in requested length");
  const output = new Uint8Array(length);
  output.set(minimum, length - minimum.length);
  return output;
}

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus <= 0n || exponent < 0n) throw new Error("Invalid modular exponentiation input");
  let result = 1n;
  let factor = ((base % modulus) + modulus) % modulus;
  let power = exponent;
  while (power > 0n) {
    if (power & 1n) result = (result * factor) % modulus;
    factor = (factor * factor) % modulus;
    power >>= 1n;
  }
  return result;
}

export function modInverse(value: bigint, modulus: bigint): bigint {
  let oldR = ((value % modulus) + modulus) % modulus;
  let r = modulus;
  let oldS = 1n;
  let s = 0n;
  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  if (oldR !== 1n) throw new Error("Value is not invertible");
  return (oldS % modulus + modulus) % modulus;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomHex(length: number): string {
  return Array.from(randomBytes(length), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
