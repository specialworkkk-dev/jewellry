type Entry = { count: number; resetAt: number };

const globalRateLimits = globalThis as typeof globalThis & {
  rateLimitStore?: Map<string, Entry>;
};

const store = globalRateLimits.rateLimitStore ?? new Map<string, Entry>();
globalRateLimits.rateLimitStore = store;

export function requestClientId(request: Request): string {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return cloudflareIp || forwardedIp || "unknown";
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
