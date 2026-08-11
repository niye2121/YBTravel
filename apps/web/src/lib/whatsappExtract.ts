/**
 * Deterministic demo extraction — a stand-in for the AI-assisted intake
 * adapter (P2-04/05/06). Real extraction runs behind a provider-neutral
 * adapter with inbound redaction per CLAUDE.md's AI boundary; this keeps
 * the UI interactive without depending on that adapter existing yet.
 */

export const AIRPORTS: Record<string, string> = {
  JFK: "New York JFK", EWR: "Newark", LGA: "New York LaGuardia", TLV: "Tel Aviv",
  LAX: "Los Angeles", MIA: "Miami", ORD: "Chicago O'Hare", BOS: "Boston",
  CDG: "Paris CDG", LHR: "London Heathrow", ATL: "Atlanta", MCO: "Orlando",
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export type ExtractedIntake = {
  client: string | null;
  origin: string | null;
  destination: string | null;
  dates: string[];
  pax: number | null;
  cabin: string | null;
  flexible: boolean;
  missing: string[];
};

export function extractFromMessage(text: string): ExtractedIntake | null {
  const t = text.trim();
  if (!t) return null;

  const codes: string[] = [];
  let m: RegExpExecArray | null;
  const codeRe = /\b([A-Z]{3})\b/g;
  while ((m = codeRe.exec(t)) !== null) {
    const code = m[1];
    if (code && AIRPORTS[code] && !codes.includes(code)) codes.push(code);
  }
  const cities: Record<string, string> = {
    "tel aviv": "TLV", israel: "TLV", "new york": "JFK", newark: "EWR",
    miami: "MIA", "los angeles": "LAX", chicago: "ORD", boston: "BOS",
    london: "LHR", paris: "CDG",
  };
  Object.entries(cities).forEach(([w, c]) => {
    if (t.toLowerCase().includes(w) && !codes.includes(c)) codes.push(c);
  });

  const dateRe = new RegExp(
    `\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s*(?:of\\s*)?(${MONTHS.join("|")})[a-z]*`,
    "gi",
  );
  const dates: string[] = [];
  while ((m = dateRe.exec(t)) !== null) {
    const [day, month] = [m[1], m[2]];
    if (day && month) {
      dates.push(`${day.padStart(2, "0")} ${month[0]?.toUpperCase()}${month.slice(1).toLowerCase()}`);
    }
  }

  const paxM = t.match(/\b(\d{1,2})\s*(?:people|pax|passengers|adults|of us|travell?ers)\b/i);
  let cabin: string | null = null;
  if (/business/i.test(t)) cabin = "Business";
  else if (/premium\s*economy/i.test(t)) cabin = "Premium economy";
  else if (/first\s*class/i.test(t)) cabin = "First";
  else if (/economy|coach/i.test(t)) cabin = "Economy";

  const nameM =
    t.match(/(?:this is|it'?s|my name is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/) ||
    t.match(/\bfor\s+(?:the\s+)?([A-Z][a-z]+)\s+family\b/);

  const missing: string[] = [];
  if (!nameM) missing.push("Client name");
  if (codes.length < 2) missing.push("Origin or destination");
  if (!dates.length) missing.push("Travel dates");
  if (!paxM) missing.push("Number of travellers");
  if (!cabin) missing.push("Cabin class");
  missing.push("Legal passport names and dates of birth");

  return {
    client: nameM?.[1] ?? null,
    origin: codes[0] ?? null,
    destination: codes[1] ?? null,
    dates,
    pax: paxM ? Number(paxM[1]) : null,
    cabin,
    flexible: /flexib|around|either side|give or take/i.test(t),
    missing,
  };
}

export const SAMPLE_MESSAGE =
  "Hi this is Mizrahi, we need business class for 4 people from JFK to Tel Aviv " +
  "around 12 Oct returning 26 Oct, flexible a day or two either side. Thanks";
