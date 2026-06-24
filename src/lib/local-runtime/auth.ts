import "server-only";
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { mutateTable, readTable } from "./store";

export const LOCAL_SESSION_COOKIE = "dobly-local-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type LocalUserRecord = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: string;
  session_version?: number;
};

export type LocalUser = {
  id: string;
  email: string;
  session_version: number;
  user_metadata: { full_name: string };
};

function secret() {
  const value = process.env.COOKIE_SIGNING_SECRET || process.env.ENCRYPTION_KEY;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("COOKIE_SIGNING_SECRET is required when local authentication is enabled in production.");
  }
  return value || "dobly-local-development-secret";
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string, sessionVersion = 1) {
  const payload = Buffer.from(
    JSON.stringify({ userId, sessionVersion, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function sessionCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function userFromSessionToken(token?: string | null): Promise<LocalUser | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: string;
      expiresAt: number;
      sessionVersion?: number;
    };
    if (!parsed.userId || parsed.expiresAt < Date.now()) return null;
    const users = (await readTable("_users")) as unknown as LocalUserRecord[];
    const user = users.find((candidate) => candidate.id === parsed.userId);
    return user && (parsed.sessionVersion ?? 1) === (user.session_version ?? 1) ? toPublicUser(user) : null;
  } catch {
    return null;
  }
}

export async function registerLocalUser(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = ((await readTable("_users")) as unknown as LocalUserRecord[]).find(
    (user) => user.email === email,
  );
  if (existing) throw new Error("An account with this email already exists.");

  const record: LocalUserRecord = {
    id: randomUUID(),
    email,
    password_hash: hashPassword(input.password),
    full_name: input.fullName.trim(),
    created_at: new Date().toISOString(),
    session_version: 1,
  };

  await mutateTable("_users", (rows) => rows.push(record as unknown as Record<string, unknown>));
  await mutateTable("profiles", (rows) =>
    rows.push({
      id: record.id,
      email: record.email,
      full_name: record.full_name,
      plan: "free",
      created_at: record.created_at,
      updated_at: record.created_at,
    }),
  );
  return toPublicUser(record);
}

export async function authenticateLocalUser(email: string, password: string) {
  const users = (await readTable("_users")) as unknown as LocalUserRecord[];
  const user = users.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return toPublicUser(user);
}

export async function createLocalPasswordReset(email: string) {
  const users = (await readTable("_users")) as unknown as LocalUserRecord[];
  const user = users.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user) return null;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await mutateTable("_password_reset_tokens", (rows) => {
    const now = Date.now();
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (rows[index].user_id === user.id || Number(rows[index].expires_at ?? 0) <= now) {
        rows.splice(index, 1);
      }
    }
    rows.push({
      id: randomUUID(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: now + 30 * 60 * 1000,
      created_at: new Date().toISOString(),
    });
  });
  return token;
}

export async function resetLocalPassword(token: string, password: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  let userId = "";
  await mutateTable("_password_reset_tokens", (rows) => {
    const index = rows.findIndex(
      (row) => row.token_hash === tokenHash && Number(row.expires_at ?? 0) > Date.now(),
    );
    if (index >= 0) {
      userId = String(rows[index].user_id ?? "");
      rows.splice(index, 1);
    }
  });
  if (!userId) return false;

  await mutateTable("_users", (rows) => {
    const index = rows.findIndex((row) => row.id === userId);
    if (index >= 0) rows[index] = {
      ...rows[index],
      password_hash: hashPassword(password),
      session_version: Number(rows[index].session_version ?? 1) + 1,
    };
  });
  return true;
}

function toPublicUser(user: LocalUserRecord): LocalUser {
  return {
    id: user.id,
    email: user.email,
    session_version: user.session_version ?? 1,
    user_metadata: { full_name: user.full_name },
  };
}
