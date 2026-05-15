"use client";

import { useCallback, useEffect, useState } from "react";
import { api, subscribeEvents } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export type ActiveSessionSummary = {
  sessionId: string;
  connectorId: string;
  status: string;
  connectorNum: number;
  siteId: string;
  siteName: string;
  energyKwh: number;
  allocatedKw: number | null;
};

export function useActiveSessions() {
  const { isLoggedIn, ready } = useAuth();
  const [sessions, setSessions] = useState<ActiveSessionSummary[]>([]);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setSessions([]);
      return;
    }
    try {
      const list = await api<ActiveSessionSummary[]>("/sessions/mine/active");
      setSessions(list);
    } catch {
      setSessions([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsub = subscribeEvents((channel) => {
      if (channel === "session:update") void refresh();
    });
    return unsub;
  }, [isLoggedIn, refresh]);

  const byConnector = Object.fromEntries(
    sessions.map((s) => [s.connectorId, s])
  ) as Record<string, ActiveSessionSummary>;

  return { sessions, byConnector, refresh };
}
