import { describe, expect, it } from "vitest";
import { PricingConfigSchema } from "./validation";

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
