import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz23456789!@#$%^&*";

export function generateTempPassword(len = 14) {
  const buf = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length];
  }

  // Ensure minimal complexity (quick check; you can harden more if you want)
  if (!/[A-Z]/.test(out)) out = "A" + out.slice(1);
  if (!/[a-z]/.test(out)) out = out.slice(0, -1) + "a";
  if (!/[0-9]/.test(out)) out = out.slice(0, -1) + "3";
  if (!/[!@#$%^&*]/.test(out)) out = out.slice(0, -1) + "!";
  
  return out;
}