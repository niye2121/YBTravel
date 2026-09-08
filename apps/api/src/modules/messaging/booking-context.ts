export type BookingResolution = "matched" | "new_booking" | "ambiguous";

export type DatePrecision = "day" | "month";

export type ResolvedTravelDate = {
  displayText: string;
  isoDate: string | null;
  precision: DatePrecision | null;
  inferenceNote: string | null;
};

export type BookingResolutionInput = {
  intent: "existing_booking" | "new_booking" | "unclear";
  matchedTravelRequestId: number | null;
  confidence: number;
  reason: string;
};

export type BookingResolutionResult = {
  resolution: BookingResolution;
  matchedTravelRequestId: number | null;
  confidence: number;
  reason: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const MONTH_PATTERN = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;

/**
 * Converts a month name or abbreviation into a zero-based month number.
 * It exists so date inference uses one explicit vocabulary instead of relying
 * on environment-dependent JavaScript date parsing.
 */
function monthIndex(value: string): number | null {
  const normalized = value.toLowerCase().slice(0, 3);
  const index = MONTHS.findIndex((month) => month.toLowerCase().startsWith(normalized));
  return index >= 0 ? index : null;
}

/**
 * Confirms that a year, month, and day describe a real calendar date.
 * It constructs the value in UTC and compares every component so dates such
 * as 31 February cannot silently roll into March.
 */
function isValidDate(year: number, month: number, day: number): boolean {
  const value = new Date(Date.UTC(year, month, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month && value.getUTCDate() === day;
}

/**
 * Formats a calendar date as the ISO value stored by PostgreSQL DATE columns.
 * UTC component access keeps the result stable regardless of the API host's
 * local timezone.
 */
function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Resolves yearless travel dates to the closest logical future occurrence.
 * Explicit years are preserved. Month-only values retain month precision so
 * the system does not pretend that "January" means 1 January.
 */
export function resolveClosestFutureDate(value: string | null, today = new Date()): ResolvedTravelDate {
  const clean = value?.trim() ?? "";
  if (!clean) return { displayText: "", isoDate: null, precision: null, inferenceNote: null };

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    if (isValidDate(year, month, day)) {
      return { displayText: clean, isoDate: clean, precision: "day", inferenceNote: null };
    }
  }

  const monthMatch = clean.match(MONTH_PATTERN);
  if (!monthMatch) return { displayText: clean, isoDate: null, precision: null, inferenceNote: null };
  const month = monthIndex(monthMatch[1]);
  if (month === null) return { displayText: clean, isoDate: null, precision: null, inferenceNote: null };

  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const explicitYear = yearMatch ? Number(yearMatch[1]) : null;
  const textWithoutYear = clean.replace(/\b20\d{2}\b/, "").trim();
  const beforeMonth = textWithoutYear.slice(0, monthMatch.index).match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*$/i);
  const afterMonth = textWithoutYear.slice((monthMatch.index ?? 0) + monthMatch[0].length).match(/^\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  const day = Number(beforeMonth?.[1] ?? afterMonth?.[1] ?? 1);
  const precision: DatePrecision = beforeMonth || afterMonth ? "day" : "month";
  const reference = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let year = explicitYear ?? reference.getUTCFullYear();

  if (!explicitYear) {
    const candidate = new Date(Date.UTC(year, month, day));
    const explicitlyNext = /\bnext\b/i.test(clean);
    if (candidate < reference || (explicitlyNext && month === reference.getUTCMonth())) year += 1;
  }

  if (!isValidDate(year, month, day)) {
    return { displayText: clean, isoDate: null, precision: null, inferenceNote: null };
  }

  const canonicalMonth = MONTHS[month];
  const displayText = explicitYear
    ? clean
    : precision === "day"
      ? `${day} ${canonicalMonth} ${year}`
      : `${clean.replace(/\bnext\s+/i, "").trim()} ${year}`;
  return {
    displayText,
    isoDate: toIsoDate(year, month, day),
    precision,
    inferenceNote: explicitYear
      ? null
      : `Interpreted "${clean}" as ${displayText}, the closest logical future date.`,
  };
}

/**
 * Applies deterministic confidence gates to an AI booking recommendation.
 * A confident, valid match is accepted. Weak or invalid recommendations are
 * converted to ambiguity so an employee must choose instead of trusting a guess.
 */
export function decideBookingResolution(
  input: BookingResolutionInput,
  openBookingIds: readonly number[],
): BookingResolutionResult {
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidence)));
  if (openBookingIds.length === 0) {
    return {
      resolution: "new_booking",
      matchedTravelRequestId: null,
      confidence: 100,
      reason: "The client has no open bookings, so this information starts a new booking.",
    };
  }

  if (input.intent === "new_booking" && confidence >= 80) {
    return { resolution: "new_booking", matchedTravelRequestId: null, confidence, reason: input.reason };
  }

  const requiredMatchConfidence = openBookingIds.length === 1 ? 75 : 85;
  if (
    input.intent === "existing_booking" &&
    input.matchedTravelRequestId !== null &&
    openBookingIds.includes(input.matchedTravelRequestId) &&
    confidence >= requiredMatchConfidence
  ) {
    return {
      resolution: "matched",
      matchedTravelRequestId: input.matchedTravelRequestId,
      confidence,
      reason: input.reason,
    };
  }

  return {
    resolution: "ambiguous",
    matchedTravelRequestId: null,
    confidence,
    reason: input.reason || "The available details do not identify one open booking confidently.",
  };
}
