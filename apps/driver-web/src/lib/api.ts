const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
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

export function subscribeEvents(onEvent: (channel: string, data: unknown) => void) {
  const es = new EventSource(`${API_URL}/events`);
  const channels = ["session:update", "chargepoint:update", "hub:load"];

  for (const ch of channels) {
    es.addEventListener(ch, (e) => {
      try {
        onEvent(ch, JSON.parse((e as MessageEvent).data));
      } catch {}
    });
  }

  return () => es.close();
}
