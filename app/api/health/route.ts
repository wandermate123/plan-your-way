import { NextResponse } from "next/server";

/** Use GET /api/health to confirm this Next app is the process answering on your port. */
export async function GET() {
  return NextResponse.json({ ok: true, app: "plan-your-way" });
}
