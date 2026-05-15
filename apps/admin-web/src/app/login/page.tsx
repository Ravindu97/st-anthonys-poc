"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo, Button, Card, Input } from "@st-anthonys/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@stanthonys.lk");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        (data as { error?: string }).error ??
          (res.status === 503
            ? "Database not running. Start Docker, then run ./scripts/start-dev.sh"
            : "Login failed")
      );
      return;
    }
    if (data.user.role !== "ADMIN") {
      setError("Admin access required");
      return;
    }
    localStorage.setItem("admin_token", data.token);
    router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <BrandLogo size={120} className="mx-auto" />
          <p className="mt-3 text-sm text-surface-ink-muted">Operations dashboard</p>
        </div>
        <Card>
          <h2 className="text-xl font-bold tracking-tight">Admin sign in</h2>
          <p className="mt-1 mb-4 text-sm text-surface-ink-muted">admin@stanthonys.lk / admin1234</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-status-busy">{error}</p>}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
