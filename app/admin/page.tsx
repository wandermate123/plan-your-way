"use client";

import { useEffect, useMemo, useState } from "react";

function prettyJson(x: unknown) {
  return JSON.stringify(x, null, 2);
}

export default function AdminPage() {
  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("wandermate_admin_token") ?? "";
  });
  const [jsonText, setJsonText] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const headers = useMemo(
    () => ({ "content-type": "application/json", "x-admin-token": token }),
    [token],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wandermate_admin_token", token);
    }
  }, [token]);

  async function load() {
    setStatus("Loading...");
    setError("");
    try {
      const res = await fetch("/api/admin/pricing", { headers });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Unauthorized");
      setJsonText(prettyJson(data.pricing));
      setStatus("Loaded.");
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function save() {
    setStatus("Saving...");
    setError("");
    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers,
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Save failed");
      setJsonText(prettyJson(data.pricing));
      setStatus("Saved.");
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <h1>Admin — Pricing rules</h1>
          <p>Update your stay / vehicle / guide / boat rates (JSON).</p>
        </div>
        <div className="pill">
          <a href="/" style={{ textDecoration: "none" }}>
            ← Back to quote
          </a>
        </div>
      </div>

      <section className="card">
        <h2>Access</h2>
        <div className="row">
          <div>
            <label>Admin token</label>
            <input
              value={token}
              placeholder="Default is: changeme"
              onChange={(e) => setToken(e.target.value)}
            />
            <div className="footerNote">
              Set an env var before deployment: <code>ADMIN_TOKEN</code>. Default is{" "}
              <code>changeme</code>.
            </div>
          </div>
          <div className="actions" style={{ alignItems: "flex-end" }}>
            <button onClick={load}>Load pricing</button>
            <button className="secondary" onClick={save}>
              Save pricing
            </button>
          </div>
        </div>
        {status ? <div className="muted" style={{ marginTop: 10 }}>{status}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Pricing JSON</h2>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 420,
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(0,0,0,.18)",
            color: "var(--text)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
          }}
        />
        <div className="footerNote">
          Tip: Change <code>stay.perNight</code>, <code>vehicle.perDay</code>, <code>guide.perDay</code>,{" "}
          and <code>boating.*</code> to match your real rates.
        </div>
      </section>
    </main>
  );
}

