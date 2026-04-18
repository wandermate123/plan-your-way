import type { PricingConfig } from "./validation";

/**
 * Extra checks beyond Zod: catches common mis-pricing that still parses.
 * Used before persisting pricing in production.
 */
export function validatePricingProduction(pricing: PricingConfig): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  for (const tier of ["twoStar", "threeFourStar", "fiveStar", "heritage"] as const) {
    const v = pricing.stay.perNight[tier];
    if (v > 150_000) errors.push(`stay.perNight.${tier} looks unrealistically high (${v}).`);
    if (v > 0 && v < 300) errors.push(`stay.perNight.${tier} is very low (${v}); confirm this is intentional.`);
  }

  for (const g of ["standard", "senior", "storyteller"] as const) {
    const v = pricing.guide.perDay[g];
    if (v > 50_000) errors.push(`guide.perDay.${g} looks unrealistically high (${v}).`);
  }

  for (const [k, v] of Object.entries(pricing.vehicle.perDay)) {
    if (k === "none") continue;
    if (typeof v === "number") {
      if (v > 100_000) errors.push(`vehicle.perDay.${k} looks unrealistically high (${v}).`);
      if (v > 0 && v < 500) errors.push(`vehicle.perDay.${k} is very low (${v}); confirm.`);
    } else {
      for (const [band, n] of Object.entries(v)) {
        if (n > 100_000) {
          errors.push(`vehicle.perDay.${k}.${band} looks unrealistically high (${n}).`);
        }
        if (n > 0 && n < 500) {
          errors.push(`vehicle.perDay.${k}.${band} is very low (${n}); confirm.`);
        }
      }
    }
  }

  for (const [id, v] of Object.entries(pricing.addons)) {
    if (v > 200_000) errors.push(`addons.${id} looks unrealistically high (${v}).`);
  }

  const sr = pricing.boating.sunrise;
  const ev = pricing.boating.evening;
  if (sr.minimumTotal < sr.perPerson) {
    errors.push("boating.sunrise.minimumTotal should be >= perPerson (otherwise pricing is confusing).");
  }
  if (ev.minimumTotal < ev.perPerson) {
    errors.push("boating.evening.minimumTotal should be >= perPerson.");
  }

  const tax = pricing.taxRate;
  if (tax > 0.28) errors.push(`taxRate ${tax} is unusually high; confirm.`);

  if (pricing.roundingUnit > 100) errors.push("roundingUnit > 100 is unusual for INR.");

  return errors.length ? { ok: false, errors } : { ok: true };
}
