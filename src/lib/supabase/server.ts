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
              cookieStore.set(name, value, options)
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
