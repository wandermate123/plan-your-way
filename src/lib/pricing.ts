import { differenceInCalendarDays, parseISO } from "date-fns";
import type { PricingConfig, QuoteInput } from "./validation";

export type QuoteLineItem = {
  code:
    | "stay"
    | "vehicle"
    | "guide"
    | "boating"
    | "addons"
    | "tax"
    | "rounding"
    | "subtotal";
  label: string;
  amount: number;
  meta?: Record<string, string | number | boolean>;
};

export type QuoteResult = {
  currency: string;
  nights: number;
  days: number;
  travelers: {
    adults: number;
    children: number;
    total: number;
  };
  items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  total: number;
};

function roundMoney(amount: number, rounding: PricingConfig["rounding"], unit: number): number {
  if (!Number.isFinite(amount)) return 0;
  const x = amount / unit;
  if (rounding === "up") return Math.ceil(x) * unit;
  if (rounding === "down") return Math.floor(x) * unit;
  return Math.round(x) * unit;
}

export function computeQuote(input: QuoteInput, pricing: PricingConfig): QuoteResult {
  const arrival = parseISO(input.arrivalDate);
  const departure = parseISO(input.departureDate);

  const diffDays = differenceInCalendarDays(departure, arrival);
  const nights = Math.max(1, diffDays);
  const days = Math.max(1, diffDays + 1);

  const totalTravelers = input.adults + input.children;

  const items: QuoteLineItem[] = [];

  const stayRate = pricing.stay.perNight[input.stayTier];
  const stayWeightedPeople =
    input.adults + input.children * pricing.children.stayDiscountRate;
  const stayAmount = stayRate * nights * stayWeightedPeople;
  if (stayAmount > 0) {
    items.push({
      code: "stay",
      label: `Stay (${input.stayTier})`,
      amount: stayAmount,
      meta: { nights, perNight: stayRate, weightedPeople: stayWeightedPeople },
    });
  }

  const vehicleRate = pricing.vehicle.perDay[input.vehicleType] ?? 0;
  const vehicleAmount = vehicleRate * days;
  if (vehicleAmount > 0) {
    items.push({
      code: "vehicle",
      label: `Vehicle (${input.vehicleType})`,
      amount: vehicleAmount,
      meta: { days, perDay: vehicleRate },
    });
  }

  const guideRate = pricing.guide.perDay[input.guideType];
  const guideAmount = guideRate * days;
  if (guideAmount > 0 && input.guideType !== "none") {
    const guideLabelMap: Record<string, string> = {
      standard: "Standard guide",
      senior: "Senior guide",
      storyteller: "Senior storyteller",
      none: "No guide",
    };
    items.push({
      code: "guide",
      label: guideLabelMap[input.guideType] ?? "Guide",
      amount: guideAmount,
      meta: { days, perDay: guideRate, type: input.guideType },
    });
  }

  let boatingAmount = 0;
  if (input.boating !== "none") {
    const cfg = pricing.boating[input.boating];
    const boatingWeightedPeople =
      input.adults + input.children * pricing.children.boatingDiscountRate;
    boatingAmount = Math.max(cfg.minimumTotal, cfg.perPerson * boatingWeightedPeople);
    items.push({
      code: "boating",
      label: `Boating (${input.boating})`,
      amount: boatingAmount,
      meta: {
        perPerson: cfg.perPerson,
        minimumTotal: cfg.minimumTotal,
        weightedPeople: boatingWeightedPeople,
      },
    });
  }

  const addonLabels: Record<string, string> = {
    photographyPerDay: "Professional Photography",
    sugamDarshan: "Sugam Darshan",
    spiritualTriangle: "Spiritual Triangle Add-ons",
    foodWalk: "Food Walk",
    heritageWalk: "Heritage Walk",
    silkWalk: "Silk Walk",
  };
  let addonsAmount = 0;
  if (input.addons && input.addons.length > 0) {
    for (const addon of input.addons) {
      const rate = pricing.addons[addon];
      if (typeof rate !== "number") continue;
      const price = addon === "photographyPerDay" ? rate * days : rate;
      addonsAmount += price;
      items.push({
        code: "addons",
        label: `Add-on: ${addonLabels[addon] ?? addon}`,
        amount: price,
        meta: addon === "photographyPerDay" ? { days, perDay: rate } : undefined,
      });
    }
  }

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  items.push({ code: "subtotal", label: "Subtotal", amount: subtotal });

  const tax = subtotal * pricing.taxRate;
  if (tax > 0) items.push({ code: "tax", label: "Tax", amount: tax, meta: { taxRate: pricing.taxRate } });

  const unroundedTotal = subtotal + tax;
  const roundedTotal = roundMoney(unroundedTotal, pricing.rounding, pricing.roundingUnit);
  const roundingDelta = roundedTotal - unroundedTotal;
  if (roundingDelta !== 0) {
    items.push({ code: "rounding", label: "Rounding", amount: roundingDelta, meta: { unit: pricing.roundingUnit } });
  }

  return {
    currency: pricing.currency,
    nights,
    days,
    travelers: { adults: input.adults, children: input.children, total: totalTravelers },
    items,
    subtotal,
    tax,
    total: roundedTotal,
  };
}

