// Centralized HTTP helpers — empty env means same-origin reverse proxy
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const REQUEST_TIMEOUT_MS = 30000;

function errorMessageFromPayload(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["reason", "detail", "title", "message", "error"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }
  return fallback || "Request failed";
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    signal,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(errorMessageFromPayload(err, res.statusText));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function getApiUrl(path: string) {
  return `${BASE_URL}${path}`;
}
