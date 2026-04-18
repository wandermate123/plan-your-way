import { z } from "zod";

export const ItineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  dateLabel: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  highlights: z.array(z.string().min(1).max(500)).min(1).max(20),
});

export const AssistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

export const TravelAssistantRequestSchema = z.object({
  messages: z.array(AssistantMessageSchema).min(1).max(24),
  trip: z.record(z.string(), z.unknown()),
  itineraryDays: z.array(ItineraryDaySchema).optional(),
  quoteSummary: z
    .object({
      total: z.number(),
      currency: z.string(),
      nights: z.number().int().nonnegative(),
      days: z.number().int().positive(),
    })
    .optional(),
});

export const AssistantReplySchema = z.object({
  reply: z.string().min(1).max(12000),
  itinerarySuggestion: z
    .object({
      days: z.array(ItineraryDaySchema).min(1).max(21),
    })
    .optional(),
});

export type ItineraryDayDTO = z.infer<typeof ItineraryDaySchema>;
export type TravelAssistantRequest = z.infer<typeof TravelAssistantRequestSchema>;
export type AssistantReply = z.infer<typeof AssistantReplySchema>;
