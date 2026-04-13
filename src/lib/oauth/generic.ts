import crypto from "crypto";

export type GenericOAuthProvider =
  | "microsoft"
  | "notion"
  | "hubspot"
  | "airtable"
  | "stripe"
  | "meta";

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes: string[];
  scopeSeparator?: "space" | "comma";
  extraAuthParams?: Record<string, string>;
  profile: (accessToken: string) => Promise<{
    label: string;
    accountIdentifier: string | null;
    metadata?: Record<string, unknown>;
  }>;
};

function signState(payload: string) {
  const key = process.env.ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dobly";
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

function getConfig(provider: GenericOAuthProvider): ProviderConfig {
  switch (provider) {
    case "microsoft":
      return {
        authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        clientIdEnv: "MICROSOFT_CLIENT_ID",
        clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
        scopes: ["offline_access", "openid", "profile", "email", "Mail.Send", "Calendars.Read", "User.Read"],
        profile: async (accessToken) => {
          const response = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) throw new Error("Failed to load Microsoft profile.");
          const data = (await response.json()) as Record<string, any>;
          return {
            label: String(data.mail ?? data.userPrincipalName ?? "Microsoft account"),
            accountIdentifier: String(data.mail ?? data.userPrincipalName ?? ""),
            metadata: { id: data.id ?? null, displayName: data.displayName ?? null },
          };
        },
      };
    case "notion":
      return {
        authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
        tokenUrl: "https://api.notion.com/v1/oauth/token",
        clientIdEnv: "NOTION_CLIENT_ID",
        clientSecretEnv: "NOTION_CLIENT_SECRET",
        scopes: [],
        extraAuthParams: { owner: "user" },
        profile: async (accessToken) => {
          const response = await fetch("https://api.notion.com/v1/users/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Notion-Version": "2022-06-28",
            },
          });
          if (!response.ok) throw new Error("Failed to load Notion profile.");
          const data = (await response.json()) as Record<string, any>;
          return {
            label: String(data.name ?? "Notion workspace"),
            accountIdentifier: String(data.person?.email ?? data.id ?? ""),
            metadata: { notionUserId: data.id ?? null },
          };
        },
      };
    case "hubspot":
      return {
        authorizeUrl: "https://app.hubspot.com/oauth/authorize",
        tokenUrl: "https://api.hubapi.com/oauth/v1/token",
        clientIdEnv: "HUBSPOT_CLIENT_ID",
        clientSecretEnv: "HUBSPOT_CLIENT_SECRET",
        scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write", "oauth"],
        profile: async (accessToken) => {
          const response = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + accessToken, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) throw new Error("Failed to load HubSpot profile.");
          const data = (await response.json()) as Record<string, any>;
          return {
            label: `HubSpot portal ${String(data.hub_id ?? "")}`.trim(),
            accountIdentifier: data.hub_id ? String(data.hub_id) : null,
            metadata: { hubId: data.hub_id ?? null, user: data.user ?? null },
          };
        },
      };
    case "airtable":
      return {
        authorizeUrl: "https://airtable.com/oauth2/v1/authorize",
        tokenUrl: "https://airtable.com/oauth2/v1/token",
        clientIdEnv: "AIRTABLE_CLIENT_ID",
        clientSecretEnv: "AIRTABLE_CLIENT_SECRET",
        scopes: ["data.records:read", "data.records:write", "schema.bases:read"],
        profile: async (accessToken) => {
          const response = await fetch("https://api.airtable.com/v0/meta/whoami", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) throw new Error("Failed to load Airtable profile.");
          const data = (await response.json()) as Record<string, any>;
          return {
            label: String(data.email ?? "Airtable workspace"),
            accountIdentifier: String(data.id ?? data.email ?? ""),
            metadata: { id: data.id ?? null, email: data.email ?? null },
          };
        },
      };
    case "stripe":
      return {
        authorizeUrl: "https://connect.stripe.com/oauth/authorize",
        tokenUrl: "https://connect.stripe.com/oauth/token",
        clientIdEnv: "STRIPE_CONNECT_CLIENT_ID",
        clientSecretEnv: "STRIPE_SECRET_KEY",
        scopes: ["read_write"],
        profile: async (accessToken) => {
          return {
            label: "Stripe account",
            accountIdentifier: null,
            metadata: { connected: true },
          };
        },
      };
    case "meta":
      return {
        authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
        clientIdEnv: "META_APP_ID",
        clientSecretEnv: "META_APP_SECRET",
        scopes: ["pages_show_list", "pages_manage_metadata", "instagram_basic", "instagram_manage_messages"],
        profile: async (accessToken) => {
          const response = await fetch("https://graph.facebook.com/me?fields=id,name&access_token=" + encodeURIComponent(accessToken));
          if (!response.ok) throw new Error("Failed to load Meta profile.");
          const data = (await response.json()) as Record<string, any>;
          return {
            label: String(data.name ?? "Meta business"),
            accountIdentifier: data.id ? String(data.id) : null,
            metadata: { id: data.id ?? null, name: data.name ?? null },
          };
        },
      };
  }
}

export function createGenericOAuthState(input: { provider: GenericOAuthProvider; userId: string }) {
  const payload = Buffer.from(JSON.stringify(input)).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function readGenericOAuthState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || signState(payload) !== signature) {
    throw new Error("Invalid OAuth state.");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { provider: GenericOAuthProvider; userId: string };
}

export function buildGenericOAuthUrl(input: { provider: GenericOAuthProvider; userId: string; appUrl: string }) {
  const config = getConfig(input.provider);
  const url = new URL(config.authorizeUrl);
  const clientId = process.env[config.clientIdEnv] ?? "";
  const scopeValue = config.scopes.join(config.scopeSeparator === "comma" ? "," : " ");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${input.appUrl}/api/oauth/${input.provider}/callback`);
  url.searchParams.set("response_type", "code");
  if (scopeValue) {
    url.searchParams.set("scope", scopeValue);
  }
  url.searchParams.set("state", createGenericOAuthState({ provider: input.provider, userId: input.userId }));
  for (const [key, value] of Object.entries(config.extraAuthParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function exchangeGenericOAuthCode(input: { provider: GenericOAuthProvider; code: string; appUrl: string }) {
  const config = getConfig(input.provider);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: process.env[config.clientIdEnv] ?? "",
    client_secret: process.env[config.clientSecretEnv] ?? "",
    redirect_uri: `${input.appUrl}/api/oauth/${input.provider}/callback`,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`${input.provider} OAuth token exchange failed.`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
}

export async function fetchGenericOAuthProfile(provider: GenericOAuthProvider, accessToken: string) {
  return getConfig(provider).profile(accessToken);
}
