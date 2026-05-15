import { z } from "zod";

export const ChargePointStatusSchema = z.enum([
  "Available",
  "Charging",
  "Faulted",
  "Offline",
  "Unavailable",
]);
export type ChargePointStatus = z.infer<typeof ChargePointStatusSchema>;

export const SessionStatusSchema = z.enum([
  "pending",
  "active",
  "completed",
  "failed",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ConnectorStatusSchema = z.enum([
  "Available",
  "Occupied",
  "Faulted",
  "Unavailable",
]);
export type ConnectorStatus = z.infer<typeof ConnectorStatusSchema>;

export const SessionUpdateSchema = z.object({
  sessionId: z.string(),
  status: SessionStatusSchema,
  powerKw: z.number().optional(),
  energyKwh: z.number().optional(),
  socPercent: z.number().optional(),
  batteryTempC: z.number().optional(),
  allocatedKw: z.number().optional(),
  costLkr: z.number().optional(),
  syncedFromOffline: z.boolean().optional(),
});
export type SessionUpdate = z.infer<typeof SessionUpdateSchema>;

export const StartSessionRequestSchema = z.object({
  connectorId: z.string(),
});
export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
