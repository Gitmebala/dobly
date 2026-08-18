import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalModeActive } from "@/lib/local-runtime/guard";

async function distributedPublicRateLimit(request: NextRequest, pathname: string) {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!endpoint || !token) return null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const isAuth = pathname.startsWith("/api/auth");
  const windowSeconds = isAuth ? 900 : 60;
  const limit = isAuth ? 10 : 120;
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `dobly:edge:${pathname}:${ip}:${bucket}`;
  try {
    const response = await fetch(`${endpoint}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, windowSeconds + 5]]),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const result = await response.json() as Array<{ result?: number }>;
    if (Number(result[0]?.result ?? 0) > limit) {
      return NextResponse.json({ error: "Too many requests. Please wait and try again." }, {
        status: 429,
        headers: { "Retry-After": String(windowSeconds) },
      });
    }
  } catch {
    // Route-level limits remain active if the optional distributed store is unavailable.
  }
  return null;
}

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

// See the matching comment in src/lib/supabase/server.ts - forces a
// 90-day floor on the auth-token cookie so signing in actually
// survives closing and reopening the browser, instead of relying on
// whatever maxAge @supabase/ssr happened to compute for that session.
const AUTH_COOKIE_MIN_MAX_AGE = 60 * 60 * 24 * 90;

function withPersistentCookieOptions(name: string, options?: Record<string, unknown>) {
  if (!name.startsWith("sb-") || !name.includes("-auth-token")) return options;
  const currentMaxAge = typeof options?.maxAge === "number" ? options.maxAge : 0;
  if (currentMaxAge >= AUTH_COOKIE_MIN_MAX_AGE) return options;
  return { ...options, maxAge: AUTH_COOKIE_MIN_MAX_AGE };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const publicApiPrefixes = [
    "/api/auth",
    "/api/health",
    "/api/billing/plans",
    "/api/coverage/use-cases",
    "/api/newsletter",
    "/api/oauth",
    "/api/webhooks",
    "/api/triggers/webhook",
    "/api/internal",
    "/api/connections/verify-link",
    "/api/chat/widget",
    // Never had a real user session to begin with - authenticated by its
    // own CRON_SECRET bearer check in the route itself (see
    // src/app/api/cron/process-queue/route.ts). Leaving it out of this
    // list meant this middleware tried to validate that secret as a
    // Supabase session JWT instead, which it will never be, so every
    // cron/heartbeat request 401'd here before ever reaching the route's
    // own (correct) auth check - the actual root cause of "coworkers
    // don't run recurringly," confirmed live: the GitHub Actions
    // heartbeat kept getting a bare {"error":"Unauthorized"} with none
    // of the route's own diagnostic fields, proving it never ran.
    "/api/cron",
  ];
  // Loop triggers (api/loops/[id]/trigger/[token], api/loops/[id]/github)
  // are meant to be POSTed by external services - Zapier, GitHub, Stripe,
  // anything - that will never carry a Dobly session cookie or bearer
  // token. Each of those routes has its own real verification (a signed
  // token or an HMAC signature, checked inside the route), the same shape
  // as api/cron's own CRON_SECRET check - but without an explicit
  // exemption here, this middleware 401s the request before it ever
  // reaches that check, exactly the bug already found and fixed once for
  // api/cron (see the comment above). NOT a blanket /api/loops exemption:
  // api/loops/[id] (pause/resume) and api/loops/[id]/regenerate are
  // genuine user actions from inside Dobly and must stay behind normal
  // session auth - only these two trigger-firing sub-paths are public.
  const isLoopTriggerPath = /^\/api\/loops\/[^/]+\/(trigger\/[^/]+|github)\/?$/.test(pathname);
  const isPublicApi = isLoopTriggerPath || publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
  // "/api" (no trailing slash) is a real page (src/app/api/page.tsx), not
  // an API route - startsWith("/api") without the slash also matched that
  // bare path, so middleware hard-401'd it before Next.js routing ever
  // reached the page component, live-verified via the actual dev server.
  // Every other /api-prefixed check in this file already uses the
  // trailing-slash form; this was the one inconsistent spot.
  const isProtectedApi = pathname.startsWith("/api/") && !isPublicApi;
  const isProtectedPage = ["/dashboard", "/admin"].some((prefix) =>
    pathname.startsWith(prefix)
  );
  const authRoutes = ["/auth/login", "/auth/signup"];
  const localMode = isLocalModeActive();
  const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  const csrfExemptPrefixes = ["/api/webhooks", "/api/internal", "/api/triggers/webhook", "/api/chat/widget"];
  if (pathname.startsWith("/api/") && unsafeMethod && !isLoopTriggerPath && !csrfExemptPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const origin = request.headers.get("origin");
    if (origin) {
      const allowed = new Set([request.nextUrl.origin]);
      try { if (process.env.NEXT_PUBLIC_APP_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin); } catch {}
      if (!allowed.has(origin)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }
  if (isPublicApi) {
    const limited = await distributedPublicRateLimit(request, pathname);
    if (limited) return limited;
  }

  if (authRoutes.includes(pathname) || (!isProtectedApi && !isProtectedPage)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const authorization = request.headers.get("authorization");
  const bearerToken = localMode ? undefined : authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  const hasAuthCookie = localMode
    ? Boolean(request.cookies.get("dobly-local-session")?.value)
    : request.cookies
        .getAll()
        .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));

  if (!hasAuthCookie && !bearerToken) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (localMode) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
        fetch(input: RequestInfo | URL, init?: RequestInit) {
          return fetch(input, {
            ...init,
            signal: init?.signal ?? AbortSignal.timeout(5000),
          });
        },
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, withPersistentCookieOptions(name, options))
          );
        },
      },
    }
  );

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("[middleware] authentication service unavailable", error);
  }

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedPage && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  supabaseResponse.headers.set("x-request-id", requestId);
  if (pathname.startsWith("/api/")) supabaseResponse.headers.set("cache-control", "private, no-store");
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
