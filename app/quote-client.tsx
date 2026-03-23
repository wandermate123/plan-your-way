"use client";

import React, { useMemo, useState } from "react";
import {
  IconMapPin, IconUsers, IconCar, IconBuilding2, IconTarget, IconShip, IconCheck,
  IconFileDown, IconShare2, IconBookOpen, IconMessageCircle, IconCalendar, IconUser, IconBaby,
  IconAnchor, IconMountain, IconLandmark, IconStar, IconSparkles, IconFootprints, IconTruck,
  IconSunrise, IconFlame, IconMinus, IconScroll, IconCamera, IconGitBranch, IconShirt, IconChevronDown,
} from "./icons";

type City = "varanasi" | "ayodhya" | "prayagraj" | "vindhyachal" | "other";

type QuoteInput = {
  startCity: City;
  endCity: City;
  destinations: City[];
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  childrenAges?: number[];
  stayTier: "twoStar" | "threeFourStar" | "fiveStar" | "heritage";
  guideType: "none" | "standard" | "senior" | "storyteller";
  vehicleType: "none" | "auto" | "sedan" | "suv" | "tempo";
  boating: "none" | "sunrise" | "evening";
  addons: (
    | "photographyPerDay"
    | "sugamDarshan"
    | "spiritualTriangle"
    | "heritageWalk"
    | "silkWalk"
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
      childrenAges: [],
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
  const [finalExpandedDays, setFinalExpandedDays] = useState<Set<number>>(() => new Set([1]));
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const step1Valid = useMemo(() => {
    if (!input.arrivalDate || !input.departureDate) return false;
    const arrival = new Date(input.arrivalDate);
    const departure = new Date(input.departureDate);
    if (departure < arrival) return false;
    if (input.adults < 1) return false;
    if (input.children > 0) {
      const ages = input.childrenAges ?? [];
      if (ages.length !== input.children) return false;
      if (ages.some((a) => a < 0 || a > 17)) return false;
    }
    if (!input.destinations?.length) return false;
    return true;
  }, [input.arrivalDate, input.departureDate, input.adults, input.children, input.childrenAges, input.destinations]);

  const step2Valid = true; // Stay, vehicle, boat, guide all have required selections with defaults
  const step3Valid = true; // Add-ons are optional

  function handleStepNext() {
    setStepError(null);
    if (step === 1 && !step1Valid) {
      setStepError("Please fill all required fields: check dates (departure must be on or after arrival), adults, and child ages if travelling with children.");
      return;
    }
    if (step === 2 && !step2Valid) {
      setStepError("Please select your stay, transport, boat experience, and guide options.");
      return;
    }
    setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  }

  const faqs = [
    {
      q: "How can I modify my itinerary after getting a quote?",
      a: "You can chat with us on WhatsApp to request changes. We'll adjust your plan and send an updated quote within a few hours.",
    },
    {
      q: "What is the cancellation policy?",
      a: "Cancellations and refunds depend on how close you are to the trip date. Full details are shared at booking. We recommend discussing any concerns with us on WhatsApp before confirming.",
    },
    {
      q: "When do I need to pay?",
      a: "A booking deposit is usually required to confirm your reservation. The remaining amount can be paid before or during your trip. We'll share the exact breakdown when you book.",
    },
    {
      q: "Is the quoted price final?",
      a: "Yes. The instant quote reflects our current rates for your selected options. Prices are locked in once you confirm the booking.",
    },
    {
      q: "How do I contact support during my trip?",
      a: "Our local team is available 24×7 on WhatsApp. You'll receive a dedicated contact number after booking for real-time support during your stay.",
    },
    {
      q: "Do you accommodate senior citizens or special needs?",
      a: "Yes. We can arrange senior-friendly itineraries, wheelchair access where possible, and modified pacing. Mention your requirements when booking or chat with us on WhatsApp.",
    },
  ];

  function toggleFinalDay(dayNum: number) {
    setFinalExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum);
      else next.add(dayNum);
      return next;
    });
  }

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

