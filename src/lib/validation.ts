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

export const PricingConfigSchema = z.object({
  currency: z.string().min(1),
  taxRate: z.number().min(0).max(1),
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

