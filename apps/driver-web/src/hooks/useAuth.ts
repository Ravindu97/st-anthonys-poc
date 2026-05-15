"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken } from "@/lib/api";
import { AUTH_CHANGED_EVENT, clearAuth, getStoredUser, type AuthUser } from "@/lib/auth";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }

    const cached = getStoredUser();
    if (cached) setUser(cached);

    try {
      const res = await api<{ user: AuthUser }>("/auth/me");
      setUser(res.user);
      localStorage.setItem("user", JSON.stringify(res.user));
    } catch {
      clearAuth();
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const signOut = useCallback(() => {
    clearAuth();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return {
    user,
    isLoggedIn: Boolean(user),
    ready,
    signOut,
    refresh,
  };
}
