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

type HeaderReader = { get(name: string): string | null };

/**
 * Forwarding headers are client-controlled unless a trusted proxy overwrites
 * them. Vercel sets VERCEL and strips spoofed x-vercel-forwarded-for; any other
 * proxy must opt in with TRUST_PROXY_HEADERS=1. Otherwise all callers share the
 * "unknown" bucket (safe, and fine for local dev).
 */
export function clientIdFromHeaders(
  headers: HeaderReader,
  env: Record<string, string | undefined> = process.env,
): string {
  const first = (value: string | null) => value?.split(",")[0]?.trim() || "";
  if (env.VERCEL) {
    const vercelIp = first(headers.get("x-vercel-forwarded-for"));
    if (vercelIp) return vercelIp;
  }
  if (env.VERCEL || env.TRUST_PROXY_HEADERS === "1") {
    return first(headers.get("cf-connecting-ip"))
      || first(headers.get("x-forwarded-for"))
      || first(headers.get("x-real-ip"))
      || "unknown";
  }
  return "unknown";
}

export function requestClientId(request: Request): string {
  return clientIdFromHeaders(request.headers);
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
