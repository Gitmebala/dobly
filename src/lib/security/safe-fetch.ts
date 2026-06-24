import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isBlockedNetworkAddress } from "@/lib/security/network-core";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export async function assertSafeOutboundUrl(rawUrl: string | URL, options?: { allowPrivateNetwork?: boolean }) {
  const url = rawUrl instanceof URL ? new URL(rawUrl) : new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("Credentials in URLs are not allowed.");
  if (url.protocol === "http:" && process.env.NODE_ENV === "production") {
    throw new Error("Connected services must use HTTPS in production.");
  }

  const allowPrivateNetwork = options?.allowPrivateNetwork === true &&
    process.env.DOBLY_ALLOW_PRIVATE_CONNECTORS === "true";
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("The connected service hostname could not be resolved.");
  if (!allowPrivateNetwork && addresses.some(({ address }) => isBlockedNetworkAddress(address))) {
    throw new Error("Private, local, and reserved network addresses are blocked.");
  }
  return url;
}

async function readBoundedBody(response: Response, maxBytes: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Connected service response exceeded ${maxBytes} bytes.`);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export interface SafeFetchResult {
  response: Response;
  text: string;
  finalUrl: string;
}

export async function safeOutboundFetch(
  rawUrl: string | URL,
  init: RequestInit = {},
  options: { allowPrivateNetwork?: boolean; timeoutMs?: number; maxResponseBytes?: number } = {},
): Promise<SafeFetchResult> {
  let url = await assertSafeOutboundUrl(rawUrl, options);
  let method = String(init.method ?? "GET").toUpperCase();
  let body = init.body;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, { ...init, method, body, redirect: "manual", signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("Connected service request timed out.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Connected service returned an invalid redirect.");
      if (redirect === MAX_REDIRECTS) throw new Error("Connected service redirected too many times.");
      url = await assertSafeOutboundUrl(new URL(location, url), options);
      if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === "POST")) {
        method = "GET";
        body = undefined;
      }
      continue;
    }

    const text = await readBoundedBody(response, options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES);
    return { response, text, finalUrl: url.toString() };
  }
  throw new Error("Connected service request failed.");
}
