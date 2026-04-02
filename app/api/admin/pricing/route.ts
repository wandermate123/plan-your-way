import { NextResponse } from "next/server";
import { z } from "zod";
import { readPricingConfig, writePricingConfig } from "@/lib/storage";
import { PricingConfigSchema } from "@/lib/validation";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function authHeaderValid(req: Request): boolean {
  const secret = process.env.ADMIN_PRICING_SECRET?.trim();
  if (!secret) return false;
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return false;
  return h.slice(7) === secret;
}

export async function GET(req: Request) {
  if (!authHeaderValid(req)) return unauthorized();
  try {
    const pricing = await readPricingConfig();
    return NextResponse.json({ ok: true, pricing });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to read pricing" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!authHeaderValid(req)) return unauthorized();
  try {
    const body = await req.json();
    const next = PricingConfigSchema.parse(body);
    await writePricingConfig(next);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: err.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    );
  }
}
