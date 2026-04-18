"use client";

import { VEHICLE_ROUTE_BAND_LABELS } from "@/lib/vehicle-pricing";
import type { VehicleRouteBand } from "@/lib/validation";

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function tierLabel(k: string) {
  const m: Record<string, string> = {
    twoStar: "2★ stay",
    threeFourStar: "3★ stay",
    fiveStar: "5★ stay",
    heritage: "Heritage stay",
  };
  return m[k] ?? k;
}

function guideLabel(k: string) {
  const m: Record<string, string> = {
    none: "No guide",
    standard: "Standard guide",
    senior: "Senior guide",
    storyteller: "Storyteller",
  };
  return m[k] ?? k;
}

export function RateCardPreview({ raw }: { raw: string }) {
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return <p className="muted">Fix JSON syntax to preview service rates.</p>;
  }

  const currency = typeof p.currency === "string" ? p.currency : "INR";
  const meta = p.meta as Record<string, unknown> | undefined;
  const stay = (p.stay as { perNight?: Record<string, number> } | undefined)?.perNight;
  const guide = (p.guide as { perDay?: Record<string, number> } | undefined)?.perDay;
  const vehicle = (p.vehicle as { perDay?: Record<string, number | Record<string, number>> } | undefined)?.perDay;
  const addons = p.addons as Record<string, number> | undefined;
  const boating = p.boating as
    | {
        sunrise?: { perPerson?: number; minimumTotal?: number };
        evening?: { perPerson?: number; minimumTotal?: number };
      }
    | undefined;

  return (
    <div style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Rate preview</h2>
      {meta?.pricingVersion != null || meta?.effectiveFrom ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          {meta?.pricingVersion != null ? <>Version <strong>{String(meta.pricingVersion)}</strong>. </> : null}
          {meta?.effectiveFrom ? <>Effective from <strong>{String(meta.effectiveFrom)}</strong>.</> : null}
        </p>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Stay (per night × weighted people)</h3>
          {stay ? (
            <ul className="list" style={{ margin: 0 }}>
              {Object.entries(stay).map(([k, v]) => (
                <li key={k} style={{ fontSize: 13 }}>
                  <span>{tierLabel(k)}</span>
                  <div>{fmtMoney(Number(v), currency)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Missing stay.perNight</p>
          )}
        </div>
        <div className="card" style={{ padding: 12 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Guide (per day)</h3>
          {guide ? (
            <ul className="list" style={{ margin: 0 }}>
              {Object.entries(guide).map(([k, v]) => (
                <li key={k} style={{ fontSize: 13 }}>
                  <span>{guideLabel(k)}</span>
                  <div>{fmtMoney(Number(v), currency)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Missing guide.perDay</p>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Vehicle (per day)</h3>
        {vehicle ? (
          <ul className="list" style={{ margin: 0 }}>
            {Object.entries(vehicle).map(([k, v]) => (
              <li key={k} style={{ fontSize: 13, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <span>{k === "none" ? "No vehicle" : k}</span>
                {typeof v === "number" ? (
                  <div>{fmtMoney(Number(v), currency)}</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 14, listStyle: "disc" }}>
                    {(Object.keys(VEHICLE_ROUTE_BAND_LABELS) as VehicleRouteBand[]).map((band) => (
                      <li key={band} style={{ fontSize: 12 }}>
                        <span>{VEHICLE_ROUTE_BAND_LABELS[band]}: </span>
                        <strong>{fmtMoney(Number(v[band] ?? 0), currency)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Missing vehicle.perDay</p>
        )}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Boating</h3>
          {boating?.sunrise && boating?.evening ? (
            <ul className="list" style={{ margin: 0 }}>
              <li style={{ fontSize: 13 }}>
                <span>Sunrise (per person, min total)</span>
                <div>
                  {fmtMoney(boating.sunrise.perPerson ?? 0, currency)} /{" "}
                  {fmtMoney(boating.sunrise.minimumTotal ?? 0, currency)}
                </div>
              </li>
              <li style={{ fontSize: 13 }}>
                <span>Evening (per person, min total)</span>
                <div>
                  {fmtMoney(boating.evening.perPerson ?? 0, currency)} /{" "}
                  {fmtMoney(boating.evening.minimumTotal ?? 0, currency)}
                </div>
              </li>
            </ul>
          ) : (
            <p className="muted">Missing boating</p>
          )}
        </div>
        <div className="card" style={{ padding: 12 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Add-ons</h3>
          {addons ? (
            <ul className="list" style={{ margin: 0 }}>
              {Object.entries(addons).map(([k, v]) => (
                <li key={k} style={{ fontSize: 13 }}>
                  <span>{k}</span>
                  <div>{fmtMoney(Number(v), currency)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Missing addons</p>
          )}
        </div>
      </div>

      <p className="footerNote" style={{ marginTop: 12 }}>
        Tax, rounding, and child discount rules apply on top of these base components when computing a quote.
      </p>
    </div>
  );
}
