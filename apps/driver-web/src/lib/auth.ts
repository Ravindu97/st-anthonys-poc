export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const USER_KEY = "user";

export const AUTH_CHANGED_EVENT = "st-auth-changed";

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
