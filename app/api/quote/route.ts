import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { QuoteInputSchema } from "@/lib/validation";
import { readPricingConfig } from "@/lib/storage";
import { computeQuote } from "@/lib/pricing";
import { buildItinerary } from "@/lib/itinerary";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  RATE_LIMIT_QUOTE_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/rate-limit-config";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const start = performance.now();
  try {
    const limit = checkRateLimit(req, "/api/quote", RATE_LIMIT_QUOTE_MAX, RATE_LIMIT_WINDOW_MS);
    if (!limit.ok) {
      const status = 429;
      logApiEvent("warn", {
        route: "/api/quote",
        requestId,
        status,
        durationMs: Math.round(performance.now() - start),
        message: "Rate limit exceeded",
      });
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again shortly." },
        {
          status,
          headers: {
            "x-request-id": requestId,
            "retry-after": String(limit.retryAfterSec),
          },
        },
      );
    }

    const body = await req.json();
    const input = QuoteInputSchema.parse(body);
    const pricing = await readPricingConfig();
    if (!Object.prototype.hasOwnProperty.call(pricing.vehicle.perDay, input.vehicleType)) {
      const status = 400;
      logApiEvent("warn", {
        route: "/api/quote",
        requestId,
        status,
        durationMs: Math.round(performance.now() - start),
        message: "Invalid vehicle selection",
      });
      return NextResponse.json(
        { ok: false, error: "Invalid vehicle selection." },
        { status, headers: { "x-request-id": requestId } },
      );
    }
    for (const id of input.addons) {
      if (!Object.prototype.hasOwnProperty.call(pricing.addons, id)) {
        const status = 400;
        logApiEvent("warn", {
          route: "/api/quote",
          requestId,
          status,
          durationMs: Math.round(performance.now() - start),
          message: `Invalid add-on: ${id}`,
        });
        return NextResponse.json(
          { ok: false, error: `Invalid add-on: ${id}` },
          { status, headers: { "x-request-id": requestId } },
        );
      }
    }
    const quote = computeQuote(input, pricing);
    const itinerary = buildItinerary(input);
    const status = 200;
    logApiEvent("info", {
      route: "/api/quote",
      requestId,
      status,
      durationMs: Math.round(performance.now() - start),
    });
    return NextResponse.json(
      { ok: true, quote, itinerary },
      { status, headers: { "x-request-id": requestId } },
    );
  } catch (err) {
    const status = err instanceof ZodError ? 400 : 500;
    const message = err instanceof Error ? err.message : "Invalid request";
    logApiEvent(status === 500 ? "error" : "warn", {
      route: "/api/quote",
      requestId,
      status,
      durationMs: Math.round(performance.now() - start),
      message,
    });
    return NextResponse.json(
      { ok: false, error: message },
      { status, headers: { "x-request-id": requestId } },
    );
  }
}

