import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { bookingDedupeKey } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { BookingRequestParsedSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_BOOKING_MAX, RATE_LIMIT_WINDOW_MS } from "@/lib/rate-limit-config";
import { logApiEvent } from "@/lib/observability";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const start = performance.now();
  try {
    const limit = checkRateLimit(req, "/api/booking", RATE_LIMIT_BOOKING_MAX, RATE_LIMIT_WINDOW_MS);
    if (!limit.ok) {
      logApiEvent("warn", {
        route: "/api/booking",
        requestId,
        status: 429,
        durationMs: Math.round(performance.now() - start),
        message: "Rate limit exceeded",
      });
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "retry-after": String(limit.retryAfterSec),
          },
        },
      );
    }
    const body = await req.json();
    const input = BookingRequestParsedSchema.parse(body);
    const dedupeKey = bookingDedupeKey(input);

    const existing = await prisma.booking.findUnique({ where: { dedupeKey } });
    if (existing) {
      logApiEvent("info", {
        route: "/api/booking",
        requestId,
        status: 200,
        durationMs: Math.round(performance.now() - start),
        message: "duplicate",
      });
      return NextResponse.json(
        {
          ok: true,
          bookingId: existing.id,
          duplicate: true,
        },
        { headers: { "x-request-id": requestId } },
      );
    }

    try {
      const created = await prisma.booking.create({
        data: {
          dedupeKey,
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          notes: input.notes,
          summaryJson: JSON.stringify(input.summary),
        },
      });
      logApiEvent("info", {
        route: "/api/booking",
        requestId,
        status: 200,
        durationMs: Math.round(performance.now() - start),
        message: "created",
      });
      return NextResponse.json(
        {
          ok: true,
          bookingId: created.id,
          duplicate: false,
        },
        { headers: { "x-request-id": requestId } },
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await prisma.booking.findUnique({ where: { dedupeKey } });
        if (again) {
          return NextResponse.json(
            {
              ok: true,
              bookingId: again.id,
              duplicate: true,
            },
            { headers: { "x-request-id": requestId } },
          );
        }
      }
      throw e;
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.issues.map((i) => i.message).join("; ") || "Invalid request",
        },
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }
    console.error("booking POST", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
