import type { PaginatedResponse } from "@st-anthonys/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const hasBody = options.body != null && options.body !== "";
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export async function apiPaginated<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<PaginatedResponse<T>> {
  return api<PaginatedResponse<T>>(`${path}${buildQuery(params)}`);
}

export async function downloadCsv(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  filename: string
): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}${buildQuery(params)}`, { headers });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function subscribeEvents(onEvent: (channel: string, data: unknown) => void) {
  const es = new EventSource(`${API_URL}/events`);
  ["session:update", "chargepoint:update", "hub:load"].forEach((ch) => {
    es.addEventListener(ch, (e) => {
      try {
        onEvent(ch, JSON.parse((e as MessageEvent).data));
      } catch {}
    });
  });
  return () => es.close();
}
