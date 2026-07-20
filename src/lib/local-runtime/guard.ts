import "server-only";

/**
 * Local mode writes a JSON file to disk instead of calling Supabase — a
 * convenience for running the app with zero setup on a laptop. It must
 * never activate on a real deployment: Vercel (and every other
 * serverless host) mounts the filesystem read-only outside /tmp, so a
 * write there fails as a cryptic ENOENT deep in a signup request
 * instead of a clear configuration error.
 *
 * DOBLY_LOCAL_MODE lives in .env.local, which is gitignored and never
 * shipped — but nothing stops the same flag from being pasted into a
 * hosting dashboard by mistake. Vercel always sets its own VERCEL env
 * var, so we treat that as the authority: local mode is refused there
 * regardless of what DOBLY_LOCAL_MODE says.
 */
export function isLocalModeActive(): boolean {
  if (process.env.VERCEL) return false;
  return process.env.DOBLY_LOCAL_MODE === "true";
}
