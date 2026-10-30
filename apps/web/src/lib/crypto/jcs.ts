export type JcsValue = null | boolean | number | string | JcsValue[] | { [key: string]: JcsValue };

function encodeString(value: string): string {
  return JSON.stringify(value);
}

function compareUtf16(a: string, b: string): number {
  const left = Array.from(encodeString(a)).map((char) => char.charCodeAt(0));
  const right = Array.from(encodeString(b)).map((char) => char.charCodeAt(0));
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

export function jcsRfc8785(value: JcsValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value === null ? "null" : typeof value === "string" ? encodeString(value) : String(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) throw new TypeError("JCS values must not contain floats");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(jcsRfc8785).join(",")}]`;
  const keys = Object.keys(value).sort(compareUtf16);
  return `{${keys.map((key) => `${encodeString(key)}:${jcsRfc8785(value[key])}`).join(",")}}`;
}