function fullCustomisationWhatsAppLink() {
  const phone = "919214313559"; // TODO: replace with your real Wandermate WhatsApp number
  const text =
    "Hi Wandermate, I want a fully customised trip plan (dates, hotels, side trips) beyond the instant quote.";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function bookingWhatsAppLink(input: QuoteInput, quote: QuoteResult) {
  const phone = "919214313559"; // TODO: replace with your real Wandermate WhatsApp number
  const msg = [
    `Hi Wandermate! I'd like to book this trip:`,
    ``,
    `Dates: ${input.arrivalDate} to ${input.departureDate}`,
    `Travelers: ${input.adults} adults${input.children > 0 ? `, ${input.children} children` : ""}`,
    `Destinations: ${input.destinations.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}`,
    `Stay: ${input.stayTier} | Vehicle: ${input.vehicleType} | Guide: ${input.guideType} | Boat: ${input.boating}`,
    `Add-ons: ${input.addons.length > 0 ? input.addons.join(", ") : "None"}`,
    ``,
    `Quoted total: ${quote.currency} ${quote.total}`,
    ``,
    `Please confirm booking.`,
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function chatSupportWhatsAppLink() {
  const phone = "919214313559";
  return `https://wa.me/${phone}`;
}

  const finalRef = React.useRef<HTMLDivElement>(null);

  function handleDownloadPDF() {
    if (typeof window === "undefined") return;
    window.print();
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share && quote) {
      try {
        await navigator.share({
          title: "Wandermate — My Varanasi Itinerary",
          text: `${quote.travelers.total} travelers • ${quote.nights} nights • ${formatINR(quote.total, quote.currency)}`,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard?.writeText(window.location.href);
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  }

  if (quote) {
    return (
      <>
        <div className="finalView" ref={finalRef}>
          <div className="finalHero">
            <h1 className="finalHeroTitle">Your Final Personalized Itinerary is Ready!</h1>
            <p className="finalHeroSub">Review your unique Kashi journey and get ready to experience the sacred city.</p>
          </div>

          <div className="finalLayout">
            <div className="finalMain">
              <section className="finalSection card">
                <div className="finalSectionHeader terracotta">Confirmed reservations</div>
                <div className="finalSectionBody">
                  <div className="finalOverviewList">
                    <div className="finalOverviewItem">
                      <span className="finalOverviewIcon"><IconMapPin /></span>
                      <span><strong>Destinations:</strong> {input.destinations.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}</span>
                    </div>
                    <div className="finalOverviewItem">
                      <span className="finalOverviewIcon"><IconUsers /></span>
                      <span><strong>Travelers:</strong> {input.adults} adults{input.children > 0 ? `, ${input.children} children` : ""}</span>
                    </div>
                    <div className="finalOverviewItem">
                      <span className="finalOverviewIcon"><IconCar /></span>
                      <span><strong>Vehicle:</strong> {input.vehicleType === "none" ? "None" : input.vehicleType.charAt(0).toUpperCase() + input.vehicleType.slice(1)}</span>
                    </div>
                    <div className="finalOverviewItem">
                      <span className="finalOverviewIcon"><IconBuilding2 /></span>
                      <span><strong>Accommodation:</strong> {input.stayTier === "twoStar" ? "2 Star" : input.stayTier === "threeFourStar" ? "3/4 Star" : input.stayTier === "fiveStar" ? "5 Star" : "Heritage"}</span>
                    </div>
                    <div className="finalOverviewItem">
                      <span className="finalOverviewIcon"><IconTarget /></span>
                      <span><strong>Guide:</strong> {input.guideType === "none" ? "None" : input.guideType.charAt(0).toUpperCase() + input.guideType.slice(1)}</span>
                    </div>
                    <div className="finalOverviewItem">
                      <span className="finalOverviewIcon"><IconShip /></span>
                      <span><strong>Boat:</strong> {input.boating === "none" ? "None" : input.boating === "sunrise" ? "Sunrise boat" : "Evening Aarti"}</span>
                    </div>
                    <div className="finalOverviewItem">
                      <span className="finalOverviewIcon"><IconCheck /></span>
                      <span><strong>Add-ons:</strong> {input.addons.length > 0 ? input.addons.map((a) => {
                        const labels: Record<string, string> = {
                          photographyPerDay: "Photography",
                          sugamDarshan: "Sugam Darshan",
                          spiritualTriangle: "Spiritual Triangle",
                          heritageWalk: "Heritage Walk",
                          silkWalk: "Silk Walk",
                        };
                        return labels[a] ?? a;
                      }).join(", ") : "None"}</span>
                    </div>
                  </div>
                </div>
              </section>

              {itinerary && itinerary.length > 0 && (
                <section className="finalSection card">
                  <div className="finalSectionHeader navy">Your {quote.days}-day journey plan</div>
                  <div className="finalSectionBody">
                    <div className="finalItineraryTimeline">
                      {itinerary.map((d) => {
                        const isExpanded = finalExpandedDays.has(d.dayNumber);
                        return (
                          <div key={d.dayNumber} className={`finalItineraryDay ${isExpanded ? "expanded" : ""}`}>
                            <div
                              className="finalItineraryDayHeader"
                              onClick={() => toggleFinalDay(d.dayNumber)}
                            >
                              <span className="finalItineraryDayNum">Day {d.dayNumber}</span>
                              <span className="finalItineraryDate">{d.dateLabel}</span>
                              <span className="finalItineraryDrop"><IconChevronDown /></span>
                            </div>
                            {isExpanded && (
                              <>
                                <div className="finalItineraryDayCity">{d.city}</div>
                                <div className="finalItineraryDayTitle">{d.title}</div>
                                <ul className="finalItineraryHighlights">
                                  {d.highlights.map((h, idx) => (
                                    <li key={idx}>{h}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              <section className="finalSection card">
                <div className="finalSectionHeader terracotta">Price breakdown</div>
                <div className="finalSectionBody">
                  <ul className="finalPriceList">
                    {quote.items
                      .filter((i) => i.code !== "subtotal" && i.code !== "rounding")
                      .map((i, idx) => (
                        <li key={idx}>
                          <span>{i.label}</span>
                          <span>{formatINR(i.amount, quote.currency)}</span>
                        </li>
                      ))}
                    <li className="finalPriceTotal">
                      <span>Total</span>
                      <strong>{formatINR(quote.total, quote.currency)}</strong>
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            <aside className="finalSidebar">
              <div className="finalActionGrid">
                <button className="finalActionBtn" onClick={handleDownloadPDF} title="Download PDF">
                  <span className="finalActionIcon"><IconFileDown /></span>
                  <span>Download PDF</span>
                </button>
                <button className="finalActionBtn" onClick={handleShare} title="Share">
                  <span className="finalActionIcon"><IconShare2 /></span>
                  <span>Share</span>
                </button>
                <a
                  href={bookingWhatsAppLink(input, quote)}
                  target="_blank"
                  rel="noreferrer"
                  className="finalActionBtn"
                  title="Get Travel Guide"
                >
                  <span className="finalActionIcon"><IconBookOpen /></span>
                  <span>Get guide via WhatsApp</span>
                </a>
                <a
                  href={chatSupportWhatsAppLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="finalActionBtn highlight"
                  title="Chat on WhatsApp"
                >
                  <span className="finalActionIcon"><IconMessageCircle /></span>
                  <span>Chat on WhatsApp</span>
                </a>
              </div>

              <div className="finalSummaryCard card">
                <div className="finalSummaryHeader">Estimated total</div>
                <div className="finalSummaryPrice">{formatINR(quote.total, quote.currency)}</div>
                <p className="finalSummaryNote">
                  {quote.travelers.total} travelers • {quote.nights} nights • {quote.days} days
                </p>

                <div className="finalBookingActions">
                  <button
                    className="finalBookBtn"
                    onClick={() => {
                      const params = new URLSearchParams({
                        total: String(quote.total),
                        currency: quote.currency,
                        arrivalDate: input.arrivalDate,
                        departureDate: input.departureDate,
                        adults: String(input.adults),
                        children: String(input.children),
                        ...(input.childrenAges?.length ? { childrenAges: input.childrenAges!.join(",") } : {}),
                      });
                      window.location.href = `/book?${params.toString()}`;
                    }}
                  >
                    ✓ Book via website
                  </button>
                  <a
                    href={bookingWhatsAppLink(input, quote)}
                    target="_blank"
                    rel="noreferrer"
                    className="finalBookBtn secondary"
                  >
                    Book via WhatsApp
                  </a>
                </div>
              </div>

              <button
                className="finalStartOver"
                onClick={() => {
                  setQuote(null);
                  setItinerary(null);
                  setFinalExpandedDays(new Set([1]));
                  setStep(1);
                }}
              >
                ← Start new quote
              </button>
            </aside>
          </div>
        </div>

        <a
          href={chatSupportWhatsAppLink()}
          target="_blank"
          rel="noreferrer"
          className="finalFloatingChat"
          title="Chat on WhatsApp"
        >
          <IconMessageCircle /> Chat on WhatsApp
        </a>

        <section className="card" style={{ marginTop: 16 }}>
          <h2>Why travel with Wandermate</h2>
          <ul className="list" style={{ marginTop: 4 }}>
            <li><span>24×7 on-ground support</span><div className="muted">Local team in Varanasi for real-time help.</div></li>
            <li><span>Trusted guides &amp; vendors</span><div className="muted">Verified guides who understand darshan timings.</div></li>
            <li><span>Transparent pricing</span><div className="muted">Clear breakup with no hidden charges.</div></li>
            <li><span>Customisable itineraries</span><div className="muted">Pilgrim-first plans tuned for comfort.</div></li>
          </ul>
        </section>

        <section className="card faqSection" style={{ marginTop: 16 }}>
          <h2>Frequently asked questions</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
            Can&apos;t find your answer? <a href={chatSupportWhatsAppLink()} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Chat with us on WhatsApp</a>
          </p>
          <div className="faqList">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`faqItem ${expandedFaq === i ? "expanded" : ""}`}
                onClick={() => setExpandedFaq((prev) => (prev === i ? null : i))}
              >
                <div className="faqQuestion">
                  <span>{faq.q}</span>
                  <span className="faqDrop">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
                {expandedFaq === i && <div className="faqAnswer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="grid">
        <section className="card">
        <h2>Your trip details</h2>

        <div className="row" style={{ marginBottom: 8 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            {step === 1
              ? "Step 1 of 3 — Trip basics"
              : step === 2
                ? "Step 2 of 3 — Stay & services"
                : "Step 3 of 3 — Add-ons"}
          </div>
        </div>

        {step === 1 && (
          <>
        <div className="stepProgress">
          <span className="muted" style={{ fontSize: 13 }}>Step 1 of 3</span>
          <div className="stepProgressBar">
            <div className="stepProgressFill" style={{ width: "33.33%" }} />
          </div>
        </div>
        <h2 className="stepMainTitle">Step 1: Trip Logistics & Transport</h2>

        <div className="step1Columns">
          <div className="step1Section">
            <div className="step1SectionHeader">1. Describe your group & dates</div>
            <div className="step1SectionBody">
              <div className="step1Dates">
                <div>
                  <label>Arrival date <span className="required">*</span></label>
                  <div className="step1DateRow">
                    <span className="step1DateIcon"><IconCalendar /></span>
                    <input
                      type="date"
                      value={input.arrivalDate}
                      onChange={(e) => set("arrivalDate", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label>Departure date <span className="required">*</span></label>
                  <div className="step1DateRow">
                    <span className="step1DateIcon"><IconCalendar /></span>
                    <input
                      type="date"
                      value={input.departureDate}
                      onChange={(e) => set("departureDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label>Group size <span className="required">*</span></label>
                <div className="step1GroupGrid">
                  <div className="step1GroupCard selected">
                    <span className="step1GroupIcon"><IconUser /></span>
                    <span className="step1GroupLabel">Adults</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={input.adults}
                      onChange={(e) => set("adults", Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                      className="step1GroupInput"
                    />
                  </div>
                  <div
                    className={`step1GroupCard ${input.children > 0 ? "selected" : ""}`}
                    onClick={() => input.children === 0 && set("children", 1)}
                  >
                    <span className="step1GroupIcon"><IconBaby /></span>
                    <span className="step1GroupLabel">Children</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={input.children}
                      onChange={(e) => {
                        const n = Math.max(0, Math.min(50, Number(e.target.value) || 0));
                        setInput((prev) => {
                          const ages = prev.childrenAges ?? Array(prev.children).fill(5);
                          const newAges =
                            n < ages.length
                              ? ages.slice(0, n)
                              : [...ages, ...Array(n - ages.length).fill(5)];
                          return { ...prev, children: n, childrenAges: newAges };
                        });
                      }}
                      className="step1GroupInput"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                {input.children > 0 && (
                  <div className="step1ChildrenAges">
                    <label>Child ages (years) <span className="required">*</span></label>
                    <div className="step1AgeChips">
                      {Array.from({ length: input.children }, (_, i) => (
                        <div key={i} className="step1AgeChip">
                          <span>Child {i + 1}:</span>
                          <input
                            type="number"
                            min={0}
                            max={17}
                            value={input.childrenAges?.[i] ?? 5}
                            onChange={(e) => {
                              const age = Math.max(0, Math.min(17, Number(e.target.value) || 0));
                              setInput((prev) => {
                                const ages = [...(prev.childrenAges ?? Array(prev.children).fill(5))];
                                ages[i] = age;
                                return { ...prev, childrenAges: ages };
                              });
                            }}
                          />
                          <span>yrs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="step1Section">
            <div className="step1SectionHeader alt">2. Choose places to cover</div>
            <div className="step1SectionBody">
              <div
                className="step1PlaceCard checked"
                style={{ cursor: "default", opacity: 0.9 }}
              >
                <span className="step1PlaceIcon"><IconLandmark /></span>
                <span className="step1PlaceLabel">Varanasi</span>
                <span className="step1PlaceBadge">(Base — always included)</span>
              </div>
              {(["ayodhya", "prayagraj", "vindhyachal"] as const).map((city) => (
                <div
                  key={city}
                  className={`step1PlaceCard ${input.destinations.includes(city) ? "checked" : ""}`}
                  onClick={() => {
                    const enabled = !input.destinations.includes(city);
                    set(
                      "destinations",
                      enabled
                        ? Array.from(new Set([...input.destinations, city]))
                        : input.destinations.filter((c) => c !== city)
                    );
                  }}
                >
                  <span className="step1PlaceIcon">
                    {city === "ayodhya" ? <IconAnchor /> : city === "prayagraj" ? <IconMapPin /> : <IconMountain />}
                  </span>
                  <span className="step1PlaceLabel">
                    {city.charAt(0).toUpperCase() + city.slice(1)}
                  </span>
                  <span className="step1PlaceBadge">(Optional)</span>
                </div>
              ))}
              <p className="footerNote" style={{ marginTop: 10, marginBottom: 0 }}>
                Add Ayodhya, Prayagraj or Vindhyachal for a multi-city trip.
              </p>
            </div>
          </div>
        </div>

        {stepError ? <div className="error" style={{ marginTop: 12 }}>{stepError}</div> : null}
        <div className="step1NextBtn">
          <button
            onClick={handleStepNext}
            disabled={!step1Valid}
          >
            Next: Define your experiences
          </button>
        </div>
          </>
        )}

        {(step === 2 || step === 3) && (
          <>
        {step === 2 && (
          <>
        <div className="stepProgress">
          <span className="muted" style={{ fontSize: 13 }}>Step 2 of 3</span>
          <div className="stepProgressBar">
            <div className="stepProgressFill" style={{ width: "66.66%" }} />
          </div>
        </div>
        <h2 className="stepMainTitle">Step 2: Deepen Your Varanasi Experience</h2>

        <div className="step2Grid">
          <div className="step2Section">
            <div className="step2SectionHeader terracotta">1. Choose your stay <span className="required">*</span></div>
            <div className="step2SectionBody">
              {[
                { value: "twoStar" as const, Icon: IconBuilding2, title: "2 Star", tagline: "Simple, budget-friendly" },
                { value: "threeFourStar" as const, Icon: IconStar, title: "3/4 Star", tagline: "Comfort & value" },
                { value: "fiveStar" as const, Icon: IconSparkles, title: "5 Star", tagline: "Luxury & amenities" },
                { value: "heritage" as const, Icon: IconLandmark, title: "Heritage hotel", tagline: "Character & tradition" },
              ].map((opt) => {
                const IconComponent = opt.Icon;
                return (
                <div
                  key={opt.value}
                  className={`step2OptionCard ${input.stayTier === opt.value ? "selected" : ""}`}
                  onClick={() => set("stayTier", opt.value)}
                >
                  <span className="step2OptionIcon"><IconComponent /></span>
                  <div className="step2OptionContent">
                    <div className="step2OptionTitle">{opt.title}</div>
                    <div className="step2OptionTagline">{opt.tagline}</div>
                  </div>
                  <div className="step2OptionRadio" />
                </div>
              );
              })}
            </div>
          </div>

          <div className="step2Section">
            <div className="step2SectionHeader navy">2. Select your transport <span className="required">*</span></div>
            <div className="step2SectionBody">
              {[
                { value: "none" as const, Icon: IconFootprints, title: "No vehicle", tagline: "Walk & local transport" },
                { value: "auto" as const, Icon: IconCar, title: "Auto / E-rickshaw", tagline: "Local, nimble" },
                { value: "sedan" as const, Icon: IconCar, title: "Sedan", tagline: "Simple, efficient" },
                { value: "suv" as const, Icon: IconCar, title: "SUV", tagline: "Comfort, space" },
                { value: "tempo" as const, Icon: IconTruck, title: "Tempo Traveller", tagline: "Group transport" },
              ].map((opt) => {
                const IconComponent = opt.Icon;
                return (
                <div
                  key={opt.value}
                  className={`step2OptionCard ${input.vehicleType === opt.value ? "selected" : ""}`}
                  onClick={() => set("vehicleType", opt.value)}
                >
                  <span className="step2OptionIcon"><IconComponent /></span>
                  <div className="step2OptionContent">
                    <div className="step2OptionTitle">{opt.title}</div>
                    <div className="step2OptionTagline">{opt.tagline}</div>
                  </div>
                  <div className="step2OptionRadio" />
                </div>
              );
              })}
            </div>
          </div>

          <div className="step2Section">
            <div className="step2SectionHeader terracotta">3. Boat experience <span className="required">*</span></div>
            <div className="step2SectionBody">
              {[
                { value: "none" as const, Icon: IconMinus, title: "No boating", tagline: "Skip boat rides" },
                { value: "sunrise" as const, Icon: IconSunrise, title: "Sunrise boat ride", tagline: "Morning serenity on the Ganges" },
                { value: "evening" as const, Icon: IconFlame, title: "Evening aarti boat", tagline: "Aarti with music & meditation" },
              ].map((opt) => {
                const IconComponent = opt.Icon;
                return (
                <div
                  key={opt.value}
                  className={`step2OptionCard ${input.boating === opt.value ? "selected" : ""}`}
                  onClick={() => set("boating", opt.value)}
                >
                  <span className="step2OptionIcon"><IconComponent /></span>
                  <div className="step2OptionContent">
                    <div className="step2OptionTitle">{opt.title}</div>
                    <div className="step2OptionTagline">{opt.tagline}</div>
                  </div>
                  <div className="step2OptionRadio" />
                </div>
              );
              })}
            </div>
          </div>

          <div className="step2Section">
            <div className="step2SectionHeader navy">4. Guide profile <span className="required">*</span></div>
            <div className="step2SectionBody">
              {[
                { value: "none" as const, Icon: IconMinus, title: "No guide", tagline: "Explore independently" },
                { value: "standard" as const, Icon: IconTarget, title: "Standard guide", tagline: "English, cultural insights" },
                { value: "senior" as const, Icon: IconUser, title: "Senior guide", tagline: "Experienced, deeper stories" },
                { value: "storyteller" as const, Icon: IconScroll, title: "Senior storyteller", tagline: "Stories & heritage expert" },
              ].map((opt) => {
                const IconComponent = opt.Icon;
                return (
                <div
                  key={opt.value}
                  className={`step2OptionCard ${input.guideType === opt.value ? "selected" : ""}`}
                  onClick={() => set("guideType", opt.value)}
                >
                  <span className="step2OptionIcon"><IconComponent /></span>
                  <div className="step2OptionContent">
                    <div className="step2OptionTitle">{opt.title}</div>
                    <div className="step2OptionTagline">{opt.tagline}</div>
                  </div>
                  <div className="step2OptionRadio" />
                </div>
              );
              })}
            </div>
          </div>
        </div>
          </>
        )}

        {step === 3 && (
          <>
        <div className="stepProgress">
          <span className="muted" style={{ fontSize: 13 }}>Step 3 of 3 (Final)</span>
          <div className="stepProgressBar">
            <div className="stepProgressFill" style={{ width: "100%" }} />
          </div>
        </div>
        <h2 className="stepMainTitle">Step 3: Accommodation &amp; Final Touches</h2>

        <div className="step3Layout">
          <div className="step3AddonsSection">
            <div className="step2Section">
              <div className="step2SectionHeader terracotta">
                1. Personalize with add-ons <span className="step3Hint">(Select all that apply)</span>
              </div>
              <div className="step2SectionBody">
                <div className="step3AddonGrid">
                  {[
                    { id: "photographyPerDay" as const, Icon: IconCamera, title: "Professional Photography", tagline: "Per day session" },
                    { id: "sugamDarshan" as const, Icon: IconSparkles, title: "Sugam Darshan", tagline: "Easier temple access" },
                    { id: "spiritualTriangle" as const, Icon: IconGitBranch, title: "Spiritual Triangle Add-ons", tagline: "Varanasi–Ayodhya–Prayagraj" },
                    { id: "heritageWalk" as const, Icon: IconLandmark, title: "Heritage Walk", tagline: "Historic streets & stories" },
                    { id: "silkWalk" as const, Icon: IconShirt, title: "Silk Walk", tagline: "Banarasi silk weaving tour" },
                  ].map((opt) => {
                    const IconComponent = opt.Icon;
                    return (
                    <div
                      key={opt.id}
                      className={`step3AddonCard ${input.addons.includes(opt.id) ? "selected" : ""}`}
                      onClick={() => toggleAddon(opt.id, !input.addons.includes(opt.id))}
                    >
                      <div className="step3AddonCardContent">
                        <span className="step3AddonIcon"><IconComponent /></span>
                        <div className="step3AddonTitle">{opt.title}</div>
                        <div className="step3AddonTagline">{opt.tagline}</div>
                      </div>
                      <div className="step3AddonCheckbox">
                        <input
                          type="checkbox"
                          checked={input.addons.includes(opt.id)}
                          onChange={(e) => toggleAddon(opt.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="step3ReviewSection">
            <div className="step2Section">
              <div className="step2SectionHeader navy">2. Final details &amp; review</div>
              <div className="step2SectionBody">
                <div className="step3ReviewList">
                  <div className="step3ReviewItem">
                    <span className="step3ReviewIcon"><IconMapPin /></span>
                    <span><strong>Destinations:</strong> {input.destinations.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}</span>
                  </div>
                  <div className="step3ReviewItem">
                    <span className="step3ReviewIcon"><IconCar /></span>
                    <span><strong>Transport:</strong> {input.vehicleType === "none" ? "None" : input.vehicleType.charAt(0).toUpperCase() + input.vehicleType.slice(1)}</span>
                  </div>
                  <div className="step3ReviewItem">
                    <span className="step3ReviewIcon"><IconShip /></span>
                    <span><strong>Boat:</strong> {input.boating === "none" ? "None" : input.boating === "sunrise" ? "Sunrise" : "Evening Aarti"}</span>
                  </div>
                  <div className="step3ReviewItem">
                    <span className="step3ReviewIcon"><IconTarget /></span>
                    <span><strong>Guide:</strong> {input.guideType === "none" ? "None" : input.guideType.charAt(0).toUpperCase() + input.guideType.slice(1)}</span>
                  </div>
                  <div className="step3ReviewItem">
                    <span className="step3ReviewIcon"><IconBuilding2 /></span>
                    <span><strong>Stay:</strong> {input.stayTier === "twoStar" ? "2 Star" : input.stayTier === "threeFourStar" ? "3/4 Star" : input.stayTier === "fiveStar" ? "5 Star" : "Heritage"}</span>
                  </div>
                  <div className="step3ReviewItem">
                    <span className="step3ReviewIcon"><IconCheck /></span>
                    <span><strong>Add-ons:</strong> {input.addons.length > 0 ? input.addons.map((a) => {
                      const labels: Record<string, string> = {
                        photographyPerDay: "Photography",
                        sugamDarshan: "Sugam Darshan",
                        spiritualTriangle: "Spiritual Triangle",
                        heritageWalk: "Heritage Walk",
                        silkWalk: "Silk Walk",
                      };
                      return labels[a] ?? a;
                    }).join(", ") : "None"}</span>
                  </div>
                </div>
                <p className="footerNote" style={{ marginTop: 12, marginBottom: 0 }}>
                  Click &quot;Get exact price&quot; below to see your estimated total.
                </p>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
        {(step === 2 && stepError) ? <div className="error" style={{ marginTop: 12 }}>{stepError}</div> : null}
        <div className="actions" style={{ marginTop: 16 }}>
          {step > 1 && (
            <button
              className="secondary"
              onClick={() => { setStepError(null); setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev)); }}
              disabled={loading}
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleStepNext}
              disabled={loading || (step === 2 && !step2Valid)}
            >
              {step === 2 ? "Next: Add-ons & finalise" : "Next: Define your experiences"}
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
          </>
        )}
      </section>

      <aside className="card">
        <h2>Instant quotation</h2>
        {!quote ? (
          <p className="muted" style={{ marginTop: 0 }}>
            Fill the form and click “Get exact price”.
          </p>
        ) : (() => {
          const q = quote as QuoteResult;
          return (
          <>
            <div className="kpi">
              <div>
                <small>
                  {q.travelers.total} travelers • {q.nights} nights • {q.days} days
                </small>
              </div>
              <strong>{formatINR(q.total, q.currency)}</strong>
            </div>

            <div className="actions" style={{ marginTop: 8 }}>
              <button
                className="secondary"
                style={{ width: "100%", fontSize: 12, padding: "6px 10px" }}
                onClick={() => setShowBreakdown((prev) => !prev)}
              >
                {showBreakdown ? "Hide full price breakup" : "Show full price breakup"}
              </button>
            </div>

            {showBreakdown ? (
              (() => {
                const coreItems =
                  q.items.filter((i) => i.code !== "addons" && i.code !== "subtotal") ?? [];
                const addonItems = q.items.filter((i) => i.code === "addons") ?? [];
                return (
                  <>
                    <ul className="list">
                      {coreItems.map((i, idx) => (
                        <li key={`core-${idx}`}>
                          <span>{i.label}</span>
                          <div>{formatINR(i.amount, q.currency)}</div>
                        </li>
                      ))}
                      <li>
                        <span>Total</span>
                        <div>
                          <strong>{formatINR(q.total, q.currency)}</strong>
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
                              <div>{formatINR(i.amount, q.currency)}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                );
              })()
            ) : null}

            <div className="actions" style={{ marginTop: 12 }}>
              <button
                style={{ width: "100%" }}
                onClick={() => {
                  if (typeof window !== "undefined" && q) {
                    const params = new URLSearchParams({
                      total: String(q.total),
                      currency: q.currency,
                      arrivalDate: input.arrivalDate,
                      departureDate: input.departureDate,
                      adults: String(input.adults),
                      children: String(input.children),
                      ...(input.childrenAges?.length
                        ? { childrenAges: input.childrenAges.join(",") }
                        : {}),
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
          );
        })()}
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
            <span>Trusted local guides &amp; vendors</span>
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

      <section className="card faqSection" style={{ marginTop: 16 }}>
        <h2>Frequently asked questions</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
          Can&apos;t find your answer? <a href={chatSupportWhatsAppLink()} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Chat with us on WhatsApp</a>
        </p>
        <div className="faqList">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`faqItem ${expandedFaq === i ? "expanded" : ""}`}
              onClick={() => setExpandedFaq((prev) => (prev === i ? null : i))}
            >
              <div className="faqQuestion">
                <span>{faq.q}</span>
                <span className="faqDrop"><IconChevronDown /></span>
              </div>
              {expandedFaq === i && <div className="faqAnswer">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      <a
        href={chatSupportWhatsAppLink()}
        target="_blank"
        rel="noreferrer"
        className="finalFloatingChat"
        title="Chat on WhatsApp"
      >
        <IconMessageCircle /> Chat on WhatsApp
      </a>
    </>
  );
}

