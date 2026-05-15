"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main style={{ maxWidth: 400, margin: "4rem auto", padding: "1rem" }}>
      <div className="card">
        <h2>Admin sign in</h2>
        <p style={{ fontSize: "0.875rem", color: "#666", margin: "0.5rem 0 1rem" }}>
          admin@stanthonys.lk / admin1234
        </p>
        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p style={{ color: "crimson", marginBottom: "0.5rem" }}>{error}</p>}
          <button type="submit" className="btn" style={{ width: "100%", background: "var(--admin-navy)", color: "white" }}>
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
