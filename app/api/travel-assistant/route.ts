import { NextResponse } from "next/server";
import { loadEnvConfig } from "@next/env";
import { ZodError } from "zod";
import { AssistantReplySchema, TravelAssistantRequestSchema } from "@/lib/travel-assistant-schema";
import { buildTravelAssistantSystemPrompt } from "@/lib/travel-assistant-prompt";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";

/** Ensures `.env` / `.env.local` are applied even if this module loaded before Next injected them. */
loadEnvConfig(process.cwd());

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

function userFacingOpenAiError(status: number, errText: string): string {
  const detail = parseOpenAiErrorBody(errText);
  if (status === 401) {
    return "OpenAI rejected this API key (401). Confirm OPENAI_API_KEY in `.env` / `.env.local`, restart the dev server, or create a new key in the OpenAI dashboard.";
  }
  if (status === 429) {
    return "OpenAI rate limit (429). Wait a minute and try again, or check usage on your OpenAI account.";
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

/** Wait before retrying OpenAI after HTTP 429. */
function waitMsAfter429(res: Response, errText: string, attemptIndex: number): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const sec = parseFloat(header);
    if (!Number.isNaN(sec) && sec > 0) {
      return Math.min(Math.ceil(sec * 1000), 25_000);
    }
  }
  const detail = parseOpenAiErrorBody(errText)?.toLowerCase() ?? "";
  const m = detail.match(/try again in ([\d.]+)s/);
  if (m) {
    const sec = parseFloat(m[1]);
    if (!Number.isNaN(sec) && sec > 0) return Math.min(Math.ceil(sec * 1000), 25_000);
  }
  return Math.min(1500 * 2 ** attemptIndex, 12_000);
}

type ChatBody = {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: { role: string; content: string }[];
  response_format?: { type: "json_object" };
};

/**
 * POST chat/completions; on 429, waits and retries a few times (free tier hits RPM/TPM often).
 */
async function openAiChatCompletion(
  url: string,
  apiKey: string,
  body: ChatBody,
  requestId: string,
): Promise<{ ok: true; res: Response } | { ok: false; status: number; errText: string }> {
  const max429Attempts = 4;
  let lastStatus = 502;
  let lastErr = "{}";

  for (let i = 0; i < max429Attempts; i++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { ok: false, status: 502, errText: JSON.stringify({ error: { message: msg } }) };
    }

    if (res.ok) {
      return { ok: true, res };
    }

    const errText = await res.text();
    lastStatus = res.status;
    lastErr = errText;

    if (res.status === 429 && i < max429Attempts - 1) {
      const waitMs = waitMsAfter429(res, errText, i);
      logApiEvent("warn", {
        route: "/api/travel-assistant",
        requestId,
        status: 429,
        durationMs: 0,
        message: `OpenAI 429, retry in ${waitMs}ms (attempt ${i + 1}/${max429Attempts})`,
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
    const userContext = JSON.stringify(
      {
        trip: parsed.trip,
        itineraryDays: parsed.itineraryDays ?? null,
        quoteSummary: parsed.quoteSummary ?? null,
      },
      null,
      0,
    );

    const messages = [
      { role: "system" as const, content: buildTravelAssistantSystemPrompt() },
      {
        role: "system" as const,
        content: `Current trip context (JSON):\n${userContext}`,
      },
      ...parsed.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const url = openAiChatUrl();
    const baseBody: ChatBody = {
      model,
      temperature: 0.5,
      max_tokens: 1800,
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
      logApiEvent("error", {
        route: "/api/travel-assistant",
        requestId,
        status: 502,
        durationMs: Math.round(performance.now() - start),
        message: `OpenAI error ${result.status}: ${result.errText.slice(0, 800)}`,
      });
      const errMsg = userFacingOpenAiError(result.status, result.errText);
      const extra =
        result.status === 429
          ? " The server already retried automatically; if this persists, wait 1–2 minutes or upgrade your OpenAI usage tier."
          : "";
      return NextResponse.json(
        {
          ok: false,
          error: errMsg + extra,
          ...(result.status === 429 ? { retryAfterSec: 45 } : {}),
        },
        { status: 502, headers: { "x-request-id": requestId } },
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
