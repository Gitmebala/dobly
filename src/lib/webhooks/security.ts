import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export function verifySharedSecret(req: NextRequest, headerName: string, expectedSecret?: string | null) {
  if (!expectedSecret) return false;
  const received = req.headers.get(headerName);
  if (!received) return false;
  return received === expectedSecret;
}

export async function verifyHmacSignature(params: {
  req: NextRequest;
  rawBody: string;
  secret?: string | null;
  signatureHeader?: string;
}) {
  if (!params.secret) return false;
  const signature = params.req.headers.get(params.signatureHeader ?? "x-dobly-signature");
  if (!signature) return false;

  const expected = createHmac("sha256", params.secret).update(params.rawBody).digest("hex");
  const left = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isWebhookSecurityDisabledForDev() {
  return process.env.NODE_ENV !== "production" && process.env.DOBLY_ALLOW_UNSIGNED_WEBHOOKS === "true";
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getPublicRequestUrl(req: NextRequest) {
  const publicBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!publicBase) return req.url;
  return `${publicBase}${req.nextUrl.pathname}${req.nextUrl.search}`;
}

export function verifyTwilioSignature(params: {
  req: NextRequest;
  formData: FormData;
  authToken?: string | null;
  url?: string | null;
}) {
  const authToken = params.authToken ?? process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  const signature = params.req.headers.get("x-twilio-signature");
  if (!signature) return false;

  const sortedParams = Array.from(params.formData.entries())
    .filter(([, value]) => typeof value === "string")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${String(value)}`)
    .join("");

  const url = params.url ?? getPublicRequestUrl(params.req);
  const expected = createHmac("sha1", authToken)
    .update(`${url}${sortedParams}`)
    .digest("base64");

  return safeEqualText(signature, expected);
}
