import { NextResponse } from "next/server";
import { loadEnvConfig } from "@next/env";
import { ZodError } from "zod";
import { AssistantReplySchema, TravelAssistantRequestSchema } from "@/lib/travel-assistant-schema";
import { buildTravelAssistantSystemPrompt } from "@/lib/travel-assistant-prompt";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";

/** Ensures `.env` / `.env.local` are applied even if this module loaded before Next injected them. */
loadEnvConfig(process.cwd());

/** Vercel / hosts: allow long enough for one OpenAI round-trip (raise on Pro if needed). */
export const maxDuration = 60;

function openAiFetchTimeoutMs(): number {
  const n = Number(process.env.OPENAI_FETCH_TIMEOUT_MS);
  if (Number.isFinite(n) && n >= 5_000 && n <= 120_000) return n;
  /** Default stays low so two-phase calls (JSON → plain) rarely exceed `maxDuration`. */
  return 11_000;
}

function resolveOpenAiApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY ?? process.env.OPENAI_KEY;
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.length > 0 ? s : undefined;
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return valid JSON");
  }
  return raw.slice(start, end + 1);
}

function openAiChatUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const base = raw.replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

function parseOpenAiErrorBody(errText: string): string | undefined {
  try {
    const j = JSON.parse(errText) as { error?: { message?: string } };
    const m = j?.error?.message;
    return typeof m === "string" && m.trim() ? m.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Seconds to wait before retrying (from OpenAI 429 message); clamped for sensible UI cooldown. */
function parseOpenAi429RetryAfterSeconds(errText: string): number | undefined {
  const detail = parseOpenAiErrorBody(errText) ?? errText;
  const msM = detail.match(/try again in\s+([\d.]+)\s*ms\b/i);
  if (msM) {
    const ms = parseFloat(msM[1]);
    if (!Number.isNaN(ms) && ms > 0) {
      return Math.min(120, Math.max(5, Math.ceil(ms / 1000)));
    }
  }
  const sM = detail.match(/try again in\s+([\d.]+)\s*s(?:ec)?\b/i);
  if (sM) {
    const sec = parseFloat(sM[1]);
    if (!Number.isNaN(sec) && sec > 0) {
      return Math.min(120, Math.max(5, Math.ceil(sec)));
    }
  }
  return undefined;
}

function userFacingOpenAiError(status: number, errText: string): string {
  const detail = parseOpenAiErrorBody(errText);
  if (status === 401) {
    return "OpenAI rejected this API key (401). Confirm OPENAI_API_KEY in `.env` / `.env.local`, restart the dev server, or create a new key in the OpenAI dashboard.";
  }
  if (status === 429) {
    const hint = parseOpenAi429RetryAfterSeconds(errText);
    const wait = hint ? ` Suggested wait from OpenAI: ~${hint}s.` : "";
    return `OpenAI rate limit (429): too many requests or tokens per minute for your plan.${wait} See usage and limits in your OpenAI dashboard, or wait before sending again.`;
  }
  if (status === 504) {
    return "OpenAI request timed out. Try a shorter message, then try again.";
  }
  if (status === 402 || status === 403) {
    return "OpenAI returned a billing or access error. Check your plan, credits, and project limits in the OpenAI dashboard.";
  }
  if (status === 400 && detail) {
    return `OpenAI request error: ${detail}`;
  }
  if (detail) {
    return `OpenAI error (${status}): ${detail}`;
  }
  return `OpenAI returned HTTP ${status}. Check the server terminal logs for details.`;
}

function shouldRetryChatWithoutJsonObject(status: number, errText: string): boolean {
  if (status !== 400) return false;
  const t = errText.toLowerCase();
  return (
    t.includes("response_format") ||
    t.includes("json_object") ||
    t.includes("json mode") ||
    t.includes("does not support")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wait before retrying OpenAI after HTTP 429 (kept short so serverless / reverse proxies do not 502). */
function waitMsAfter429(res: Response, errText: string, attemptIndex: number): number {
  const hardCap = 3_500;
  const header = res.headers.get("retry-after");
  if (header) {
    const sec = parseFloat(header);
    if (!Number.isNaN(sec) && sec > 0) {
      return Math.min(Math.ceil(sec * 1000), hardCap);
    }
  }
  const detail = (parseOpenAiErrorBody(errText) ?? errText).toLowerCase();
  const mMs = detail.match(/try again in\s+([\d.]+)\s*ms/);
  if (mMs) {
    const ms = parseFloat(mMs[1]);
    if (!Number.isNaN(ms) && ms > 0) return Math.min(Math.ceil(ms), hardCap);
  }
  const m = detail.match(/try again in\s+([\d.]+)\s*s/);
  if (m) {
    const sec = parseFloat(m[1]);
    if (!Number.isNaN(sec) && sec > 0) return Math.min(Math.ceil(sec * 1000), hardCap);
  }
  return Math.min(900 * 2 ** attemptIndex, hardCap);
}

type ChatBody = {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: { role: string; content: string }[];
  response_format?: { type: "json_object" };
};

type TripLike = {
  destinations?: unknown;
  adults?: unknown;
  children?: unknown;
  arrivalDate?: unknown;
  departureDate?: unknown;
};

function fallbackReplyForRateLimit(
  lastUserMessage: string,
  trip: unknown,
  itineraryDays?: { dayNumber: number; dateLabel: string; city: string; title: string; highlights: string[] }[],
): {
  reply: string;
  itinerarySuggestion?: { days: { dayNumber: number; dateLabel: string; city: string; title: string; highlights: string[] }[] };
} {
  const t = (trip ?? {}) as TripLike;
  const destinations = Array.isArray(t.destinations)
    ? t.destinations.filter((x): x is string => typeof x === "string")
    : [];
  const adults = typeof t.adults === "number" ? t.adults : 0;
  const children = typeof t.children === "number" ? t.children : 0;
  const userText = lastUserMessage.toLowerCase();
  const wantsPrice = /price|cost|total|quote|₹|inr/.test(userText);
  const wantsCustom =
    /itinerary|custom|customise|customize|slow|pace|parents|senior|kids|children/.test(userText);

  if (wantsPrice) {
    return {
      reply:
        "I can help with planning and itinerary tips right now. For an exact price, please tap **Get exact price** — totals always come from your quote engine.",
    };
  }

  if (wantsCustom && itineraryDays && itineraryDays.length > 0) {
    const days = itineraryDays.map((d) => ({
      ...d,
      highlights: [
        ...d.highlights,
        "Keep buffer time between temple visits to avoid rush and traffic stress.",
        ...(adults + children > 4
          ? ["Use staggered breaks for meals/rest so group energy stays balanced throughout the day."]
          : []),
      ].slice(0, 6),
    }));
    return {
      reply:
        "OpenAI is busy right now, so I switched to backup mode and prepared a gentler itinerary draft for you. You can apply it now and continue refining once the model is available.",
      itinerarySuggestion: { days },
    };
  }

  return {
    reply: `OpenAI is rate-limited right now, but I can still help.\n\nBased on your trip (${destinations.join(", ") || "Varanasi"}; ${adults} adults${children ? `, ${children} children` : ""}), I suggest:\n- Keep 1 light block each day for buffer/rest.\n- Prioritize darshan windows early morning or late evening.\n- Club nearby stops to reduce transit fatigue.\n- Re-run the assistant in a minute for deeper customisation.`,
  };
}

/**
 * POST chat/completions; on 429, one short backoff retry (long multi-retry chains hit platform timeouts → 502).
 */
async function openAiChatCompletion(
  url: string,
  apiKey: string,
  body: ChatBody,
  requestId: string,
): Promise<{ ok: true; res: Response } | { ok: false; status: number; errText: string }> {
  /** Initial attempt + one retry after 429 only (2 iterations max). */
  const maxAttempts = 2;
  let lastStatus = 503;
  let lastErr = "{}";
  const tMs = openAiFetchTimeoutMs();

  for (let i = 0; i < maxAttempts; i++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(tMs),
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Network error");
      if (err.name === "AbortError" || err.message.includes("aborted")) {
        return {
          ok: false,
          status: 504,
          errText: JSON.stringify({ error: { message: `OpenAI fetch timed out after ${tMs}ms` } }),
        };
      }
      return { ok: false, status: 503, errText: JSON.stringify({ error: { message: err.message } }) };
    }

    if (res.ok) {
      return { ok: true, res };
    }

    const errText = await res.text();
    lastStatus = res.status;
    lastErr = errText;

    if (res.status === 429 && i < maxAttempts - 1) {
      const waitMs = waitMsAfter429(res, errText, i);
      logApiEvent("warn", {
        route: "/api/travel-assistant",
        requestId,
        status: 429,
        durationMs: 0,
        message: `OpenAI 429, retry in ${waitMs}ms (attempt ${i + 1}/${maxAttempts})`,
      });
      await sleep(waitMs);
      continue;
    }

    return { ok: false, status: res.status, errText };
  }

  return { ok: false, status: lastStatus, errText: lastErr };
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

  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    logApiEvent("warn", {
      route: "/api/travel-assistant",
      requestId,
      status: 503,
      durationMs: Math.round(performance.now() - start),
      message: "OPENAI_API_KEY missing",
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          "Travel assistant is not configured. Add OPENAI_API_KEY to `.env` or `.env.local` in the project root, save the file, then restart `npm run dev` (or your production process).",
      },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }

  try {
    const body = await req.json();
    const parsed = TravelAssistantRequestSchema.parse(body);

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const userContext = JSON.stringify({
      trip: parsed.trip,
      itineraryDays: parsed.itineraryDays ?? null,
      quoteSummary: parsed.quoteSummary ?? null,
    });

    /** Keeps TPM lower on long chats (older turns matter less for the next reply). */
    const recentChat = parsed.messages.slice(-10);

    const messages = [
      { role: "system" as const, content: buildTravelAssistantSystemPrompt() },
      {
        role: "system" as const,
        content: `Current trip context (JSON):\n${userContext}`,
      },
      ...recentChat.map((m) => ({ role: m.role, content: m.content })),
    ];

    const url = openAiChatUrl();
    const baseBody: ChatBody = {
      model,
      temperature: 0.5,
      max_tokens: 900,
      messages,
    };

    let result = await openAiChatCompletion(
      url,
      apiKey,
      { ...baseBody, response_format: { type: "json_object" } },
      requestId,
    );

    if (!result.ok && shouldRetryChatWithoutJsonObject(result.status, result.errText)) {
      result = await openAiChatCompletion(url, apiKey, baseBody, requestId);
    }

    if (!result.ok) {
      const httpOut = result.status === 504 ? 504 : 503;
      logApiEvent("error", {
        route: "/api/travel-assistant",
        requestId,
        status: httpOut,
        durationMs: Math.round(performance.now() - start),
        message: `OpenAI error ${result.status}: ${result.errText.slice(0, 800)}`,
      });
      if (result.status === 429) {
        const lastUserMessage = [...parsed.messages]
          .reverse()
          .find((m) => m.role === "user")?.content ?? "Help me with itinerary";
        const fallback = fallbackReplyForRateLimit(
          lastUserMessage,
          parsed.trip,
          parsed.itineraryDays as
            | { dayNumber: number; dateLabel: string; city: string; title: string; highlights: string[] }[]
            | undefined,
        );
        logApiEvent("warn", {
          route: "/api/travel-assistant",
          requestId,
          status: 200,
          durationMs: Math.round(performance.now() - start),
          message: "Served local fallback assistant response after OpenAI 429",
        });
        return NextResponse.json(
          { ok: true, ...fallback, fallback: true },
          { status: 200, headers: { "x-request-id": requestId } },
        );
      }
      const errMsg = userFacingOpenAiError(result.status, result.errText);
      const retryAfterSec =
        result.status === 429
          ? parseOpenAi429RetryAfterSeconds(result.errText) ?? 60
          : undefined;
      return NextResponse.json(
        {
          ok: false,
          error: errMsg,
          ...(typeof retryAfterSec === "number" ? { retryAfterSec } : {}),
        },
        { status: httpOut, headers: { "x-request-id": requestId } },
      );
    }

    const openaiRes = result.res;
    const openaiJson = (await openaiRes.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const rawContent = openaiJson.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string" || !rawContent.trim()) {
      throw new Error("Empty model response");
    }

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
