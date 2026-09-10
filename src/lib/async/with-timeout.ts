/**
 * Resolve to `fallback` if `work` has not settled within `ms`.
 *
 * Server components await their data before rendering anything, and a Supabase
 * query carries no timeout of its own. A slow or unreachable database
 * therefore does not produce an error page - it produces a page that never
 * finishes, so the route's loading.tsx skeleton stays on screen forever with
 * no error, no retry and nothing to click. (This is what /dashboard/approvals
 * did.) A `.catch()` cannot help: nothing rejects.
 *
 * The underlying promise is not cancelled - it is abandoned. That is the point:
 * the page renders in a degraded but usable state instead of hanging, and any
 * late result is simply discarded.
 */
export async function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Budget for a single dashboard data load before the page renders degraded. */
export const DASHBOARD_LOAD_TIMEOUT_MS = 8000;
