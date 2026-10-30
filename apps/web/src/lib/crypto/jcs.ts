export type JcsValue = null | boolean | number | string | JcsValue[] | { [key: string]: JcsValue };

function encodeString(value: string): string {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const isHighSurrogate = codeUnit >= 0xd800 && codeUnit <= 0xdbff;
    const isLowSurrogate = codeUnit >= 0xdc00 && codeUnit <= 0xdfff;

    if (isHighSurrogate) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) {
        throw new TypeError("JCS strings must not contain unpaired surrogates");
      }
      index += 1;
    } else if (isLowSurrogate) {
      throw new TypeError("JCS strings must not contain unpaired surrogates");
    }
  }

  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string") {
    throw new TypeError("JCS strings must be JSON serializable");
  }
  return encoded;
}

function compareUtf16(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const leftCodeUnit = a.charCodeAt(index);
    const rightCodeUnit = b.charCodeAt(index);
    if (leftCodeUnit !== rightCodeUnit) return leftCodeUnit - rightCodeUnit;
  }
  return a.length - b.length;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function serialize(value: unknown): string {
  if (value === null) return "null";

  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return encodeString(value);

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new TypeError("JCS values must not contain floats");
    }
    if (!Number.isSafeInteger(value)) {
      throw new TypeError("JCS integers must be safe integers");
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    const ownKeys = Reflect.ownKeys(value);
    let elementCount = 0;
    for (const key of ownKeys) {
      if (typeof key === "symbol" || key === "length") continue;
      if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) {
        throw new TypeError("JCS arrays must not contain extra properties");
      }
      elementCount += 1;
    }
    if (elementCount !== value.length) {
      throw new TypeError("JCS arrays must not be sparse");
    }
    for (const key of ownKeys) {
      if (key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new TypeError("JCS arrays must contain data properties");
      }
    }

    return `[${value.map(serialize).join(",")}]`;
  }

  if (typeof value !== "object") {
    throw new TypeError("Unsupported JCS value type");
  }
  if (!isPlainObject(value)) {
    throw new TypeError("JCS objects must be plain objects");
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    throw new TypeError("JCS objects must not contain symbol keys");
  }

  const enumerableKeys = Object.keys(value);
  if (ownKeys.length !== enumerableKeys.length) {
    throw new TypeError("JCS objects must only contain enumerable properties");
  }
  for (const key of enumerableKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new TypeError("JCS objects must contain data properties");
    }
  }

  const keys = enumerableKeys.sort(compareUtf16);
  const record = value as { [key: string]: unknown };
  return `{${keys.map((key) => `${encodeString(key)}:${serialize(record[key])}`).join(",")}}`;
}

export function jcsRfc8785(value: JcsValue): string {
  return serialize(value);
}
