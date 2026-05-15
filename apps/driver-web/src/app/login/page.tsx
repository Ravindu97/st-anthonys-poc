"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="container" style={{ maxWidth: 400 }}>
      <div className="card">
        <h2>{isRegister ? "Create account" : "Sign in"}</h2>
        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
          Demo: driver@demo.lk / demo1234
        </p>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: "crimson", marginBottom: "0.5rem" }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "…" : isRegister ? "Register" : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          style={{ marginTop: "1rem", background: "none", border: "none", color: "var(--sa-green)" }}
        >
          {isRegister ? "Already have an account?" : "Create an account"}
        </button>
      </div>
    </main>
  );
}
