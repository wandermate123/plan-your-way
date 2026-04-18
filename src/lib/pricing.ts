import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatStayTierLabel, type PricingConfig, type QuoteInput } from "./validation";
import { formatVehicleQuoteLabel, resolveVehiclePerDayRate } from "./vehicle-pricing";

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

/**
 * For stay and boating per-person pricing: children under 10 are free; age 10+ counts like an adult.
 * Requires `childrenAges.length === children` when children > 0 (enforced by QuoteInputSchema).
 */
export function childrenBillableAsAdultsForStayAndBoating(input: QuoteInput): number {
  if (input.children <= 0) return 0;
  const ages = input.childrenAges;
  if (!ages || ages.length !== input.children) {
    return input.children;
  }
  return ages.filter((a) => a >= 10).length;
}

export function computeQuote(input: QuoteInput, pricing: PricingConfig): QuoteResult {
  const arrival = parseISO(input.arrivalDate);
  const departure = parseISO(input.departureDate);

  const diffDays = differenceInCalendarDays(departure, arrival);
  const nights = Math.max(1, diffDays);
  const days = Math.max(1, diffDays + 1);

  const totalTravelers = input.adults + input.children;
  const childrenBilledLikeAdults = childrenBillableAsAdultsForStayAndBoating(input);
  const childrenFreeForStayBoat = input.children - childrenBilledLikeAdults;

  const items: QuoteLineItem[] = [];

  const stayRate = pricing.stay.perNight[input.stayTier];
  /** Under 10: no stay charge; 10+: same as adult (ignores legacy stayDiscountRate for children). */
  const stayWeightedPeople = input.adults + childrenBilledLikeAdults;
  const stayAmount = stayRate * nights * stayWeightedPeople;
  if (stayAmount > 0) {
    items.push({
      code: "stay",
      label: `Stay (${formatStayTierLabel(input.stayTier)})`,
      amount: stayAmount,
      meta: {
        nights,
        perNight: stayRate,
        weightedPeople: stayWeightedPeople,
        adults: input.adults,
        childrenBilledLikeAdults,
        childrenFreeForStayBoat,
      },
    });
  }

  const { rate: vehicleRate, band: vehicleBand } = resolveVehiclePerDayRate(
    input.vehicleType,
    pricing,
    input.destinations,
  );
  const vehicleAmount = vehicleRate * days;
  if (vehicleAmount > 0) {
    items.push({
      code: "vehicle",
      label: formatVehicleQuoteLabel(input.vehicleType, vehicleBand),
      amount: vehicleAmount,
      meta: { days, perDay: vehicleRate, routeBand: vehicleBand },
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
    /** Same age rule as stay: under 10 free on per-person boat share; 10+ pays full per-person slot. */
    const boatingWeightedPeople = input.adults + childrenBilledLikeAdults;
    boatingAmount = Math.max(cfg.minimumTotal, cfg.perPerson * boatingWeightedPeople);
    items.push({
      code: "boating",
      label: `Boating (${input.boating})`,
      amount: boatingAmount,
      meta: {
        perPerson: cfg.perPerson,
        minimumTotal: cfg.minimumTotal,
        weightedPeople: boatingWeightedPeople,
        adults: input.adults,
        childrenBilledLikeAdults,
        childrenFreeForStayBoat,
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

