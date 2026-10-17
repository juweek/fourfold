"use client";

// Client-side fetch utilities with retry and abort on unmount

export class ClientFetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = "ClientFetchError";
  }
}

let abortControllers = new Set<AbortController>();

// Abort all pending requests (called on route change)
export function abortAllRequests() {
  abortControllers.forEach(controller => controller.abort());
  abortControllers.clear();
}

// Cleanup old aborted controllers
function cleanupController(controller: AbortController) {
  abortControllers.delete(controller);
}

export async function clientFetch(
  url: string,
  options: RequestInit = {},
  opts: {
    retries?: number;
    retryDelay?: number;
    signal?: AbortSignal;
  } = {}
): Promise<Response> {
  const { retries = 2, retryDelay = 1000, signal: externalSignal } = opts;
  
  // Create internal abort controller
  const controller = new AbortController();
  abortControllers.add(controller);
  
  // Combine external signal if provided
  const combinedSignal = externalSignal
    ? combineSignals([externalSignal, controller.signal])
    : controller.signal;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: combinedSignal,
      });

      cleanupController(controller);

      // Don't retry 4xx errors (except 429)
      if (!response.ok && response.status >= 400 && response.status < 500 && response.status !== 429) {
        const data = await response.json().catch(() => ({}));
        throw new ClientFetchError(
          data.error || `Request failed with status ${response.status}`,
          response.status,
          data
        );
      }

      // Retry on 5xx or 429
      if (attempt < retries && (response.status >= 500 || response.status === 429)) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (error) {
      cleanupController(controller);
      
      // Don't retry if aborted
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Retry on network errors
      if (attempt < retries && isNetworkError(error)) {
        console.warn(`Request attempt ${attempt + 1} failed, retrying...`, error);
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }

      throw error;
    }
  }

  cleanupController(controller);
  throw lastError || new Error("Request failed");
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return msg.includes("failed to fetch") || 
           msg.includes("network") || 
           msg.includes("load failed");
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Combine multiple abort signals
function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  
  return controller.signal;
}

// React hook for fetch with automatic abort on unmount
export function useFetch() {
  const controllerRef = { current: new AbortController() };
  
  // Abort on unmount
  if (typeof window !== 'undefined') {
    import('react').then(React => {
      React.useEffect(() => {
        return () => controllerRef.current.abort();
      }, []);
    });
  }
  
  return (url: string, options?: RequestInit, opts?: Parameters<typeof clientFetch>[2]) => {
    return clientFetch(url, options, {
      ...opts,
      signal: controllerRef.current.signal,
    });
  };
}
