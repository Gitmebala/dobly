import crypto from "crypto";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/spreadsheets",
];

function signState(payload: string) {
  const key = process.env.ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dobly";
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

export function createGoogleState(input: { userId: string }) {
  const payload = Buffer.from(JSON.stringify(input)).toString("base64url");
  const signature = signState(payload);
  return `${payload}.${signature}`;
}

export function readGoogleState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || signState(payload) !== signature) {
    throw new Error("Invalid OAuth state.");
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId: string;
  };
}

export function buildGoogleAuthUrl(params: { userId: string; appUrl: string }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", `${params.appUrl}/api/oauth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("state", createGoogleState({ userId: params.userId }));
  return url.toString();
}

export async function exchangeGoogleCode(params: { code: string; appUrl: string }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${params.appUrl}/api/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Google OAuth code.");
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    id_token?: string;
  };
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to load Google profile.");
  }

  return (await response.json()) as {
    id: string;
    email: string;
    name?: string;
  };
}
