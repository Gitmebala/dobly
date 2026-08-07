import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createLocalAdminClient, createLocalServerClient, localUserFromCookie } from "@/lib/local-runtime/client";
import { LOCAL_SESSION_COOKIE } from "@/lib/local-runtime/auth";
import { isLocalModeActive } from "@/lib/local-runtime/guard";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

// A user closing the browser and reopening it later had to sign in
// again every time. @supabase/ssr computes a maxAge for its auth
// cookies from the session, but that computation can come back short
// or absent depending on how the session was issued (password vs.
// OAuth vs. refresh) - the visible symptom either way is a
// session-only cookie that Chrome deletes when the browser process
// fully closes, not just when a tab closes. Force a 90-day floor on
// the auth-token cookie specifically so "remember me" actually means
// something, regardless of what the library computed.
const AUTH_COOKIE_MIN_MAX_AGE = 60 * 60 * 24 * 90;

function withPersistentCookieOptions(name: string, options?: Record<string, unknown>) {
  if (!name.startsWith("sb-") || !name.includes("-auth-token")) return options;
  const currentMaxAge = typeof options?.maxAge === "number" ? options.maxAge : 0;
  if (currentMaxAge >= AUTH_COOKIE_MIN_MAX_AGE) return options;
  return { ...options, maxAge: AUTH_COOKIE_MIN_MAX_AGE };
}

function timedFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(5000),
  });
}

// Server-side Supabase client with cookie-based auth
// Used in Server Components and API Routes
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  if (isLocalModeActive()) {
    return createLocalServerClient(
      localUserFromCookie(cookieStore.get(LOCAL_SESSION_COOKIE)?.value),
    ) as any;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        fetch: timedFetch,
        headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, withPersistentCookieOptions(name, options))
            );
          } catch (error) {
            // Expected in Server Components, where the cookie store is
            // read-only and middleware handles the refresh instead. NOT
            // expected in a Route Handler - there it means a session write
            // was silently dropped, which is how "signed in but immediately
            // bounced back to login" happens. Log it so that case is
            // diagnosable instead of invisible (this empty catch has now
            // hidden three separate production bugs in this codebase).
            console.warn(
              "[supabase/server] could not persist auth cookies:",
              error instanceof Error ? error.message : error,
            );
          }
        },
      },
    }
  );
}

// Admin client — ONLY use in trusted server-side code, NEVER in client
// Uses service role key which bypasses RLS
export function createAdminSupabaseClient() {
  if (isLocalModeActive()) {
    return createLocalAdminClient() as any;
  }
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
