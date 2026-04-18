type ApiLogLevel = "info" | "warn" | "error";

type ApiLogPayload = {
  route: string;
  requestId: string;
  status: number;
  durationMs: number;
  message?: string;
};

export function logApiEvent(level: ApiLogLevel, payload: ApiLogPayload): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    ...payload,
  });
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

