import { describe, expect, it } from "vitest";
import { PricingConfigSchema } from "./validation";
import { validatePricingProduction } from "./pricing-validate";

describe("validatePricingProduction", () => {
  it("accepts current pricing.json shape", () => {
    const p = PricingConfigSchema.parse({
      currency: "INR",
      meta: { pricingVersion: 1, effectiveFrom: "2026-04-18" },
      taxRate: 5,
      rounding: "nearest",
      roundingUnit: 1,
      stay: { perNight: { twoStar: 2000, threeFourStar: 6000, fiveStar: 12000, heritage: 20000 } },
      guide: { perDay: { none: 0, standard: 1500, senior: 3000, storyteller: 6000 } },
      vehicle: { perDay: { none: 0, Ertiga: 2800 } },
      addons: { foodWalk: 1500 },
      boating: {
        sunrise: { perPerson: 250, minimumTotal: 3000 },
        evening: { perPerson: 300, minimumTotal: 3000 },
      },
      children: { stayDiscountRate: 0, boatingDiscountRate: 0.5 },
      defaults: { city: "Varanasi" },
    });
    expect(validatePricingProduction(p)).toEqual({ ok: true });
  });

  it("rejects boating minimum below perPerson", () => {
    const p = PricingConfigSchema.parse({
      currency: "INR",
      taxRate: 5,
      rounding: "nearest",
      roundingUnit: 1,
      stay: { perNight: { twoStar: 2000, threeFourStar: 6000, fiveStar: 12000, heritage: 20000 } },
      guide: { perDay: { none: 0, standard: 1500, senior: 3000, storyteller: 6000 } },
      vehicle: { perDay: { none: 0, Ertiga: 2800 } },
      addons: { foodWalk: 1500 },
      boating: {
        sunrise: { perPerson: 250, minimumTotal: 100 },
        evening: { perPerson: 300, minimumTotal: 3000 },
      },
      children: { stayDiscountRate: 0, boatingDiscountRate: 0.5 },
      defaults: { city: "Varanasi" },
    });
    const r = validatePricingProduction(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("minimumTotal"))).toBe(true);
  });
});
