"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ItineraryDayDTO } from "@/lib/travel-assistant-schema";
import { IconSparkles, IconMessageCircle } from "./icons";

type ChatRole = "user" | "assistant";

type ChatMessage = { role: ChatRole; content: string };

export type TravelAssistantDockProps = {
  trip: Record<string, unknown>;
  itineraryDays: ItineraryDayDTO[] | null;
  quoteSummary: { total: number; currency: string; nights: number; days: number } | null;
  canRestoreItinerary: boolean;
  onApplyItinerary: (days: ItineraryDayDTO[]) => void;
  onRestoreDefaultItinerary: () => void;
};

const STARTERS = [
  "We're travelling with parents — can you slow the pace?",
  "Suggest a food-forward day in Varanasi without skipping ghats.",
  "We picked Ayodhya — how should days be split?",
];

export function TravelAssistantDock({
  trip,
  itineraryDays,
  quoteSummary,
  canRestoreItinerary,
  onApplyItinerary,
  onRestoreDefaultItinerary,
}: TravelAssistantDockProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I can answer quick questions, suggest pacing, and draft a customised day plan. Prices always come from your quote — ask me anything about the itinerary.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingItinerary, setPendingItinerary] = useState<ItineraryDayDTO[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setError(null);
      setPendingItinerary(null);
      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);
      try {
        const res = await fetch("/api/travel-assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            trip,
            itineraryDays: itineraryDays ?? undefined,
            quoteSummary: quoteSummary ?? undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? "Assistant request failed");
        }
        const reply = typeof data.reply === "string" ? data.reply : "";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        if (data.itinerarySuggestion?.days?.length) {
          setPendingItinerary(data.itinerarySuggestion.days as ItineraryDayDTO[]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [itineraryDays, loading, messages, quoteSummary, trip],
  );

  return (
    <>
      <button
        type="button"
        className="assistantFab"
        onClick={() => setOpen(true)}
        title="Open travel assistant"
        aria-label="Open travel assistant"
      >
        <IconSparkles /> Assistant
      </button>

      {open ? (
        <div className="assistantBackdrop" role="presentation" onClick={() => setOpen(false)} />
      ) : null}

      <aside className={`assistantPanel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="assistantPanelHeader">
          <div className="assistantPanelTitle">
            <IconSparkles />
            <span>Travel assistant</span>
          </div>
          <button type="button" className="assistantPanelClose" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <p className="assistantDisclaimer">
          AI suggestions are for planning only. Your quote total is computed separately when you click Get quote.
        </p>
        {canRestoreItinerary ? (
          <div className="assistantToolbar">
            <button type="button" className="assistantLinkBtn" onClick={onRestoreDefaultItinerary}>
              Restore default itinerary
            </button>
          </div>
        ) : null}
        <div className="assistantStarters">
          {STARTERS.map((s) => (
            <button key={s} type="button" className="assistantChip" onClick={() => void send(s)} disabled={loading}>
              {s}
            </button>
          ))}
        </div>
        <div className="assistantMessages" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`assistantBubble ${m.role}`}>
              {m.role === "assistant" ? (
                <span className="assistantBubbleIcon" aria-hidden>
                  <IconSparkles />
                </span>
              ) : (
                <span className="assistantBubbleIcon" aria-hidden>
                  <IconMessageCircle />
                </span>
              )}
              <div className="assistantBubbleText">{m.content}</div>
            </div>
          ))}
          {loading ? <div className="assistantTyping">Thinking…</div> : null}
        </div>
        {error ? <div className="assistantError">{error}</div> : null}
        {pendingItinerary?.length ? (
          <div className="assistantApplyRow">
            <button
              type="button"
              className="assistantApplyBtn"
              onClick={() => {
                onApplyItinerary(pendingItinerary);
                setPendingItinerary(null);
              }}
            >
              Apply suggested itinerary to preview
            </button>
          </div>
        ) : null}
        <form
          className="assistantComposer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about pacing, temples, food, kids…"
            maxLength={2000}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
