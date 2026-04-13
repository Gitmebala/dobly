import crypto from "crypto";

const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES ?? "read_customers,write_customers";

function signState(payload: string) {
  const key = process.env.SHOPIFY_API_SECRET ?? process.env.ENCRYPTION_KEY ?? "dobly";
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

export function createShopifyState(input: { userId: string; shop: string }) {
  const payload = Buffer.from(JSON.stringify(input)).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function readShopifyState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || signState(payload) !== signature) {
    throw new Error("Invalid Shopify OAuth state.");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId: string;
    shop: string;
  };
}

export function buildShopifyAuthUrl(params: {
  userId: string;
  shop: string;
  appUrl: string;
}) {
  const url = new URL(`https://${params.shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", process.env.SHOPIFY_API_KEY ?? "");
  url.searchParams.set("scope", SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", `${params.appUrl}/api/oauth/shopify/callback`);
  url.searchParams.set("state", createShopifyState({ userId: params.userId, shop: params.shop }));
  return url.toString();
}

export function verifyShopifyHmac(searchParams: URLSearchParams) {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const sorted = Array.from(searchParams.entries())
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET ?? "")
    .update(sorted)
    .digest("hex");

  return digest === hmac;
}

export async function exchangeShopifyCode(params: {
  code: string;
  shop: string;
  appUrl: string;
}) {
  const response = await fetch(`https://${params.shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY ?? "",
      client_secret: process.env.SHOPIFY_API_SECRET ?? "",
      code: params.code,
    }),
  });

  const data = (await response.json()) as Record<string, any>;
  if (!response.ok || !data.access_token) {
    throw new Error(`Shopify OAuth failed: ${JSON.stringify(data)}`);
  }

  return data;
}
