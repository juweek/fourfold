// Server-side fetch utilities with timeout and retry

export class FetchTimeoutError extends Error {
  constructor(message = "Request timeout") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export class FetchRetryError extends Error {
  constructor(message = "Request failed after retries") {
    super(message);
    this.name = "FetchRetryError";
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isTransientError(error: unknown): boolean {
  if (error instanceof FetchTimeoutError) return true;
  if (error instanceof TypeError && error.message.includes("fetch failed")) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("network") || 
           msg.includes("timeout") || 
           msg.includes("econnrefused") ||
           msg.includes("enotfound");
  }
  return false;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  opts: {
    retries?: number;
    timeoutMs?: number;
    backoffMs?: number;
  } = {}
): Promise<Response> {
  const { retries = 2, timeoutMs = 8000, backoffMs = 1000 } = opts;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      // Retry on 503, 504, 429
      if (attempt < retries && (response.status === 503 || response.status === 504 || response.status === 429)) {
        lastError = new Error(`Server returned ${response.status}`);
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retries && isTransientError(error)) {
        console.warn(`Fetch attempt ${attempt + 1} failed, retrying...`, error);
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }
      
      throw error;
    }
  }

  throw new FetchRetryError(lastError?.message || "Request failed");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Wrapper for async operations with timeout
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new FetchTimeoutError(errorMessage || `Operation timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
