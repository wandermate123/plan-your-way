import type { BookingRequest } from "./validation";

/** Last 10 digits for IN; strips country code 91 when present. */
export function normalizeIndiaPhoneDigits(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("91")) {
    const tail = d.slice(-10);
    return tail.length === 10 ? tail : null;
  }
  if (d.length >= 10) {
    const tail = d.slice(-10);
    return tail.length === 10 ? tail : null;
  }
  return null;
}

/** Same trip contact + dates → one logical submission (idempotent). */
export function bookingDedupeKey(payload: BookingRequest): string {
  const ten = normalizeIndiaPhoneDigits(payload.phone);
  if (!ten) throw new Error("Invalid phone");
  const { arrivalDate, departureDate } = payload.summary;
  return `${ten}|${arrivalDate}|${departureDate}`;
}
