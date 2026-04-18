import { z } from "zod";

export const StayTierSchema = z.enum(["twoStar", "threeFourStar", "fiveStar", "heritage"]);
/** Keys in `vehicle.perDay` in pricing.json (e.g. none, Swift Dzire, Ertiga). */
export const VehicleTypeKeySchema = z.string().min(1);
export const BoatingSchema = z.enum(["none", "sunrise", "evening"]);
export const GuideTypeSchema = z.enum(["none", "standard", "senior", "storyteller"]);
export const CitySchema = z.enum(["varanasi", "ayodhya", "prayagraj", "vindhyachal", "other"]);
const PricingAddonIdSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/, "Addon IDs must be camelCase machine-safe keys");
export const QuoteInputSchema = z.object({
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
});

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

/** Stored as decimal (0.05 = 5%) or legacy percent in JSON (5 = 5%). */
export const TaxRateSchema = z
  .number()
  .min(0)
  .max(100)
  .transform((n) => (n > 1 ? n / 100 : n));

/** Rupee amounts in pricing.json (guards fat-finger / paste errors in admin). */
const moneyInr = z.number().nonnegative().max(2_000_000);

export const PricingConfigSchema = z.object({
  currency: z.string().min(1).max(16),
  taxRate: TaxRateSchema,
  rounding: z.enum(["nearest", "up", "down"]),
  roundingUnit: z.number().int().min(1).max(100_000),
  stay: z.object({
    perNight: z.record(StayTierSchema, moneyInr),
  }),
  guide: z.object({
    perDay: z.record(GuideTypeSchema, moneyInr),
  }),
  vehicle: z.object({
    perDay: z
      .record(z.string(), moneyInr)
      .refine((r) => Object.prototype.hasOwnProperty.call(r, "none"), {
        message: 'vehicle.perDay must include a "none" key',
      })
      .refine((r) => Object.keys(r).length >= 2, {
        message: "vehicle.perDay must include at least one bookable vehicle in addition to none",
      }),
  }),
  addons: z.record(PricingAddonIdSchema, moneyInr),
  boating: z.object({
    sunrise: z.object({
      perPerson: moneyInr,
      minimumTotal: moneyInr,
    }),
    evening: z.object({
      perPerson: moneyInr,
      minimumTotal: moneyInr,
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
