import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { bookingDedupeKey } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { BookingRequestParsedSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = BookingRequestParsedSchema.parse(body);
    const dedupeKey = bookingDedupeKey(input);

    const existing = await prisma.booking.findUnique({ where: { dedupeKey } });
    if (existing) {
      return NextResponse.json({
        ok: true,
        bookingId: existing.id,
        duplicate: true,
      });
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
      return NextResponse.json({
        ok: true,
        bookingId: created.id,
        duplicate: false,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await prisma.booking.findUnique({ where: { dedupeKey } });
        if (again) {
          return NextResponse.json({
            ok: true,
            bookingId: again.id,
            duplicate: true,
          });
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
        { status: 400 },
      );
    }
    console.error("booking POST", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
