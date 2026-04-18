import type { PricingConfig, QuoteInput, VehicleRouteBand } from "./validation";

/** Human-readable route band for quote line items and UI. */
export const VEHICLE_ROUTE_BAND_LABELS: Record<VehicleRouteBand, string> = {
  localVaranasi: "Varanasi local",
  ayodhya: "Ayodhya",
  prayagraj: "Prayagraj",
  ayodhyaPrayagraj: "Ayodhya + Prayagraj",
  vindhyachal: "Vindhyachal",
};

/**
 * Maps selected pilgrimage cities to a selling-price band for cab per-day rates.
 * Priority: Ayodhya+Prayagraj combo → single-city outstations → Vindhyachal → Varanasi local.
 */
export function vehicleRouteBandFromDestinations(
  destinations: readonly QuoteInput["destinations"][number][],
): VehicleRouteBand {
  const set = new Set(destinations);
  if (set.has("ayodhya") && set.has("prayagraj")) return "ayodhyaPrayagraj";
  if (set.has("ayodhya")) return "ayodhya";
  if (set.has("prayagraj")) return "prayagraj";
  if (set.has("vindhyachal")) return "vindhyachal";
  return "localVaranasi";
}

export function resolveVehiclePerDayRate(
  vehicleType: string,
  pricing: PricingConfig,
  destinations: QuoteInput["destinations"],
): { rate: number; band: VehicleRouteBand | "flat" } {
  if (vehicleType === "none") return { rate: 0, band: "flat" };
  const entry = pricing.vehicle.perDay[vehicleType];
  if (entry == null) return { rate: 0, band: "flat" };
  if (typeof entry === "number") return { rate: entry, band: "flat" };
  const band = vehicleRouteBandFromDestinations(destinations);
  return { rate: entry[band], band };
}

export function formatVehicleQuoteLabel(
  vehicleType: string,
  band: VehicleRouteBand | "flat",
): string {
  if (vehicleType === "none") return "Vehicle (none)";
  if (band === "flat") return `Vehicle (${vehicleType})`;
  return `Vehicle (${vehicleType}, ${VEHICLE_ROUTE_BAND_LABELS[band]} · per day)`;
}
