/** Retry policy (`A` 层): transient upstream failures must not end a turn on first occurrence. */
import { describe, expect, it, vi } from 'vitest'
import { describeRetryCause, isTransientUpstreamFailure, withTransientRetry } from './retry-policy.ts'

describe('isTransientUpstreamFailure', () => {
  it('treats the reported stream interruption as transient', () => {
    expect(isTransientUpstreamFailure(new Error('Upstream response stream was interrupted'))).toBe(true)
    expect(isTransientUpstreamFailure({ code: 'upstream_stream_read_error' })).toBe(true)
    expect(isTransientUpstreamFailure({ status: 502 })).toBe(true)
    expect(isTransientUpstreamFailure({ status: 429 })).toBe(true)
    expect(isTransientUpstreamFailure({ cause: { code: 'ECONNRESET' } })).toBe(true)
  })

  it('fails fast on caller/validation errors', () => {
    expect(isTransientUpstreamFailure({ status: 400 })).toBe(false)
    expect(isTransientUpstreamFailure({ status: 401 })).toBe(false)
    expect(isTransientUpstreamFailure(new Error('Invalid login request'))).toBe(false)
    expect(isTransientUpstreamFailure(undefined)).toBe(false)
  })
})

describe('withTransientRetry', () => {
  const fast = { sleep: async () => {}, random: () => 0.5 }

  it('retries a transient failure and succeeds', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Upstream response stream was interrupted'))
      .mockRejectedValueOnce(new Error('Upstream response stream was interrupted'))
      .mockResolvedValueOnce('ok')
    await expect(withTransientRetry(operation, fast)).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('gives up after the attempt budget (default 4) and surfaces the last error', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Upstream response stream was interrupted'))
    await expect(withTransientRetry(operation, fast)).rejects.toThrow('stream was interrupted')
    expect(operation).toHaveBeenCalledTimes(4)
  })

  it('supports 3..6 attempts', async () => {
    const six = vi.fn().mockRejectedValue(new Error('upstream stream was interrupted'))
    await expect(withTransientRetry(six, { ...fast, attempts: 6 })).rejects.toThrow()
    expect(six).toHaveBeenCalledTimes(6)

    const two = vi.fn().mockRejectedValue(new Error('upstream stream was interrupted'))
    await expect(withTransientRetry(two, { ...fast, attempts: 1 })).rejects.toThrow()
    expect(two).toHaveBeenCalledTimes(2) // 下限 2
  })

  it('does not retry non-transient failures', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Invalid selectModel request'))
    await expect(withTransientRetry(operation, fast)).rejects.toThrow('Invalid selectModel')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('backs off with growing delays and reports each retry', async () => {
    const delays: number[] = []
    const onRetry = vi.fn((info: { delayMs: number }) => { delays.push(info.delayMs) })
    const operation = vi.fn().mockRejectedValue(new Error('upstream stream was interrupted'))
    await expect(withTransientRetry(operation, { ...fast, attempts: 4, onRetry })).rejects.toThrow()
    expect(onRetry).toHaveBeenCalledTimes(3)
    expect(delays[0]!).toBeLessThan(delays[1]!)
    expect(delays[1]!).toBeLessThanOrEqual(delays[2]!)
  })

  it('describes the cause for user-facing notices', () => {
    expect(describeRetryCause(new Error('boom'))).toBe('boom')
    expect(describeRetryCause({})).toBe('上游服务暂时不可用')
  })
})
