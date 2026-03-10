import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // In a future step you can save this to a database or send an email.
    if (!body?.name || !body?.phone) {
      return NextResponse.json(
        { ok: false, error: "Name and phone are required." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    );
  }
}

