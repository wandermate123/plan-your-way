import { NextResponse } from "next/server";
import { readPricingConfig } from "@/lib/storage";
import { buildQuoteUiOptions } from "@/lib/quote-ui-options";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";

/** Public, uncached — vehicle / add-on labels from current pricing (no per-day rates). */
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const start = performance.now();
  try {
    const limit = checkRateLimit(req, "/api/quote-options", 60, 60_000);
    if (!limit.ok) {
      const status = 429;
      logApiEvent("warn", {
        route: "/api/quote-options",
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

    const pricing = await readPricingConfig();
    const options = buildQuoteUiOptions(pricing);
    const status = 200;
    logApiEvent("info", {
      route: "/api/quote-options",
      requestId,
      status,
      durationMs: Math.round(performance.now() - start),
    });
    return NextResponse.json(
      { ok: true, ...options },
      { headers: { "Cache-Control": "no-store, max-age=0", "x-request-id": requestId } },
    );
  } catch (e) {
    const status = 500;
    logApiEvent("error", {
      route: "/api/quote-options",
      requestId,
      status,
      durationMs: Math.round(performance.now() - start),
      message: e instanceof Error ? e.message : "Failed to load options",
    });
    return NextResponse.json(
      { ok: false, error: "Failed to load options" },
      { status, headers: { "x-request-id": requestId } },
    );
  }
}
