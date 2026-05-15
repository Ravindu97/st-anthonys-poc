"use client";

import { useEffect, useState } from "react";
import type { AdminSiteOption } from "@st-anthonys/shared";
import { api } from "@/lib/api";

export function useSites() {
  const [sites, setSites] = useState<AdminSiteOption[]>([]);
  useEffect(() => {
    api<AdminSiteOption[]>("/admin/sites").then(setSites).catch(() => setSites([]));
  }, []);
  const cities = [...new Set(sites.map((s) => s.city))].sort();
  return { sites, cities };
}
