import { NextResponse } from "next/server";
import { QuoteInputSchema } from "@/lib/validation";
import { readPricingConfig } from "@/lib/storage";
import { computeQuote } from "@/lib/pricing";
import { buildItinerary } from "@/lib/itinerary";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = QuoteInputSchema.parse(body);
    const pricing = await readPricingConfig();
    const quote = computeQuote(input, pricing);
    const itinerary = buildItinerary(input);
    return NextResponse.json({ ok: true, quote, itinerary });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    );
  }
}

