// Simple in-memory rate limiter for API routes
// For production: replace with Upstash Redis or similar

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const key = `rl:${identifier}`;

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// Preset rate limits
export const rateLimits = {
  // AI generation: 10 per minute per user
  generate: (userId: string) =>
    checkRateLimit(`generate:${userId}`, { limit: 10, windowSeconds: 60 }),

  // Auth endpoints: 5 per 15 minutes per IP
  auth: (ip: string) =>
    checkRateLimit(`auth:${ip}`, { limit: 5, windowSeconds: 900 }),

  // General API: 100 per minute per user
  api: (userId: string) =>
    checkRateLimit(`api:${userId}`, { limit: 100, windowSeconds: 60 }),

  write: (identifier: string) =>
    checkRateLimit(`write:${identifier}`, { limit: 30, windowSeconds: 60 }),

  webhook: (identifier: string) =>
    checkRateLimit(`webhook:${identifier}`, { limit: 20, windowSeconds: 60 }),

  oauth: (identifier: string) =>
    checkRateLimit(`oauth:${identifier}`, { limit: 20, windowSeconds: 300 }),

  agent: (identifier: string) =>
    checkRateLimit(`agent:${identifier}`, { limit: 120, windowSeconds: 60 }),

  artifact: (identifier: string) =>
    checkRateLimit(`artifact:${identifier}`, { limit: 60, windowSeconds: 60 }),

  business: (identifier: string) =>
    checkRateLimit(`business:${identifier}`, { limit: 12, windowSeconds: 60 }),
};
