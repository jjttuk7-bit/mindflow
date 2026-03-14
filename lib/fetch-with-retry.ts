/**
 * Fetch wrapper with retry, timeout, and user-friendly error handling.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retries?: number; timeout?: number }
): Promise<Response> {
  const { retries = 2, timeout = 10000, ...fetchOptions } = options || {}

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
      clearTimeout(timer)

      if (res.ok || !isRetryable(res.status)) return res

      // Retryable status but attempts remain
      if (attempt < retries) {
        await delay(500 * Math.pow(2, attempt))
        continue
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      if (attempt < retries && err instanceof Error && err.name !== "AbortError") {
        await delay(500 * Math.pow(2, attempt))
        continue
      }
      throw err
    }
  }

  // Should not reach here, but satisfy TypeScript
  throw new Error("요청에 실패했습니다")
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 408 || status === 429
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
