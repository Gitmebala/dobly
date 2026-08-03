import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not configured.");
  }

  // Prefer base64 whenever it decodes to exactly 32 bytes - unpadded base64
  // (43 chars, no trailing "=") is valid and decodes correctly, but was
  // previously only recognised at the padded 44-char length, so a real
  // 32-byte key configured without padding fell through to being read as
  // raw UTF-8 (43 bytes) and always failed the length check below.
  const base64Key = Buffer.from(raw, "base64");
  const key = base64Key.length === 32 ? base64Key : Buffer.from(raw, "utf8");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes or base64 for 32 bytes.");
  }

  return key;
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string | null | undefined) {
  if (!payload) return null;

  const key = getEncryptionKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
