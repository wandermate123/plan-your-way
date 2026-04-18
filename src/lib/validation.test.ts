import { describe, expect, it } from "vitest";
import { PricingConfigSchema, QuoteInputSchema } from "./validation";

const baseQuote = {
  startCity: "varanasi" as const,
  endCity: "varanasi" as const,
  destinations: ["varanasi"],
  arrivalDate: "2026-04-10",
  departureDate: "2026-04-12",
  adults: 2,
  children: 0,
  stayTier: "threeFourStar" as const,
  guideType: "standard" as const,
  vehicleType: "Swift Dzire",
  boating: "sunrise" as const,
  addons: [] as string[],
};

describe("PricingConfigSchema", () => {
  it("accepts machine-safe addon keys", () => {
    const parsed = PricingConfigSchema.parse({
      currency: "INR",
      taxRate: 5,
      rounding: "nearest",
      roundingUnit: 1,
      stay: { perNight: { twoStar: 2000, threeFourStar: 6000, fiveStar: 12000, heritage: 20000 } },
      guide: { perDay: { none: 0, standard: 1500, senior: 3000, storyteller: 6000 } },
      vehicle: { perDay: { none: 0, Ertiga: 2800 } },
      addons: { foodWalk: 1500, sugamDarshan: 500 },
      boating: {
        sunrise: { perPerson: 250, minimumTotal: 3000 },
        evening: { perPerson: 300, minimumTotal: 3000 },
      },
      children: { stayDiscountRate: 0, boatingDiscountRate: 0.5 },
      defaults: { city: "Varanasi" },
    });

    expect(parsed.taxRate).toBe(0.05);
  });

  it("rejects addon keys with spaces", () => {
    expect(() =>
      PricingConfigSchema.parse({
        currency: "INR",
        taxRate: 5,
        rounding: "nearest",
        roundingUnit: 1,
        stay: { perNight: { twoStar: 2000, threeFourStar: 6000, fiveStar: 12000, heritage: 20000 } },
        guide: { perDay: { none: 0, standard: 1500, senior: 3000, storyteller: 6000 } },
        vehicle: { perDay: { none: 0, Ertiga: 2800 } },
        addons: { "Food Walk": 1500 },
        boating: {
          sunrise: { perPerson: 250, minimumTotal: 3000 },
          evening: { perPerson: 300, minimumTotal: 3000 },
        },
        children: { stayDiscountRate: 0, boatingDiscountRate: 0.5 },
        defaults: { city: "Varanasi" },
      }),
    ).toThrow(/Addon IDs must be camelCase machine-safe keys/);
  });
});

describe("QuoteInputSchema", () => {
  it("requires one age per child when children > 0", () => {
    expect(() =>
      QuoteInputSchema.parse({
        ...baseQuote,
        children: 2,
        childrenAges: [7],
      }),
    ).toThrow(/Enter an age for each child/);
  });

  it("rejects leftover ages when children is 0", () => {
    expect(() =>
      QuoteInputSchema.parse({
        ...baseQuote,
        children: 0,
        childrenAges: [8],
      }),
    ).toThrow(/Remove child ages/);
  });

  it("accepts matching ages for each child", () => {
    const parsed = QuoteInputSchema.parse({
      ...baseQuote,
      children: 2,
      childrenAges: [7, 11],
    });
    expect(parsed.childrenAges).toEqual([7, 11]);
  });
});
