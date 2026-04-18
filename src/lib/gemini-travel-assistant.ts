import type { TravelAssistantRequest } from "./travel-assistant-schema";
import { buildTravelAssistantSystemPrompt } from "./travel-assistant-prompt";

type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

export type GeminiGenerateResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; code?: number; status?: string };
};

/** Build Gemini `contents` from chat messages; Gemini must start with `user`. */
export function buildGeminiContents(messages: TravelAssistantRequest["messages"]): {
  contents: GeminiContent[];
  leadingAssistantBlurb: string;
} {
  let i = 0;
  const leadingAssistant: string[] = [];
  while (i < messages.length && messages[i].role === "assistant") {
    leadingAssistant.push(messages[i].content);
    i += 1;
  }

  const contents: GeminiContent[] = [];
  for (; i < messages.length; i += 1) {
    const m = messages[i];
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else {
      contents.push({ role: "model", parts: [{ text: m.content }] });
    }
  }

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  } else if (contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "Continue our conversation." }] });
  }

  return { contents, leadingAssistantBlurb: leadingAssistant.join("\n\n") };
}

export function buildGeminiRequestBody(parsed: TravelAssistantRequest): Record<string, unknown> {
  const userContext = JSON.stringify(
    {
      trip: parsed.trip,
      itineraryDays: parsed.itineraryDays ?? null,
      quoteSummary: parsed.quoteSummary ?? null,
    },
    null,
    0,
  );

  const { contents, leadingAssistantBlurb } = buildGeminiContents(parsed.messages);

  const systemParts: { text: string }[] = [
    { text: buildTravelAssistantSystemPrompt() },
    { text: `Current trip context (JSON):\n${userContext}` },
  ];
  if (leadingAssistantBlurb.trim()) {
    systemParts.push({
      text: `Earlier assistant messages in this session (for context only):\n${leadingAssistantBlurb}`,
    });
  }

  return {
    systemInstruction: { parts: systemParts },
    contents,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };
}

export function extractGeminiText(data: GeminiGenerateResponse): string {
  const first = data.candidates?.[0];
  const finish = first?.finishReason;
  if (finish && finish !== "STOP" && finish !== "MAX_TOKENS") {
    throw new Error(`Model stopped (${finish}). Try rephrasing your message.`);
  }
  const text = first?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    if (data.error?.message) throw new Error(data.error.message);
    const block = data.promptFeedback?.blockReason;
    if (block) throw new Error(`Request blocked (${block}).`);
    throw new Error("Empty model response");
  }
  return text;
}

export async function callGeminiGenerateContent(
  apiKey: string,
  modelId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
