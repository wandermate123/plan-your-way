import { describe, expect, it } from "vitest";
import { childrenBillableAsAdultsForStayAndBoating, computeQuote } from "./pricing";
import type { PricingConfig, QuoteInput } from "./validation";

const pricing: PricingConfig = {
  currency: "INR",
  taxRate: 0.05,
  rounding: "nearest",
  roundingUnit: 1,
  stay: { perNight: { twoStar: 2000, threeFourStar: 6000, fiveStar: 12000, heritage: 20000 } },
  guide: { perDay: { none: 0, standard: 1500, senior: 3000, storyteller: 6000 } },
  vehicle: {
    perDay: {
      none: 0,
      "Swift Dzire": {
        localVaranasi: 2800,
        ayodhya: 6500,
        prayagraj: 3500,
        ayodhyaPrayagraj: 8000,
        vindhyachal: 3500,
      },
    },
  },
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
  it("counts children under 10 as free for stay and boating (per-person parts)", () => {
    const quote = computeQuote(input, pricing);

    expect(quote.nights).toBe(2);
    expect(quote.days).toBe(3);
    const stay = quote.items.find((i) => i.code === "stay");
    expect(stay?.meta?.weightedPeople).toBe(2);
    const boat = quote.items.find((i) => i.code === "boating");
    expect(boat?.meta?.weightedPeople).toBe(2);
    expect(quote.subtotal).toBe(56400);
    expect(quote.tax).toBe(2820);
    expect(quote.total).toBe(59220);
  });

  it("counts children 10+ like adults for stay and boating", () => {
    const q = computeQuote({ ...input, childrenAges: [12] }, pricing);
    const stay = q.items.find((i) => i.code === "stay");
    expect(stay?.meta?.weightedPeople).toBe(3);
    expect(q.subtotal).toBe(68400);
    expect(q.tax).toBe(3420);
    expect(q.total).toBe(71820);
  });

  it("childrenBillableAsAdultsForStayAndBoating uses age 10 threshold", () => {
    expect(
      childrenBillableAsAdultsForStayAndBoating({
        ...input,
        children: 2,
        childrenAges: [9, 10],
      }),
    ).toBe(1);
  });

  it("ignores unknown add-ons instead of crashing", () => {
    const withUnknownAddon: QuoteInput = { ...input, addons: ["foodWalk", "unknownAddon"] };
    const quote = computeQuote(withUnknownAddon, pricing);
    expect(quote.items.some((i) => i.label.includes("unknownAddon"))).toBe(false);
  });
});
