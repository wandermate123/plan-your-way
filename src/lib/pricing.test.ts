import { describe, expect, it } from "vitest";
import { computeQuote } from "./pricing";
import type { PricingConfig, QuoteInput } from "./validation";

const pricing: PricingConfig = {
  currency: "INR",
  taxRate: 0.05,
  rounding: "nearest",
  roundingUnit: 1,
  stay: { perNight: { twoStar: 2000, threeFourStar: 6000, fiveStar: 12000, heritage: 20000 } },
  guide: { perDay: { none: 0, standard: 1500, senior: 3000, storyteller: 6000 } },
  vehicle: { perDay: { none: 0, "Swift Dzire": 2600 } },
  addons: { photographyPerDay: 5000, sugamDarshan: 500, foodWalk: 1500 },
  boating: {
    sunrise: { perPerson: 250, minimumTotal: 3000 },
    evening: { perPerson: 300, minimumTotal: 3000 },
  },
  children: { stayDiscountRate: 0, boatingDiscountRate: 0.5 },
  defaults: { city: "Varanasi" },
};

const input: QuoteInput = {
  startCity: "varanasi",
  endCity: "varanasi",
  destinations: ["varanasi"],
  arrivalDate: "2026-04-10",
  departureDate: "2026-04-12",
  adults: 2,
  children: 1,
  childrenAges: [8],
  stayTier: "threeFourStar",
  guideType: "standard",
  vehicleType: "Swift Dzire",
  boating: "sunrise",
  addons: ["photographyPerDay", "foodWalk"],
};

describe("computeQuote", () => {
  it("computes quote with dynamic vehicle/add-on IDs", () => {
    const quote = computeQuote(input, pricing);

    expect(quote.nights).toBe(2);
    expect(quote.days).toBe(3);
    expect(quote.subtotal).toBe(55800);
    expect(quote.tax).toBe(2790);
    expect(quote.total).toBe(58590);
  });

  it("ignores unknown add-ons instead of crashing", () => {
    const withUnknownAddon: QuoteInput = { ...input, addons: ["foodWalk", "unknownAddon"] };
    const quote = computeQuote(withUnknownAddon, pricing);
    expect(quote.items.some((i) => i.label.includes("unknownAddon"))).toBe(false);
  });
});
