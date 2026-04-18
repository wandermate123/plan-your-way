import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AssistantReplySchema, TravelAssistantRequestSchema } from "@/lib/travel-assistant-schema";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildGeminiRequestBody,
  callGeminiGenerateContent,
  extractGeminiText,
  type GeminiGenerateResponse,
} from "@/lib/gemini-travel-assistant";

function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return valid JSON");
  }
  return raw.slice(start, end + 1);
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const start = performance.now();

  const limit = checkRateLimit(req, "/api/travel-assistant", 20, 60_000);
  if (!limit.ok) {
    logApiEvent("warn", {
      route: "/api/travel-assistant",
      requestId,
      status: 429,
      durationMs: Math.round(performance.now() - start),
      message: "Rate limit exceeded",
    });
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "x-request-id": requestId, "retry-after": String(limit.retryAfterSec) },
      },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logApiEvent("warn", {
      route: "/api/travel-assistant",
      requestId,
      status: 503,
      durationMs: Math.round(performance.now() - start),
      message: "GEMINI_API_KEY missing",
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          "Travel assistant is not configured yet. Add GEMINI_API_KEY (Google AI Studio / Vertex) to enable chat.",
      },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }

  try {
    const body = await req.json();
    const parsed = TravelAssistantRequestSchema.parse(body);

    const modelId = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    const geminiBody = buildGeminiRequestBody(parsed);

    const geminiRes = await callGeminiGenerateContent(apiKey, modelId, geminiBody);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      logApiEvent("error", {
        route: "/api/travel-assistant",
        requestId,
        status: 502,
        durationMs: Math.round(performance.now() - start),
        message: `Gemini error ${geminiRes.status}: ${errText.slice(0, 500)}`,
      });
      return NextResponse.json(
        { ok: false, error: "Assistant is temporarily unavailable. Please try again." },
        { status: 502, headers: { "x-request-id": requestId } },
      );
    }

    const geminiJson = (await geminiRes.json()) as GeminiGenerateResponse;
    const rawContent = extractGeminiText(geminiJson);
    const replyParsed = AssistantReplySchema.parse(JSON.parse(extractJsonObject(rawContent)));

    const status = 200;
    logApiEvent("info", {
      route: "/api/travel-assistant",
      requestId,
      status,
      durationMs: Math.round(performance.now() - start),
    });

    return NextResponse.json(
      { ok: true, ...replyParsed },
      { status, headers: { "x-request-id": requestId } },
    );
  } catch (err) {
    const status = err instanceof ZodError ? 400 : 500;
    const message = err instanceof Error ? err.message : "Assistant error";
    logApiEvent(status === 500 ? "error" : "warn", {
      route: "/api/travel-assistant",
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
