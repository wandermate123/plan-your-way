import { describe, expect, it } from "vitest";
import { buildGeminiContents, buildGeminiRequestBody } from "./gemini-travel-assistant";
import type { TravelAssistantRequest } from "./travel-assistant-schema";

describe("buildGeminiContents", () => {
  it("moves leading assistant messages into blurb and starts contents with user", () => {
    const { contents, leadingAssistantBlurb } = buildGeminiContents([
      { role: "assistant", content: "Welcome!" },
      { role: "user", content: "Help me pace the trip" },
    ]);
    expect(leadingAssistantBlurb).toContain("Welcome!");
    expect(contents[0].role).toBe("user");
    expect(contents[0].parts[0].text).toContain("pace");
  });

  it("maps assistant to model in the tail", () => {
    const { contents } = buildGeminiContents([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello back" },
      { role: "user", content: "Next" },
    ]);
    expect(contents.map((c) => c.role).join(",")).toBe("user,model,user");
  });
});

describe("buildGeminiRequestBody", () => {
  it("includes systemInstruction and JSON mode", () => {
    const parsed: TravelAssistantRequest = {
      messages: [{ role: "user", content: "Test" }],
      trip: { foo: "bar" },
    };
    const body = buildGeminiRequestBody(parsed);
    expect(body.systemInstruction).toBeDefined();
    expect((body.generationConfig as { responseMimeType?: string }).responseMimeType).toBe("application/json");
  });
});
