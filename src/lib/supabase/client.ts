import { createBrowserClient } from "@supabase/ssr";

// Singleton pattern - one client per browser session
let client: ReturnType<typeof createBrowserClient> | null = null;

function timedFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(5000),
  });
}

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: timedFetch } },
  );

  return client;
}
