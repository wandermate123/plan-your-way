import { z } from "zod";

export const StayTierSchema = z.enum(["twoStar", "threeFourStar", "fiveStar", "heritage"]);
export type StayTier = z.infer<typeof StayTierSchema>;

const STAY_TIER_LABELS: Record<StayTier, string> = {
  twoStar: "2 Star",
  threeFourStar: "3 Star",
  fiveStar: "5 Star",
  heritage: "Heritage",
};

export function formatStayTierLabel(tier: StayTier): string {
  return STAY_TIER_LABELS[tier];
}

/** Vehicle key in `vehicle.perDay` (e.g. Swift Dzire); value is flat INR/day or a per–route-band map. */
export const VehicleTypeKeySchema = z.string().min(1);

/** Route band for cab per-day selling prices (see `vehicleRouteBandFromDestinations`). */
export const VehicleRouteBandSchema = z.enum([
  "localVaranasi",
  "ayodhya",
  "prayagraj",
  "ayodhyaPrayagraj",
  "vindhyachal",
]);
export type VehicleRouteBand = z.infer<typeof VehicleRouteBandSchema>;

const RoutedVehicleRatesSchema = z.object({
  localVaranasi: z.number().nonnegative(),
  ayodhya: z.number().nonnegative(),
  prayagraj: z.number().nonnegative(),
  ayodhyaPrayagraj: z.number().nonnegative(),
  vindhyachal: z.number().nonnegative(),
});

/** Flat INR/day (e.g. Tempo) or per–route-band map for Dzire / Ertiga / Innova. */
export const VehiclePerDayEntrySchema = z.union([
  z.number().nonnegative(),
  RoutedVehicleRatesSchema,
]);
export type VehiclePerDayEntry = z.infer<typeof VehiclePerDayEntrySchema>;
export const BoatingSchema = z.enum(["none", "sunrise", "evening"]);
export const GuideTypeSchema = z.enum(["none", "standard", "senior", "storyteller"]);
export const CitySchema = z.enum(["varanasi", "ayodhya", "prayagraj", "vindhyachal", "other"]);
const PricingAddonIdSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/, "Addon IDs must be camelCase machine-safe keys");
export const QuoteInputSchema = z
  .object({
    startCity: CitySchema,
    endCity: CitySchema,
    destinations: z.array(CitySchema).min(1),
    arrivalDate: z.string().min(1),
    departureDate: z.string().min(1),
    adults: z.number().int().min(1).max(50),
    children: z.number().int().min(0).max(50),
    childrenAges: z.array(z.number().int().min(0).max(17)).optional(),
    stayTier: StayTierSchema,
    guideType: GuideTypeSchema,
    vehicleType: VehicleTypeKeySchema,
    boating: BoatingSchema,
    addons: z.array(z.string().min(1)).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.children > 0) {
      const ages = data.childrenAges ?? [];
      if (ages.length !== data.children) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enter an age for each child (${data.children} required).`,
          path: ["childrenAges"],
        });
      }
    } else if (data.childrenAges && data.childrenAges.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remove child ages when the children count is zero.",
        path: ["childrenAges"],
      });
    }
  });

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

/** Stored as decimal (0.05 = 5%) or legacy percent in JSON (5 = 5%). */
export const TaxRateSchema = z
  .number()
  .min(0)
  .max(100)
  .transform((n) => (n > 1 ? n / 100 : n));

export const PricingMetaSchema = z
  .object({
    /** Bump when you publish new rates (shown on quotes for support / audit). */
    pricingVersion: z.number().int().min(1).max(1_000_000).optional(),
    /** ISO date (YYYY-MM-DD) when these rates take effect; informational. */
    effectiveFrom: z.string().max(32).optional(),
    /** Internal notes (e.g. how you derived rates). Not shown to end users. */
    notes: z.string().max(8000).optional(),
  })
  .strict();

export const PricingConfigSchema = z.object({
  currency: z.string().min(1),
  taxRate: TaxRateSchema,
  rounding: z.enum(["nearest", "up", "down"]),
  roundingUnit: z.number().int().min(1),
  meta: PricingMetaSchema.optional(),
  stay: z.object({
    perNight: z.record(StayTierSchema, z.number().nonnegative()),
  }),
  guide: z.object({
    perDay: z.record(GuideTypeSchema, z.number().nonnegative()),
  }),
  vehicle: z.object({
    perDay: z
      .record(z.string(), VehiclePerDayEntrySchema)
      .refine((r) => Object.prototype.hasOwnProperty.call(r, "none"), {
        message: 'vehicle.perDay must include a "none" key',
      })
      .refine((r) => Object.keys(r).length >= 2, {
        message: "vehicle.perDay must include at least one bookable vehicle in addition to none",
      }),
  }),
  addons: z.record(PricingAddonIdSchema, z.number().nonnegative()),
  boating: z.object({
    sunrise: z.object({
      perPerson: z.number().nonnegative(),
      minimumTotal: z.number().nonnegative(),
    }),
    evening: z.object({
      perPerson: z.number().nonnegative(),
      minimumTotal: z.number().nonnegative(),
    }),
  }),
  children: z.object({
    stayDiscountRate: z.number().min(0).max(1),
    boatingDiscountRate: z.number().min(0).max(1),
  }),
  defaults: z.object({
    city: z.string().min(1),
  }),
});

export type PricingConfig = z.infer<typeof PricingConfigSchema>;

export const BookingSummarySchema = z.object({
  total: z.string().min(1).max(64),
  currency: z.string().min(1).max(16),
  arrivalDate: z.string().min(1).max(32),
  departureDate: z.string().min(1).max(32),
  adults: z.string().min(1).max(8),
  children: z.string().max(8).optional(),
});

export const BookingRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(40),
  email: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().email().max(320).optional(),
  ),
  notes: z.preprocess(
    (v) => (v == null || v === undefined ? "" : v),
    z.string().max(2000),
  ),
  summary: BookingSummarySchema,
});

export type BookingRequest = z.infer<typeof BookingRequestSchema>;

export const BookingRequestParsedSchema = BookingRequestSchema.superRefine((data, ctx) => {
  const d = data.phone.replace(/\D/g, "");
  const ok =
    (d.length >= 12 && d.startsWith("91") && d.slice(-10).length === 10) ||
    (d.length >= 10 && d.slice(-10).length === 10);
  if (!ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid phone number (at least 10 digits).",
      path: ["phone"],
    });
  }
});
