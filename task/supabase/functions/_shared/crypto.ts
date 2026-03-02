/**
 * crypto.ts — AES-256-GCM encryption/decryption utility
 *
 * Used by exchange-google-code (encrypt) and get-google-token (decrypt).
 *
 * Requires env: TOKEN_ENCRYPTION_KEY
 *   Generate with: openssl rand -base64 32
 *   Set with: supabase secrets set TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)
 */

declare const Deno: any;

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM

/**
 * Derive a CryptoKey from the TOKEN_ENCRYPTION_KEY env variable.
 * The raw key is base64-decoded and imported as AES-256-GCM.
 */
async function getDerivedKey(): Promise<CryptoKey> {
  const rawKeyB64 = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!rawKeyB64) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }

  // Decode base64 → raw bytes
  const rawBytes = Uint8Array.from(atob(rawKeyB64), (c) => c.charCodeAt(0));

  if (rawBytes.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be 32 bytes (256-bit). Got ${rawBytes.length} bytes. ` +
        "Generate with: openssl rand -base64 32"
    );
  }

  return crypto.subtle.importKey(
    "raw",
    rawBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string.
 * Returns: base64url( iv || ciphertext ) — the IV is prepended for storage.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine iv + ciphertext into one buffer
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  // Return as base64url
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decrypt a base64url-encoded encrypted string produced by `encrypt()`.
 * Returns the original plaintext string.
 */
export async function decrypt(encryptedB64: string): Promise<string> {
  const key = await getDerivedKey();

  // Restore standard base64 padding
  const b64 = encryptedB64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(encryptedB64.length + ((4 - (encryptedB64.length % 4)) % 4), "=");

  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
