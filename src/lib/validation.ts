import { z } from "zod";

export const StayTierSchema = z.enum(["twoStar", "threeFourStar", "fiveStar", "heritage"]);
export const VehicleTypeSchema = z.enum(["none", "auto", "sedan", "suv", "tempo"]);
export const BoatingSchema = z.enum(["none", "sunrise", "evening"]);
export const GuideTypeSchema = z.enum(["none", "standard", "senior", "storyteller"]);
export const CitySchema = z.enum(["varanasi", "ayodhya", "prayagraj", "vindhyachal", "other"]);
export const AddonIdSchema = z.enum([
  "photographyPerDay",
  "sugamDarshan",
  "spiritualTriangle",
  "heritageWalk",
  "silkWalk",
]);

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
  vehicleType: VehicleTypeSchema,
  boating: BoatingSchema,
  addons: z.array(AddonIdSchema).default([]),
});

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

/** Stored as decimal (0.05 = 5%) or legacy percent in JSON (5 = 5%). */
export const TaxRateSchema = z
  .number()
  .min(0)
  .max(100)
  .transform((n) => (n > 1 ? n / 100 : n));

export const PricingConfigSchema = z.object({
  currency: z.string().min(1),
  taxRate: TaxRateSchema,
  rounding: z.enum(["nearest", "up", "down"]),
  roundingUnit: z.number().int().min(1),
  stay: z.object({
    perNight: z.record(StayTierSchema, z.number().nonnegative()),
  }),
  guide: z.object({
    perDay: z.record(GuideTypeSchema, z.number().nonnegative()),
  }),
  vehicle: z.object({
    perDay: z.record(VehicleTypeSchema, z.number().nonnegative()),
  }),
  addons: z.object({
    photographyPerDay: z.number().nonnegative(),
    sugamDarshan: z.number().nonnegative(),
    spiritualTriangle: z.number().nonnegative(),
    heritageWalk: z.number().nonnegative(),
    silkWalk: z.number().nonnegative(),
  }),
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
