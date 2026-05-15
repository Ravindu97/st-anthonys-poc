import type { WebSocket } from "ws";

export type ChargePointConnection = {
  ws: WebSocket;
  ocppId: string;
  pendingCalls: Map<string, { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }>;
};

const connections = new Map<string, ChargePointConnection>();

export function registerConnection(ocppId: string, conn: ChargePointConnection) {
  connections.set(ocppId, conn);
}

export function getConnection(ocppId: string): ChargePointConnection | undefined {
  return connections.get(ocppId);
}

export function removeConnection(ocppId: string) {
  connections.delete(ocppId);
}

export function getAllConnections(): string[] {
  return [...connections.keys()];
}
