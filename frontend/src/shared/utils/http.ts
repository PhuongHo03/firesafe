// Centralized HTTP helpers — empty env means same-origin reverse proxy
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const AI_WORKER_URL = process.env.NEXT_PUBLIC_AI_WORKER_URL ?? "";
const PROMETHEUS_URL = process.env.NEXT_PUBLIC_PROMETHEUS_URL ?? "";
const REQUEST_TIMEOUT_MS = 30000;

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
    const err = await res.json().catch(() => ({ title: res.statusText }));
    throw new Error(err.detail ?? err.title ?? "Unknown error");
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function requestAI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const res = await fetch(`${AI_WORKER_URL}${path}`, {
    ...options,
    signal,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "AI Worker error");
  }
  return res.json() as Promise<T>;
}

export async function requestPrometheus<T>(query: string): Promise<T> {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const basePath = PROMETHEUS_URL ? `${PROMETHEUS_URL}/api/v1/query` : "/prometheus/api/v1/query";
  const url = `${basePath}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Prometheus query error");
  }
  return res.json() as Promise<T>;
}

export function getAIWorkerUrl(path: string) {
  return `${AI_WORKER_URL}${path}`;
}
