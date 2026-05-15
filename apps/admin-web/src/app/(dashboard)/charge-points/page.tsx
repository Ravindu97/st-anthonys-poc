"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableTd,
  DataTableTh,
  PageTitle,
  StatusBadge,
} from "@st-anthonys/ui";
import { api, getToken } from "@/lib/api";

type ChargePoint = {
  id: string;
  ocppId: string;
  model: string;
  maxKw: number;
  status: string;
  lastHeartbeat: string | null;
  site: { name: string; city: string };
  connectors: Array<{ connectorNum: number; status: string }>;
};

export default function ChargePointsPage() {
  const router = useRouter();
  const [points, setPoints] = useState<ChargePoint[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api<ChargePoint[]>("/admin/charge-points").then(setPoints).catch(() => router.push("/login"));
  }, [router]);

  async function handleReset(ocppId: string) {
    await api(`/admin/charge-points/${ocppId}/reset`, {
      method: "POST",
      body: JSON.stringify({ type: "Soft" }),
    });
    alert(`Reset sent to ${ocppId}`);
  }

  return (
    <>
      <PageTitle>Charge points</PageTitle>
      <Card className="p-0 overflow-hidden">
        <DataTable>
          <DataTableHead>
            <DataTableTh>OCPP ID</DataTableTh>
            <DataTableTh>Site</DataTableTh>
            <DataTableTh>Model</DataTableTh>
            <DataTableTh>Status</DataTableTh>
            <DataTableTh>Last heartbeat</DataTableTh>
            <DataTableTh>Actions</DataTableTh>
          </DataTableHead>
          <DataTableBody>
            {points.map((cp) => (
              <tr key={cp.id}>
                <DataTableTd mono>{cp.ocppId}</DataTableTd>
                <DataTableTd>{cp.site.city}</DataTableTd>
                <DataTableTd>
                  {cp.model}{" "}
                  <span className="font-mono text-xs text-surface-ink-muted">({cp.maxKw} kW)</span>
                </DataTableTd>
                <DataTableTd>
                  <StatusBadge status={cp.status} />
                </DataTableTd>
                <DataTableTd mono>
                  {cp.lastHeartbeat ? new Date(cp.lastHeartbeat).toLocaleString() : "—"}
                </DataTableTd>
                <DataTableTd>
                  <Button variant="danger" type="button" onClick={() => handleReset(cp.ocppId)}>
                    Reset
                  </Button>
                </DataTableTd>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </>
  );
}
