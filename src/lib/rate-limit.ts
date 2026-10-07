type Entry = { count: number; resetAt: number };

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const globalRateLimits = globalThis as typeof globalThis & {
  rateLimitStore?: Map<string, Entry>;
};

const store = globalRateLimits.rateLimitStore ?? new Map<string, Entry>();
globalRateLimits.rateLimitStore = store;

export function requestClientId(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  return vercelIp || cloudflareIp || forwardedIp || realIp || "unknown";
}

function checkLocalRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

type UpstashPipelineResult = Array<{ result?: number | string; error?: string }>;

async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Window identity is part of the key, so INCR is atomic without a Lua script.
  // Expiring it for twice the window bounds Redis storage even after clock skew.
  const windowId = Math.floor(Date.now() / windowMs);
  const redisKey = `ratelimit:${windowId}:${key}`;
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PEXPIRE', redisKey, windowMs * 2],
      ]),
      cache: 'no-store',
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return null;
    const result = await response.json() as UpstashPipelineResult;
    const count = Number(result[0]?.result);
    if (!Number.isFinite(count)) return null;
    const remainingMs = windowMs - (Date.now() % windowMs);
    return {
      allowed: count <= limit,
      retryAfterSeconds: count <= limit ? 0 : Math.max(1, Math.ceil(remainingMs / 1000)),
    };
  } catch {
    // Availability wins over a Redis outage; the per-instance limiter still
    // protects this process until the distributed store recovers.
    return null;
  }
}

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const distributed = await checkDistributedRateLimit(key, limit, windowMs);
  return distributed ?? checkLocalRateLimit(key, limit, windowMs);
}
