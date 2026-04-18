/**
 * Production API rate limits (per IP per window). Tune via env without code changes.
 * Note: in-memory counters reset on cold starts and do not sync across serverless instances;
 * for strict global limits use Redis / Upstash in front of these routes.
 */
function intEnv(name: string, def: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return def;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export const RATE_LIMIT_WINDOW_MS = intEnv("RATE_LIMIT_WINDOW_MS", 60_000, 10_000, 3_600_000);

export const RATE_LIMIT_QUOTE_MAX = intEnv("RATE_LIMIT_QUOTE_MAX", 30, 5, 500);
export const RATE_LIMIT_QUOTE_OPTIONS_MAX = intEnv("RATE_LIMIT_QUOTE_OPTIONS_MAX", 60, 10, 2000);
export const RATE_LIMIT_TRAVEL_ASSISTANT_MAX = intEnv("RATE_LIMIT_TRAVEL_ASSISTANT_MAX", 15, 3, 300);
export const RATE_LIMIT_BOOKING_MAX = intEnv("RATE_LIMIT_BOOKING_MAX", 12, 2, 200);
