/**
 * api.ts — CSRF-aware fetch utility
 *
 * All mutating requests (POST, PUT, DELETE, PATCH) must include the
 * x-csrf-token header to pass middleware CSRF validation.
 *
 * This module reads the csrf-token cookie (set by middleware on page load)
 * and automatically attaches it. It also handles token refresh on 401.
 */

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf-token="));
  return match ? match.split("=")[1] : null;
}

type FetchOptions = RequestInit & {
  skipCsrf?: boolean;
};

/**
 * Fetches a URL with automatic CSRF token injection for mutating methods.
 * On 401, attempts a token refresh then retries once.
 */
export async function apiFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipCsrf = false, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  const headers = new Headers(fetchOptions.headers);

  // Inject CSRF token for mutations
  if (isMutation && !skipCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  // Always set Content-Type to JSON if we have a body and it's not set
  if (fetchOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...fetchOptions, headers });

  // On 401, attempt token refresh then retry once
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry original request with fresh CSRF token
      const retryHeaders = new Headers(fetchOptions.headers);
      if (isMutation && !skipCsrf) {
        const newCsrfToken = getCsrfToken();
        if (newCsrfToken) {
          retryHeaders.set("x-csrf-token", newCsrfToken);
        }
      }
      if (fetchOptions.body && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      return fetch(url, { ...fetchOptions, headers: retryHeaders });
    }
    // Refresh failed — redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}

/**
 * Attempt to refresh the access token using the refresh token cookie.
 * Returns true if successful.
 */
async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Convenience wrappers
 */
export const api = {
  get: (url: string, options?: FetchOptions) =>
    apiFetch(url, { ...options, method: "GET" }),

  post: (url: string, body: unknown, options?: FetchOptions) =>
    apiFetch(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (url: string, body: unknown, options?: FetchOptions) =>
    apiFetch(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (url: string, options?: FetchOptions) =>
    apiFetch(url, { ...options, method: "DELETE" }),

  patch: (url: string, body: unknown, options?: FetchOptions) =>
    apiFetch(url, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
