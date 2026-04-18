"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [nowTick, setNowTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const blocked = Date.now() < blockedUntil;
  const blockedSecLeft = useMemo(() => {
    void nowTick;
    return blocked ? Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000)) : 0;
  }, [blocked, blockedUntil, nowTick]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (!blocked) return;
    const id = window.setInterval(() => setNowTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [blocked, blockedUntil]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      if (Date.now() < blockedUntil) {
        setError(`Please wait ${blockedSecLeft}s before sending again (OpenAI rate limit).`);
        return;
      }
      setError(null);
      setPendingItinerary(null);
      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
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
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          reply?: string;
          itinerarySuggestion?: { days?: ItineraryDayDTO[] };
          retryAfterSec?: number;
        };
        if (!res.ok || !data?.ok) {
          if (typeof data.retryAfterSec === "number" && data.retryAfterSec > 0) {
            setBlockedUntil(Date.now() + data.retryAfterSec * 1000);
          }
          throw new Error(data?.error ?? "Assistant request failed");
        }
        const reply = typeof data.reply === "string" ? data.reply : "";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setInput("");
        if (data.itinerarySuggestion?.days?.length) {
          setPendingItinerary(data.itinerarySuggestion.days as ItineraryDayDTO[]);
        }
      } catch (e) {
        setMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [blockedUntil, itineraryDays, loading, messages, quoteSummary, trip],
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
          {blocked ? (
            <span style={{ display: "block", marginTop: 6, fontWeight: 600, color: "var(--text)" }}>
              Rate limit pause: wait ~{blockedSecLeft}s before sending again.
            </span>
          ) : null}
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
            <button
              key={s}
              type="button"
              className="assistantChip"
              onClick={() => void send(s)}
              disabled={loading || blocked}
            >
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
            disabled={loading || blocked}
          />
          <button type="submit" disabled={loading || blocked || !input.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
