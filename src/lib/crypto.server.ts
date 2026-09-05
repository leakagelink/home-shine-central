/**
 * Server-only credential hashing helpers.
 *
 * PINs and OTPs are never stored or logged in plain text. We derive a
 * PBKDF2-SHA256 key with a per-record random salt and compare in constant time.
 * Web Crypto is used so this runs on the edge worker runtime without native deps.
 */

const PBKDF2_ITERATIONS = 210_000;
const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSalt(bytes = 16): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer as ArrayBuffer);
}

export async function deriveHash(secret: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashSecret(secret: string): Promise<{ hash: string; salt: string }> {
  const salt = randomSalt();
  return { hash: await deriveHash(secret, salt), salt };
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySecret(
  secret: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  return timingSafeEqual(await deriveHash(secret, salt), expectedHash);
}

/** Cryptographically strong numeric code, e.g. 6 digits. */
export function randomNumericCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => (b % 10).toString())
    .join("");
}

export function randomToken(bytes = 32): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer as ArrayBuffer);
}
