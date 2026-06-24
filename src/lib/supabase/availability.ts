import "server-only";
import { lookup } from "node:dns/promises";

let lastCheck:
  | {
      host: string;
      reachable: boolean;
      checkedAt: number;
    }
  | undefined;

export async function isSupabaseReachable() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!rawUrl) return false;

  let host: string;
  try {
    host = new URL(rawUrl).hostname;
  } catch {
    return false;
  }

  if (
    lastCheck &&
    lastCheck.host === host &&
    Date.now() - lastCheck.checkedAt < 30_000
  ) {
    return lastCheck.reachable;
  }

  try {
    await Promise.race([
      lookup(host),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS lookup timed out")), 3_000)
      ),
    ]);
    lastCheck = { host, reachable: true, checkedAt: Date.now() };
    return true;
  } catch {
    lastCheck = { host, reachable: false, checkedAt: Date.now() };
    return false;
  }
}
