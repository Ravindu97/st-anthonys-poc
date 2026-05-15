"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo, Button, Card, Input } from "@st-anthonys/ui";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("driver@demo.lk");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister ? { email, password, name } : { email, password };
      const res = await api<{ token: string }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      localStorage.setItem("token", res.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <BrandLogo size={80} className="mx-auto" />
        <p className="mt-3 text-sm text-surface-ink-muted">St. Anthony&apos;s Charge Network</p>
      </div>
      <Card className="w-full">
        <h2 className="text-xl font-bold tracking-tight">
          {isRegister ? "Create account" : "Sign in"}
        </h2>
        <p className="mt-1 mb-4 text-sm text-surface-ink-muted">Demo: driver@demo.lk / demo1234</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-status-busy">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : isRegister ? "Register" : "Sign in"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="mt-4 w-full border-0 bg-transparent text-sm text-brand-teal hover:underline"
        >
          {isRegister ? "Already have an account?" : "Create an account"}
        </button>
      </Card>
    </main>
  );
}
