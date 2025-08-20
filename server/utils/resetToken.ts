import crypto from "crypto";

// Create a 32-byte (256-bit) token, URL-safe
export function createRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url"); // node >=16
}

// Store only a hash of the token
export function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// 15 minutes is a good default; set higher if your users need more time
export const DEFAULT_RESET_TTL_MS = 15 * 60 * 1000;