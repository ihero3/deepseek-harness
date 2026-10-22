/**
 * Transient-failure retry policy for upstream provider calls.
 *
 * Why this exists: a single `502 Upstream response stream was interrupted`
 * (or a 429/503 blip) used to end long agent turns on its first occurrence.
 * Upstream aggregators routinely drop a stream mid-flight; the correct
 * behaviour is to retry a handful of times with backoff before surfacing it.
 *
 * Defaults: 4 attempts total (1 + 3 retries), 300ms base delay, ×2 backoff,
 * 10% jitter, 8s cap — bounded so a genuinely broken endpoint still fails fast.
 *
 * @module dsh-plugin-threerouter/retry-policy
 */

/** Failure classes worth retrying (everything else fails fast). */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

/** Upstream error codes/messages that mean "the stream got cut", not "bad request". */
const RETRYABLE_PATTERN =
  /upstream_stream_read_error|upstream stream (?:was )?interrupted|stream (?:was )?interrupted|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|fetch failed|network error/i

/** Retry knobs; callers may narrow the budget per call site. */
export interface RetryOptions {
  /** Total attempts including the first one (clamped to 2..6). */
  readonly attempts?: number
  /** Base delay in milliseconds before the first retry (clamped to 50..2000). */
  readonly baseDelayMs?: number
  /** Multiplier applied per retry (clamped to 1.1..4). */
  readonly factor?: number
  /** Upper bound for a single delay (clamped to 100..15000). */
  readonly maxDelayMs?: number
  /** Injectable sleep + random for tests. */
  readonly sleep?: (ms: number) => Promise<void>
  readonly random?: () => number
  /** Called before each retry, e.g. to log/emit a notice. */
  readonly onRetry?: (info: { attempt: number; error: unknown; delayMs: number }) => void
}

/**
 * Decide whether a failure is worth another attempt.
 * @param error - thrown error or response-like object.
 * @returns true when retrying could plausibly succeed.
 */
export function isTransientUpstreamFailure(error: unknown): boolean {
  if (error === null || error === undefined) return false
  if (typeof error === 'object') {
    const candidate = error as { status?: unknown; code?: unknown; message?: unknown; cause?: unknown }
    if (typeof candidate.status === 'number' && RETRYABLE_STATUS.has(candidate.status)) return true
    if (typeof candidate.code === 'string' && RETRYABLE_PATTERN.test(candidate.code)) return true
    if (typeof candidate.message === 'string' && RETRYABLE_PATTERN.test(candidate.message)) return true
    if (candidate.cause !== undefined) return isTransientUpstreamFailure(candidate.cause)
  }
  return typeof error === 'string' && RETRYABLE_PATTERN.test(error)
}

/** Default sleep used when the caller does not inject one. */
const realSleep = async (ms: number): Promise<void> => new Promise(resolve => { setTimeout(resolve, ms) })

/**
 * Run `operation`, retrying transient upstream failures with exponential backoff.
 * Non-transient failures (400/401/422, validation, coding errors) are rethrown
 * immediately so real bugs are not hidden behind retries.
 * @param operation - the call to attempt; receives the 1-based attempt number.
 * @param options - retry knobs.
 * @returns the first successful result.
 */
export async function withTransientRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.min(6, Math.max(2, Math.round(options.attempts ?? 4)))
  const baseDelayMs = Math.min(2000, Math.max(50, Math.round(options.baseDelayMs ?? 300)))
  const factor = Math.min(4, Math.max(1.1, options.factor ?? 2))
  const maxDelayMs = Math.min(15000, Math.max(100, Math.round(options.maxDelayMs ?? 8000)))
  const sleep = options.sleep ?? realSleep
  const random = options.random ?? Math.random

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      const retryable = isTransientUpstreamFailure(error)
      if (!retryable || attempt === attempts) throw error
      const exponential = baseDelayMs * factor ** (attempt - 1)
      const jittered = exponential * (0.9 + random() * 0.2)
      const delayMs = Math.min(maxDelayMs, Math.round(jittered))
      options.onRetry?.({ attempt, error, delayMs })
      await sleep(delayMs)
    }
  }
  throw lastError
}

/** Human-readable one-liner for user-facing notices. */
export function describeRetryCause(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '上游服务暂时不可用'
}
