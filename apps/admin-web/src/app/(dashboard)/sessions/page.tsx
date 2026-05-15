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

type Session = {
  id: string;
  status: string;
  energyKwh: number;
  costLkr: number;
  syncedFromOffline: boolean;
  startedAt: string | null;
  stoppedAt: string | null;
  user: { email: string; name: string };
  connector: { connectorNum: number; chargePoint: { ocppId: string; site: { city: string } } };
};

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api<Session[]>("/admin/sessions").then(setSessions).catch(() => router.push("/login"));
  }, [router]);

  function exportCsv() {
    const headers = ["ID", "User", "Site", "ChargePoint", "Status", "kWh", "LKR", "Offline Sync"];
    const rows = sessions.map((s) =>
      [
        s.id,
        s.user.email,
        s.connector.chargePoint.site.city,
        s.connector.chargePoint.ocppId,
        s.status,
        s.energyKwh,
        s.costLkr,
        s.syncedFromOffline,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sessions.csv";
    a.click();
  }

  return (
    <>
      <PageTitle
        action={
          <Button variant="ghost" type="button" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      >
        Sessions
      </PageTitle>
      <Card className="overflow-hidden p-0">
        <DataTable>
          <DataTableHead>
            <DataTableTh>User</DataTableTh>
            <DataTableTh>Location</DataTableTh>
            <DataTableTh>Status</DataTableTh>
            <DataTableTh>kWh</DataTableTh>
            <DataTableTh>LKR</DataTableTh>
            <DataTableTh>Offline</DataTableTh>
          </DataTableHead>
          <DataTableBody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <DataTableTd>{s.user.name}</DataTableTd>
                <DataTableTd>
                  {s.connector.chargePoint.site.city} ·{" "}
                  <span className="font-mono text-xs">{s.connector.chargePoint.ocppId}</span> G
                  {s.connector.connectorNum}
                </DataTableTd>
                <DataTableTd>
                  <StatusBadge status={s.status} />
                </DataTableTd>
                <DataTableTd mono>{s.energyKwh.toFixed(2)}</DataTableTd>
                <DataTableTd mono>{s.costLkr.toFixed(0)}</DataTableTd>
                <DataTableTd>{s.syncedFromOffline ? "Yes" : "—"}</DataTableTd>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </>
  );
}
