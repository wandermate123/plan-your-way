"use client";

import { useState } from "react";

export default function AdminPricingPage() {
  const [secret, setSecret] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPricing() {
    setStatus(null);
    if (!secret.trim()) {
      setStatus("Enter the admin secret first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        headers: { Authorization: `Bearer ${secret.trim()}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Load failed");
      setJsonText(JSON.stringify(data.pricing, null, 2));
      setStatus("Loaded.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function savePricing() {
    setStatus(null);
    if (!secret.trim()) {
      setStatus("Enter the admin secret first.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setStatus("JSON is invalid.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${secret.trim()}`,
        },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Save failed");
      setStatus("Saved. New quotes use this config immediately.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <h1>Pricing (admin)</h1>
          <p>
            Protected by <code>ADMIN_PRICING_SECRET</code>. Do not reuse passwords from other systems;
            generate a long random string.
          </p>
        </div>
        <div className="pill">
          <a href="/" style={{ textDecoration: "none" }}>
            ← Home
          </a>
        </div>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <label>Admin secret</label>
        <input
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Bearer value (same as .env ADMIN_PRICING_SECRET)"
          style={{ width: "100%", marginTop: 8 }}
        />

        <div className="actions" style={{ marginTop: 16 }}>
          <button type="button" disabled={loading} onClick={loadPricing}>
            Load current pricing
          </button>
          <button type="button" disabled={loading} className="secondary" onClick={savePricing}>
            Save to server
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <label>data/pricing.json (validated on save)</label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 420,
              marginTop: 8,
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "#f1f4f9",
              color: "var(--text)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
            }}
          />
        </div>

        {status ? (
          <p className="footerNote" style={{ marginTop: 12 }}>
            {status}
          </p>
        ) : null}
      </section>
    </main>
  );
}
