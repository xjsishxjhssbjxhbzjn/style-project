export function isRetryableUpstreamError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('eai_again') ||
    msg.includes('socket') ||
    msg.includes('network') ||
    msg.includes('abort') ||
    msg.includes('timeout')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateWithRetry(
  fn: () => Promise<string>,
  options?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 450;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableUpstreamError(err) || attempt === maxAttempts - 1) {
        throw err;
      }
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  throw lastErr;
}
