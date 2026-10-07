export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Retries short-lived provider/network failures with bounded exponential
 * backoff. Callers decide which errors are safe to retry so validation and
 * authorization failures are never repeated.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.min(5, Math.max(1, options.attempts ?? 3));
  const baseDelayMs = Math.min(5_000, Math.max(25, options.baseDelayMs ?? 150));
  const maxDelayMs = Math.min(10_000, Math.max(baseDelayMs, options.maxDelayMs ?? 1_500));
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || options.shouldRetry?.(error) === false) throw error;
      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * Math.max(1, exponentialDelay * 0.2));
      await wait(exponentialDelay + jitter);
    }
  }

  throw lastError;
}

export function httpStatusFromError(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return 0;
  const status = Number((error as { statusCode?: unknown }).statusCode);
  return Number.isFinite(status) ? status : 0;
}

export function isTransientHttpError(error: unknown) {
  const status = httpStatusFromError(error);
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}
