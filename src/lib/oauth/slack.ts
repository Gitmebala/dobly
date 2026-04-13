import crypto from "crypto";

const SLACK_SCOPES = (process.env.SLACK_SCOPES ??
  "chat:write,channels:read,groups:read,users:read") as string;

function signState(payload: string) {
  const key = process.env.ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dobly";
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

export function createSlackState(input: { userId: string }) {
  const payload = Buffer.from(JSON.stringify(input)).toString("base64url");
  const signature = signState(payload);
  return `${payload}.${signature}`;
}

export function readSlackState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || signState(payload) !== signature) {
    throw new Error("Invalid Slack OAuth state.");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: string };
}

export function buildSlackAuthUrl(params: { userId: string; appUrl: string }) {
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID ?? "");
  url.searchParams.set("scope", SLACK_SCOPES);
  url.searchParams.set("redirect_uri", `${params.appUrl}/api/oauth/slack/callback`);
  url.searchParams.set("state", createSlackState({ userId: params.userId }));
  return url.toString();
}

export async function exchangeSlackCode(params: { code: string; appUrl: string }) {
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
      redirect_uri: `${params.appUrl}/api/oauth/slack/callback`,
    }),
  });

  const data = (await response.json()) as Record<string, any>;
  if (!response.ok || !data.ok) {
    throw new Error(`Slack OAuth failed: ${JSON.stringify(data)}`);
  }

  return data;
}
