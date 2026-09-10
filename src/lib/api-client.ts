/**
 * Browser-side API helper that never throws.
 *
 * Components across the dashboard called `fetch` directly and checked
 * `response.ok`, which handles a server that answered with an error but not a
 * `fetch` that rejects outright - offline, DNS failure, a dropped connection,
 * a request aborted mid-flight. Inside `startTransition` (or any un-awaited
 * handler) that rejection is swallowed: no message is set, no state is reset,
 * and the button simply spins forever with nothing shown to the user. 30 call
 * sites across 16 components had this shape.
 *
 * Returning a discriminated result instead of throwing means the caller has to
 * deal with failure to get at the data, and every failure carries a sentence
 * that can go straight on screen.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

/** Pull the most useful message out of whatever the server actually sent. */
function messageFromPayload(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["error", "message", "setupWarning"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 402) return "That is not included in the current plan.";
  if (status === 403) return "You do not have access to do that.";
  if (status === 429) return "Too many requests just now. Try again in a moment.";
  if (status >= 500) return "Something went wrong on our side. Try again in a moment.";
  return "That did not work. Try again.";
}

export async function apiRequest<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  const { timeoutMs = 30000, ...requestInit } = init ?? {};

  let response: Response;
  try {
    response = await fetch(url, {
      ...requestInit,
      // Without this a hung connection leaves the caller pending forever,
      // which is the same stuck-button symptom as an unhandled rejection.
      signal: requestInit.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "TimeoutError";
    return {
      ok: false,
      status: 0,
      error: aborted
        ? "That took too long to respond. Check your connection and try again."
        : "Could not reach Dobly. Check your connection and try again.",
    };
  }

  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    return { ok: false, status: response.status, error: messageFromPayload(payload, response.status) };
  }

  return { ok: true, data: (payload ?? ({} as T)) as T };
}

/** POST/PATCH JSON in one call - the shape almost every mutation here uses. */
export function apiSend<T = Record<string, unknown>>(
  url: string,
  body: unknown,
  init?: RequestInit & { timeoutMs?: number },
) {
  return apiRequest<T>(url, {
    method: "POST",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
  });
}
