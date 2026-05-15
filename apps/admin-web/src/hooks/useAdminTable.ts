"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PaginatedResponse } from "@st-anthonys/shared";
import { apiPaginated } from "@/lib/api";

type TableParams = Record<string, string | number | boolean | undefined>;

const EMPTY_TABLE_DEFAULTS: TableParams = {};
const DEFAULT_DEBOUNCE_KEYS = ["search"];

function paramsFromSearch(
  searchParams: URLSearchParams,
  defaults: TableParams
): TableParams {
  const p: TableParams = { ...defaults };
  searchParams.forEach((value, key) => {
    if (value) p[key] = value;
  });
  const page = Number(p.page);
  const pageSize = Number(p.pageSize);
  p.page = page > 0 ? page : 1;
  p.pageSize = pageSize > 0 ? pageSize : 25;
  return p;
}

function buildQueryKey(searchKey: string, defaultsKey: string): string {
  const defaults = JSON.parse(defaultsKey) as TableParams;
  const searchParams = new URLSearchParams(searchKey);
  return JSON.stringify(paramsFromSearch(searchParams, defaults));
}

async function fetchPaginated<T>(
  endpoint: string,
  queryKey: string
): Promise<PaginatedResponse<T>> {
  const parsed = JSON.parse(queryKey) as TableParams;
  const result = await apiPaginated<T>(endpoint, parsed);
  if (!result || !Array.isArray(result.items)) {
    throw new Error("Unexpected API response — restart the API and refresh the page");
  }
  return result;
}

export function useAdminTable<T>({
  endpoint,
  defaultParams = EMPTY_TABLE_DEFAULTS,
  debounceKeys = DEFAULT_DEBOUNCE_KEYS,
  debounceMs = 300,
}: {
  endpoint: string;
  defaultParams?: TableParams;
  debounceKeys?: string[];
  debounceMs?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const defaultsKey = JSON.stringify(defaultParams);
  const queryKey = useMemo(
    () => buildQueryKey(searchKey, defaultsKey),
    [searchKey, defaultsKey]
  );
  const params = useMemo(() => JSON.parse(queryKey) as TableParams, [queryKey]);

  const [data, setData] = useState<PaginatedResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const endpointRef = useRef(endpoint);
  const queryKeyRef = useRef(queryKey);
  const debounceKeysRef = useRef(debounceKeys);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  endpointRef.current = endpoint;
  queryKeyRef.current = queryKey;
  debounceKeysRef.current = debounceKeys;

  const runFetch = useCallback(async (silent: boolean) => {
    const requestId = ++requestIdRef.current;
    const key = queryKeyRef.current;
    const ep = endpointRef.current;

    if (!silent) setLoading(true);

    try {
      const result = await fetchPaginated<T>(ep, key);
      if (requestId !== requestIdRef.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load");
      if (!silent) setData({ items: [], total: 0, page: 1, pageSize: 25 });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const parsed = JSON.parse(queryKey) as TableParams;
    const shouldDebounce = debounceKeysRef.current.some((k) => {
      const v = parsed[k];
      return v !== undefined && v !== "";
    });

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (shouldDebounce) {
      debounceTimerRef.current = setTimeout(() => {
        void runFetch(false);
      }, debounceMs);
      return () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      };
    }

    void runFetch(false);
    // runFetch is stable (empty deps); queryKey drives refetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, debounceMs]);

  const setParams = useCallback(
    (updates: TableParams, resetPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      if (resetPage) next.set("page", "1");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const refetch = useCallback(() => {
    void runFetch(true);
  }, [runFetch]);

  const defaults = useMemo(() => JSON.parse(defaultsKey) as TableParams, [defaultsKey]);

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    if (defaults.sortBy) next.set("sortBy", String(defaults.sortBy));
    if (defaults.sortOrder) next.set("sortOrder", String(defaults.sortOrder));
    router.replace(next.toString() ? `?${next.toString()}` : "?", { scroll: false });
  }, [router, defaults]);

  const items = data?.items ?? [];
  const showLoading = loading && items.length === 0;

  return {
    items,
    total: data?.total ?? 0,
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 25,
    params,
    loading: showLoading,
    error,
    setParams,
    clearFilters,
    refetch,
    search: String(params.search ?? ""),
    sortBy: String(params.sortBy ?? ""),
    sortOrder: (params.sortOrder as "asc" | "desc") ?? "desc",
  };
}

export function useAdminList<T>({
  endpoint,
  defaultParams = EMPTY_TABLE_DEFAULTS,
}: {
  endpoint: string;
  defaultParams?: TableParams;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const defaultsKey = JSON.stringify(defaultParams);

  const queryKey = useMemo(
    () => buildQueryKey(searchKey, defaultsKey),
    [searchKey, defaultsKey]
  );
  const params = useMemo(() => JSON.parse(queryKey) as TableParams, [queryKey]);

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const endpointRef = useRef(endpoint);
  const queryKeyRef = useRef(queryKey);

  endpointRef.current = endpoint;
  queryKeyRef.current = queryKey;

  const runFetch = useCallback(async (silent: boolean) => {
    const requestId = ++requestIdRef.current;
    const key = queryKeyRef.current;
    const ep = endpointRef.current;

    if (!silent) setLoading(true);

    try {
      const { api, buildQuery } = await import("@/lib/api");
      const parsed = JSON.parse(key) as TableParams;
      const result = await api<T[]>(`${ep}${buildQuery(parsed)}`);
      if (requestId !== requestIdRef.current) return;
      setItems(Array.isArray(result) ? result : []);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load");
      if (!silent) setItems([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runFetch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const setParams = useCallback(
    (updates: TableParams) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const refetch = useCallback(() => {
    void runFetch(true);
  }, [runFetch]);

  const clearFilters = useCallback(() => {
    router.replace("?", { scroll: false });
  }, [router]);

  const showLoading = loading && items.length === 0;

  return {
    items,
    loading: showLoading,
    error,
    params,
    setParams,
    clearFilters,
    refetch,
  };
}
