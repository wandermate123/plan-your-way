"use client";

import { useMemo, useState } from "react";

type City = "varanasi" | "ayodhya" | "prayagraj" | "vindhyachal" | "other";

type QuoteInput = {
  startCity: City;
  endCity: City;
  destinations: City[];
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  stayTier: "twoStar" | "threeFourStar" | "fiveStar" | "heritage";
  guideType: "none" | "standard" | "senior" | "storyteller";
  vehicleType: "none" | "auto" | "sedan" | "suv" | "tempo";
  boating: "none" | "sunrise" | "evening";
  addons: (
    | "photographyPerDay"
    | "airportPickupDrop"
    | "eveningAartiAssistance"
    | "sugamDarshan"
    | "sparshDarshan"
    | "vipTempleVisit"
  )[];
};

type QuoteResult = {
  currency: string;
  nights: number;
  days: number;
  travelers: { adults: number; children: number; total: number };
  items: { code: string; label: string; amount: number }[];
  total: number;
};

type ItineraryDay = {
  dayNumber: number;
  dateLabel: string;
  city: string;
  title: string;
  highlights: string[];
};

function formatINR(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function QuoteClient() {
  const initial: QuoteInput = useMemo(() => {
    const t = todayISO();
    const next = new Date();
    next.setDate(next.getDate() + 2);
    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, "0");
    const dd = String(next.getDate()).padStart(2, "0");
    return {
      startCity: "varanasi",
      endCity: "varanasi",
      destinations: ["varanasi"],
      arrivalDate: t,
      departureDate: `${yyyy}-${mm}-${dd}`,
      adults: 2,
      children: 0,
      stayTier: "threeFourStar",
      guideType: "standard",
      vehicleType: "sedan",
      boating: "sunrise",
      addons: [],
    };
  }, []);

  const [input, setInput] = useState<QuoteInput>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[] | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(1);
  const [step, setStep] = useState<1 | 2>(1);

  async function getQuote() {
    setLoading(true);
    setError(null);
    setQuote(null);
    setItinerary(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Failed to compute quote");
      setQuote(data.quote);
      if (data.itinerary?.days) {
        setItinerary(data.itinerary.days as ItineraryDay[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function set<K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

function toggleAddon(id: QuoteInput["addons"][number], enabled: boolean) {
  setInput((prev) => {
    const has = prev.addons.includes(id);
    if (enabled && !has) {
      return { ...prev, addons: [...prev.addons, id] };
    }
    if (!enabled && has) {
      return { ...prev, addons: prev.addons.filter((x) => x !== id) };
    }
    return prev;
  });
}

function updateDestinations(
  current: QuoteInput["destinations"],
  city: City,
  enabled: boolean,
): QuoteInput["destinations"] {
  const has = current.includes(city);
  if (enabled && !has) {
    return [...current, city];
  }
  if (!enabled && has) {
    const next = current.filter((c) => c !== city);
    return next.length === 0 ? ["varanasi"] : next;
  }
  return current;
}

function fullCustomisationWhatsAppLink() {
  const phone = "919999999999"; // TODO: replace with your real Wandermate WhatsApp number
  const text =
    "Hi Wandermate, I want a fully customised trip plan (dates, hotels, side trips) beyond the instant quote.";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

  return (
    <>
      <div className="grid">
        <section className="card">
        <h2>Your trip details</h2>

        <div className="row" style={{ marginBottom: 8 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            {step === 1 ? "Step 1 of 2 — Trip basics" : "Step 2 of 2 — Stay & services"}
          </div>
        </div>

        {step === 1 && (
          <>
        <div className="row">
          <div>
            <label>Start your journey from</label>
            <select
              value={input.startCity}
              onChange={(e) => set("startCity", e.target.value as City)}
            >
              <option value="varanasi">Varanasi</option>
              <option value="ayodhya">Ayodhya</option>
              <option value="prayagraj">Prayagraj</option>
              <option value="vindhyachal">Vindhyachal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label>End your journey at</label>
            <select value={input.endCity} onChange={(e) => set("endCity", e.target.value as City)}>
              <option value="varanasi">Varanasi</option>
              <option value="ayodhya">Ayodhya</option>
              <option value="prayagraj">Prayagraj</option>
              <option value="vindhyachal">Vindhyachal</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Places you want to cover</label>
          <div className="row">
            <div>
              <label style={{ marginBottom: 4 }}>Core cities</label>
              <div className="toggleRow">
                <span>Varanasi</span>
                <input
                  type="checkbox"
                  checked={input.destinations.includes("varanasi")}
                  onChange={(e) =>
                    set(
                      "destinations",
                      updateDestinations(input.destinations, "varanasi", e.target.checked),
                    )
                  }
                  style={{ width: 18, height: 18 }}
                />
              </div>
              <div className="toggleRow" style={{ marginTop: 6 }}>
                <span>Ayodhya</span>
                <input
                  type="checkbox"
                  checked={input.destinations.includes("ayodhya")}
                  onChange={(e) =>
                    set(
                      "destinations",
                      updateDestinations(input.destinations, "ayodhya", e.target.checked),
                    )
                  }
                  style={{ width: 18, height: 18 }}
                />
              </div>
            </div>
            <div>
              <label style={{ marginBottom: 4 }}>More cities</label>
              <div className="toggleRow">
                <span>Prayagraj</span>
                <input
                  type="checkbox"
                  checked={input.destinations.includes("prayagraj")}
                  onChange={(e) =>
                    set(
                      "destinations",
                      updateDestinations(input.destinations, "prayagraj", e.target.checked),
                    )
                  }
                  style={{ width: 18, height: 18 }}
                />
              </div>
              <div className="toggleRow" style={{ marginTop: 6 }}>
                <span>Vindhyachal</span>
                <input
                  type="checkbox"
                  checked={input.destinations.includes("vindhyachal")}
                  onChange={(e) =>
                    set(
                      "destinations",
                      updateDestinations(input.destinations, "vindhyachal", e.target.checked),
                    )
                  }
                  style={{ width: 18, height: 18 }}
                />
              </div>
            </div>
          </div>
          <div className="footerNote">
            Varanasi is selected by default. Add Ayodhya, Prayagraj, and Vindhyachal if this is a
            multi-city trip.
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <label>Arrival date</label>
            <input
              type="date"
              value={input.arrivalDate}
              onChange={(e) => set("arrivalDate", e.target.value)}
            />
          </div>
          <div>
            <label>Departure date</label>
            <input
              type="date"
              value={input.departureDate}
              onChange={(e) => set("departureDate", e.target.value)}
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <label>Adults</label>
            <input
              type="number"
              min={1}
              max={50}
              value={input.adults}
              onChange={(e) => set("adults", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Children</label>
            <input
              type="number"
              min={0}
              max={50}
              value={input.children}
              onChange={(e) => set("children", Number(e.target.value))}
            />
          </div>
        </div>
          </>
        )}

        {step === 2 && (
          <>
        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <label>Adults</label>
            <input
              type="number"
              min={1}
              max={50}
              value={input.adults}
              onChange={(e) => set("adults", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Children</label>
            <input
              type="number"
              min={0}
              max={50}
              value={input.children}
              onChange={(e) => set("children", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <label>Stay type</label>
            <select value={input.stayTier} onChange={(e) => set("stayTier", e.target.value as any)}>
              <option value="twoStar">2 star</option>
              <option value="threeFourStar">3/4 star</option>
              <option value="fiveStar">5 star</option>
              <option value="heritage">Heritage hotel</option>
            </select>
          </div>
          <div>
            <label>Vehicle</label>
            <select
              value={input.vehicleType}
              onChange={(e) => set("vehicleType", e.target.value as any)}
            >
              <option value="none">No vehicle</option>
              <option value="auto">Auto / E-rickshaw</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="tempo">Tempo Traveller</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Guide</label>
          <select
            value={input.guideType}
            onChange={(e) => set("guideType", e.target.value as any)}
          >
            <option value="none">No guide</option>
            <option value="standard">Standard guide</option>
            <option value="senior">Senior guide</option>
            <option value="storyteller">Senior storyteller</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Boating</label>
          <select value={input.boating} onChange={(e) => set("boating", e.target.value as any)}>
            <option value="none">No boating</option>
            <option value="sunrise">Sunrise boat ride</option>
            <option value="evening">Evening aarti boat ride</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Optional add-ons</label>
          <div className="row">
            <div>
              <label style={{ marginBottom: 4 }}>Photography (per day)</label>
              <select
                value={input.addons.includes("photographyPerDay") ? "yes" : "no"}
                onChange={(e) =>
                  toggleAddon("photographyPerDay" as const, e.target.value === "yes")
                }
              >
                <option value="no">Not required</option>
                <option value="yes">Add photography</option>
              </select>
            </div>
            <div>
              <label style={{ marginBottom: 4 }}>Airport pick-up &amp; drop</label>
              <select
                value={input.addons.includes("airportPickupDrop") ? "yes" : "no"}
                onChange={(e) =>
                  toggleAddon("airportPickupDrop" as const, e.target.value === "yes")
                }
              >
                <option value="no">Not required</option>
                <option value="yes">Add airport transfer</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ marginBottom: 4 }}>Evening aarti assistance</label>
            <select
              value={input.addons.includes("eveningAartiAssistance") ? "yes" : "no"}
              onChange={(e) =>
                toggleAddon("eveningAartiAssistance" as const, e.target.value === "yes")
              }
            >
              <option value="no">Not required</option>
              <option value="yes">Add aarti assistance</option>
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ marginBottom: 4 }}>Sugam darshan pass</label>
            <select
              value={input.addons.includes("sugamDarshan") ? "yes" : "no"}
              onChange={(e) => toggleAddon("sugamDarshan" as const, e.target.value === "yes")}
            >
              <option value="no">Not required</option>
              <option value="yes">Add Sugam darshan</option>
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ marginBottom: 4 }}>Sparsh darshan support</label>
            <select
              value={input.addons.includes("sparshDarshan") ? "yes" : "no"}
              onChange={(e) => toggleAddon("sparshDarshan" as const, e.target.value === "yes")}
            >
              <option value="no">Not required</option>
              <option value="yes">Add Sparsh darshan support</option>
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ marginBottom: 4 }}>VIP temple visit slot</label>
            <select
              value={input.addons.includes("vipTempleVisit") ? "yes" : "no"}
              onChange={(e) => toggleAddon("vipTempleVisit" as const, e.target.value === "yes")}
            >
              <option value="no">Not required</option>
              <option value="yes">Add VIP temple visit</option>
            </select>
          </div>
        </div>
          </>
        )}

        <div className="actions" style={{ marginTop: 16 }}>
          {step === 2 && (
            <button
              className="secondary"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Next: stay & services
            </button>
          ) : (
            <button onClick={getQuote} disabled={loading}>
              {loading ? "Calculating..." : "Get exact price"}
            </button>
          )}
        </div>

        <div className="actions" style={{ marginTop: 8 }}>
          <button
            className="secondary"
            onClick={() => {
              setInput(initial);
              setQuote(null);
              setError(null);
              setItinerary(null);
              setStep(1);
            }}
            disabled={loading}
          >
            Reset all
          </button>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="footerNote">
          Pricing is configurable by you. For “exact price”, open <a href="/admin">Admin</a> and set
          your real hotel/vehicle/guide/boat rates + tax/rounding.
        </div>
        <div className="actions" style={{ marginTop: 8 }}>
          <a
            href={fullCustomisationWhatsAppLink()}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none", width: "100%" }}
          >
            <button className="secondary" style={{ width: "100%" }}>
              WhatsApp us for full customisation
            </button>
          </a>
        </div>
      </section>

      <aside className="card">
        <h2>Instant quotation</h2>
        {!quote ? (
          <p className="muted" style={{ marginTop: 0 }}>
            Fill the form and click “Get exact price”.
          </p>
        ) : (
          <>
            <div className="kpi">
              <div>
                <small>
                  {quote.travelers.total} travelers • {quote.nights} nights • {quote.days} days
                </small>
              </div>
              <strong>{formatINR(quote.total, quote.currency)}</strong>
            </div>

            {(() => {
              const coreItems =
                quote.items.filter((i) => i.code !== "addons" && i.code !== "subtotal") ?? [];
              const addonItems = quote.items.filter((i) => i.code === "addons") ?? [];
              return (
                <>
                  <ul className="list">
                    {coreItems.map((i, idx) => (
                      <li key={`core-${idx}`}>
                        <span>{i.label}</span>
                        <div>{formatINR(i.amount, quote.currency)}</div>
                      </li>
                    ))}
                    <li>
                      <span>Total</span>
                      <div>
                        <strong>{formatINR(quote.total, quote.currency)}</strong>
                      </div>
                    </li>
                  </ul>
                  {addonItems.length > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        Add-ons selected
                      </div>
                      <ul className="list">
                        {addonItems.map((i, idx) => (
                          <li key={`addon-${idx}`}>
                            <span>{i.label}</span>
                            <div>{formatINR(i.amount, quote.currency)}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              );
            })()}

            <div className="actions" style={{ marginTop: 12 }}>
              <button
                style={{ width: "100%" }}
                onClick={() => {
                  if (typeof window !== "undefined" && quote) {
                    const params = new URLSearchParams({
                      total: String(quote.total),
                      currency: quote.currency,
                      arrivalDate: input.arrivalDate,
                      departureDate: input.departureDate,
                      adults: String(input.adults),
                      children: String(input.children),
                    });
                    window.location.href = `/book?${params.toString()}`;
                  }
                }}
              >
                Book now
              </button>
            </div>

            <div className="footerNote">
              This quote is computed instantly by your pricing rules (no staff intervention).
            </div>
          </>
        )}
      </aside>
    </div>

      {itinerary && itinerary.length > 0 ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Suggested itinerary</h2>
          <ul className="list" style={{ marginTop: 4 }}>
            {itinerary.map((d) => (
              <li
                key={d.dayNumber}
                style={{ flexDirection: "column", alignItems: "flex-start", cursor: "pointer" }}
                onClick={() => setOpenDay((prev) => (prev === d.dayNumber ? null : d.dayNumber))}
              >
                <span
                  style={{ display: "flex", justifyContent: "space-between", width: "100%" }}
                >
                  <strong>
                    Day {d.dayNumber}: {d.city} — {d.title}
                  </strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {openDay === d.dayNumber ? "Hide" : "View"}
                  </span>
                </span>
                {openDay === d.dayNumber ? (
                  <>
                    <span className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {d.dateLabel}
                    </span>
                    <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                      {d.highlights.map((h, idx) => (
                        <li key={idx} style={{ fontSize: 12, color: "var(--muted)" }}>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Why travel with Wandermate</h2>
        <ul className="list" style={{ marginTop: 4 }}>
          <li>
            <span>24×7 on-ground support</span>
            <div className="muted">
              Local team in and around Varanasi to help with real-time changes, delays or emergencies.
            </div>
          </li>
          <li>
            <span>Trusted local guides & vendors</span>
            <div className="muted">
              Verified guides, boatmen, and drivers who understand darshan timings, crowd patterns and senior-friendly routes.
            </div>
          </li>
          <li>
            <span>Transparent, itemised pricing</span>
            <div className="muted">
              Clear breakup of hotel, vehicle, guide, boating and add-ons with no hidden charges.
            </div>
          </li>
          <li>
            <span>Customisable pilgrim-first itineraries</span>
            <div className="muted">
              Itineraries tuned for mandir darshan, aarti timings and comfort rather than rushed sightseeing.
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}

