import { NextResponse } from "next/server";
import { readPricingConfig, writePricingConfig } from "@/lib/storage";
import { PricingConfigSchema } from "@/lib/validation";

function isAuthorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN ?? "changeme";
  const headerToken = req.headers.get("x-admin-token");
  if (headerToken && headerToken === token) return true;
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  return queryToken === token;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const pricing = await readPricingConfig();
  return NextResponse.json({ ok: true, pricing });
}

export async function PUT(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const pricing = PricingConfigSchema.parse(body);
    await writePricingConfig(pricing);
    return NextResponse.json({ ok: true, pricing });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid pricing" },
      { status: 400 },
    );
  }
}

