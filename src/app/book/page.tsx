"use client";

import { useEffect, useMemo, useState } from "react";

function makeWhatsAppLink(message: string) {
  const phone = "919999999999"; // TODO: replace with your real Wandermate WhatsApp number
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

type Summary = {
  total: string;
  currency: string;
  arrivalDate: string;
  departureDate: string;
  adults: string;
  children: string;
} | null;

export default function BookPage() {
  const [summary, setSummary] = useState<Summary>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const total = params.get("total");
    const currency = params.get("currency") ?? "INR";
    const arrivalDate = params.get("arrivalDate");
    const departureDate = params.get("departureDate");
    const adults = params.get("adults");
    const children = params.get("children") ?? "0";

    if (!total || !arrivalDate || !departureDate || !adults) {
      setSummary(null);
      return;
    }

    setSummary({
      total,
      currency,
      arrivalDate,
      departureDate,
      adults,
      children,
    });
  }, []);

  const canSubmit = summary && name.trim() && phone.trim();

  const whatsappHref = useMemo(() => {
    if (!summary || !canSubmit) return "#";
    const messageLines = [
      "New Wandermate booking request",
      "",
      `Name: ${name}`,
      `Phone: ${phone}`,
      email ? `Email: ${email}` : "",
      "",
      `Trip dates: ${summary.arrivalDate} → ${summary.departureDate}`,
      `Travellers: ${summary.adults} adults${
        Number(summary.children) > 0 ? `, ${summary.children} children` : ""
      }`,
      `Quoted total: ${summary.currency} ${summary.total}`,
      "",
      notes ? `Special requests:\n${notes}` : "",
      "",
      "Sent from Wandermate instant quote page.",
    ]
      .filter(Boolean)
      .join("\n");
    return makeWhatsAppLink(messageLines);
  }, [summary, name, phone, email, notes, canSubmit]);

  async function submitOnWebsite() {
    if (!canSubmit || !summary) return;
    setSubmitting(true);
    setSubmitted(false);
    setSubmitError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          notes,
          summary,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Request failed");
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <h1>Booking & payment</h1>
          <p>Confirm your details and then complete payment directly from this website.</p>
        </div>
        <div className="pill">
          <a href="/" style={{ textDecoration: "none" }}>
            ← Back to quote
          </a>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <h2>Your contact details</h2>
          <div className="row">
            <div>
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label>WhatsApp / Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Email (optional)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Special requests / details (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: 120,
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,.18)",
                color: "var(--text)",
                fontFamily:
                  "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
                fontSize: 13,
              }}
            />
          </div>

          <div className="actions" style={{ marginTop: 16, flexDirection: "column" }}>
            <button
              style={{ width: "100%" }}
              disabled={!canSubmit || submitting}
              onClick={submitOnWebsite}
            >
              {submitting ? "Sending..." : "Confirm booking on website"}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", width: "100%" }}
            >
              <button
                className="secondary"
                style={{ width: "100%", marginTop: 6 }}
                disabled={!canSubmit}
              >
                Or send booking on WhatsApp
              </button>
            </a>
          </div>

          {submitted ? (
            <div className="footerNote" style={{ color: "#7dffa4" }}>
              Your booking details have been submitted on the website. Next, connect your preferred
              online payment method here (UPI / card / gateway) so guests can pay instantly.
            </div>
          ) : (
            <div className="footerNote">
              After this step, guests should be able to pay online on your website (for example via
              Razorpay, Stripe, or a UPI QR). No manual confirmation step is required.
            </div>
          )}
          {submitError ? <div className="error">{submitError}</div> : null}
        </section>

        <aside className="card">
          <h2>Quote summary</h2>
          {!summary ? (
            <p className="muted">
              No quote details found. Please{" "}
              <a href="/" style={{ color: "inherit" }}>
                go back and generate a quote
              </a>{" "}
              first.
            </p>
          ) : (
            <>
              <p className="muted">
                Trip: <strong>{summary.arrivalDate}</strong> →{" "}
                <strong>{summary.departureDate}</strong>
                <br />
                Travellers: <strong>{summary.adults}</strong> adults
                {Number(summary.children) > 0 ? (
                  <>
                    , <strong>{summary.children}</strong> children
                  </>
                ) : null}
              </p>
              <div className="kpi">
                <div>
                  <small>Quoted total</small>
                </div>
                <strong>
                  {summary.currency} {summary.total}
                </strong>
              </div>
              <div className="footerNote">
                This is the instant quote you generated. The final amount should match what guests
                pay online on this website.
              </div>
            </>
          )}

          <div className="footerNote" style={{ marginTop: 12 }}>
            Replace the WhatsApp number inside the app code with your real Wandermate business
            number so messages reach you directly.
          </div>
        </aside>
      </div>
    </main>
  );
}

