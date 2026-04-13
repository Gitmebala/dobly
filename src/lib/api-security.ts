import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export function getRequestIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function applyRateLimit(
  identifier: string,
  options: { limit: number; windowSeconds: number }
) {
  const result = checkRateLimit(identifier, options);
  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

export function assertSafeAppUrl(url: string) {
  const parsed = new URL(url);
  const isLocalhost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname.endsWith(".local");

  if (parsed.protocol !== "https:" && !isLocalhost) {
    throw new Error("Only https URLs are allowed for remote browser tasks.");
  }

  if (
    ["javascript:", "data:", "file:", "chrome:", "chrome-extension:"].includes(
      parsed.protocol
    )
  ) {
    throw new Error("Unsafe browser target protocol.");
  }

  return parsed.toString();
}
