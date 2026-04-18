import type { PricingConfig } from "./validation";

export type QuoteVehicleOption = {
  value: string;
  title: string;
  tagline: string;
  icon: "footprints" | "car" | "truck";
};

export type QuoteAddonOption = {
  id: string;
  title: string;
  tagline: string;
  icon: "camera" | "sparkles" | "branch" | "landmark" | "shirt";
};

const VEHICLE_TAGLINES: Record<string, string> = {
  none: "Walk & local transport",
  "Swift Dzire": "Compact sedan — great for couples & small families",
  Ertiga: "Spacious MPV — room for 6–7 guests",
  "Innova Crysta": "Premium comfort — ideal for families",
  "Tempo Traveller": "Group-friendly with plenty of luggage space",
};

const ADDON_UI: Record<string, Pick<QuoteAddonOption, "title" | "tagline" | "icon">> = {
  photographyPerDay: { title: "Professional Photography", tagline: "Per day session", icon: "camera" },
  sugamDarshan: { title: "Sugam Darshan", tagline: "Easier temple access", icon: "sparkles" },
  spiritualTriangle: { title: "Spiritual Triangle", tagline: "Varanasi–Ayodhya–Prayagraj", icon: "branch" },
  foodWalk: { title: "Food Walk", tagline: "Local food & street eats", icon: "sparkles" },
  heritageWalk: { title: "Heritage Walk", tagline: "Historic streets & stories", icon: "landmark" },
  silkWalk: { title: "Silk Walk", tagline: "Banarasi silk weaving tour", icon: "shirt" },
};

function vehicleIconName(value: string): QuoteVehicleOption["icon"] {
  if (value === "none") return "footprints";
  if (/tempo/i.test(value)) return "truck";
  return "car";
}

export function buildQuoteUiOptions(pricing: PricingConfig): {
  vehicleOptions: QuoteVehicleOption[];
  addonOptions: QuoteAddonOption[];
  defaultVehicleType: string;
} {
  const orderedVehicles = Object.keys(pricing.vehicle.perDay).filter((k) => k !== "none");
  const vehicleOptions: QuoteVehicleOption[] = [
    {
      value: "none",
      title: "No vehicle",
      tagline: VEHICLE_TAGLINES.none,
      icon: "footprints",
    },
    ...orderedVehicles.map((value) => ({
      value,
      title: value,
      tagline: VEHICLE_TAGLINES[value] ?? "Private AC vehicle with driver",
      icon: vehicleIconName(value),
    })),
  ];
  const defaultVehicleType = orderedVehicles[0] ?? "none";

  const addonOptions: QuoteAddonOption[] = Object.keys(pricing.addons).map((id) => {
    const meta = ADDON_UI[id];
    return {
      id,
      title: meta?.title ?? id,
      tagline: meta?.tagline ?? "",
      icon: meta?.icon ?? "sparkles",
    };
  });

  return { vehicleOptions, addonOptions, defaultVehicleType };
}
