import { useState, useEffect, useMemo } from "react";

/* ------------------------------------------------------------------
   YB Travel — Home (agent desk landing page)

   Built to the approved design system extracted from
   "Requests Queue (standalone).html": Lato, exact palette,
   2px radii, warm-grey surfaces, no shadows.

   Workbook items:
     P1-06  current stage, missing steps, next required action
     P1-10  preferred / secondary representative and routing
     P1-12  reminders for unanswered inquiries and next action
     P1-21  all open client requests and status in one place
     P2-03/04/05  WhatsApp assistant: paste, extract, review
     P4-01/02  clients travelling soon, alerts for urgent events
------------------------------------------------------------------- */

/* --- Approved design tokens --------------------------------------- */

const T = {
  green: "#0f4430", greenLight: "#12503a", greenDark: "#0d3f2c",
  greenDarker: "#0a3324", greenHover: "#15583d",
  gold: "#d9a326", goldBorder: "#b8871a", goldHover: "#e5b13a",
  goldText: "#3b2a05", goldCount: "#a8761b",
  ink: "#22221f", ink2: "#33332e",
  muted: "#4b4b44", muted2: "#5c5c54", muted3: "#6f6f66",
  muted4: "#7d7d74", muted5: "#8a8a80",
  navText: "#e4ece8", deskText: "#b9cec3", navMore: "#dfeae4",
  panelHead: "#e9eae1", panelHeadText: "#3f4a42",
  toolbar: "#fbfbf7", tableHead: "#f4f4ed", rowHover: "#f6f8f3",
  hoverBtn: "#f2f2ec",
  line: "#cfcfc4", lineBtn: "#b6b6ac", lineRow: "#e6e6dc",
  lineSoft: "#ddddd3", lineSoft2: "#dcdcd2", lineHead: "#d6d6cd",
  red: "#b3261e", redGroup: "#9c2b1c", amber: "#8a6410",
  font: "'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
};

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const TABS = ["Home", "Requests", "Clients", "Travellers", "Bookings", "Tickets", "Reports"];

/* --- Data ---------------------------------------------------------- */

const TILES = [
  { key: "needsAction", n: 9, label: "NEEDS ACTION TODAY", sub: "3 within four hours", urgent: true },
  { key: "holds", n: 3, label: "HOLDS EXPIRING", sub: "next in 4h 12m", urgent: true },
  { key: "ready", n: 2, label: "READY TO ISSUE", sub: "payment confirmed" },
  { key: "waiting", n: 5, label: "WAITING ON CLIENT", sub: "2 overdue" },
  { key: "intake", n: 2, label: "NEEDS INTAKE", sub: "from WhatsApp" },
  { key: "unassigned", n: 1, label: "UNASSIGNED", sub: "no owner set", urgent: true },
];

const URGENT = [
  { id: "R-10482", client: "Kaplan", trip: "JFK → TLV", stage: "Ready to issue",
    prefix: "Ticketing limit — TTL", liveIn: 2 * HOUR + 51 * MIN, alert: true, agent: "SR" },
  { id: "R-10486", client: "Gross", trip: "MIA → TLV", stage: "Ready to issue",
    prefix: "Ticketing limit — TTL", liveIn: 3 * HOUR + 40 * MIN, alert: true, agent: "SR" },
  { id: "R-10467", client: "Mizrahi", trip: "EWR → TLV", stage: "Proposal sent",
    prefix: "Hold expires —", liveIn: 4 * HOUR + 12 * MIN, alert: true, agent: "RV" },
  { id: "R-10402", client: "Weiss", trip: "JFK → TLV", stage: "Waiting for info",
    deadline: "Follow up — overdue 2 days", alert: true, agent: "SR" },
  { id: "R-10493", client: "Rosenberg", trip: "JFK → TLV", stage: "Quoted",
    deadline: "Follow up — today 6:00 PM", agent: "MR" },
];

const DEPARTURES = [
  { client: "Weinstock", pax: 3, trip: "JFK → TLV", flight: "DL 468", local: "08 Aug 19:55",
    state: "Not confirmed — 6h escalation", level: "urgent" },
  { client: "Bernstein", pax: 4, trip: "EWR → TLV", flight: "UA 090", local: "08 Aug 22:10",
    state: "Not confirmed — 12h follow-up sent", level: "warn" },
  { client: "Schwartz", pax: 2, trip: "JFK → TLV", flight: "LY 002", local: "18 Aug 00:40",
    state: "Check-in opens in 6h", level: "normal" },
  { client: "Friedman", pax: 1, trip: "TLV → JFK", flight: "LY 007", local: "28 Aug 01:15",
    state: "Checked in", level: "done" },
];

const ALERTS = [
  { level: "urgent", text: "Sabre queue 42 — 3 items require attention" },
  { level: "urgent", text: "Schedule change on LY 002, 18 Aug — affects 2 ticketed trips" },
  { level: "warn", text: "1 request unassigned for more than 4 hours" },
  { level: "info", text: "Booking-fee table effective 1 Sep is still in draft" },
];

const QUEUE = [
  { stage: "Waiting for info", n: 6 }, { stage: "Researching", n: 4 },
  { stage: "Quoted", n: 7 }, { stage: "Proposal sent", n: 3 },
  { stage: "Payment pending", n: 2 }, { stage: "Ready to issue", n: 2 },
];

const ACTIVITY = [
  { at: "14:12", who: "R. Vogel", what: "issued ticket 114-2938471021 for Katz" },
  { at: "13:58", who: "System", what: "hold on R-10467 expires in 4 hours" },
  { at: "13:40", who: "M. Roth", what: "approved markup exception on R-10486" },
  { at: "13:21", who: "Y. Neuman", what: "sent proposal for R-10489 (Stern)" },
  { at: "12:55", who: "System", what: "schedule change on LY 002 — 40 minutes later" },
  { at: "12:30", who: "S. Rubin", what: "created client record for Rosenberg" },
  { at: "11:47", who: "System", what: "QuickBooks sync completed, 12 invoices" },
];

const STATUS = [
  ["Sabre", "Connected", "last call 12s ago", "ok"],
  ["QuickBooks", "Connected", "synced 11:47", "ok"],
  ["Messaging", "Manual mode", "copy-ready templates", "warn"],
  ["Background jobs", "3 queued", "no failures", "ok"],
  ["Last backup", "Today 04:00", "point-in-time enabled", "ok"],
];

/* --- WhatsApp intake extraction (deterministic demo) --------------- */

const AIRPORTS = {
  JFK: "New York JFK", EWR: "Newark", LGA: "New York LaGuardia", TLV: "Tel Aviv",
  LAX: "Los Angeles", MIA: "Miami", ORD: "Chicago O'Hare", BOS: "Boston",
  CDG: "Paris CDG", LHR: "London Heathrow", ATL: "Atlanta", MCO: "Orlando",
};
const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function extractFromMessage(text) {
  const t = text.trim();
  if (!t) return null;

  const codes = [];
  let m;
  const codeRe = /\b([A-Z]{3})\b/g;
  while ((m = codeRe.exec(t)) !== null) {
    if (AIRPORTS[m[1]] && !codes.includes(m[1])) codes.push(m[1]);
  }
  const cities = {
    "tel aviv": "TLV", israel: "TLV", "new york": "JFK", newark: "EWR",
    miami: "MIA", "los angeles": "LAX", chicago: "ORD", boston: "BOS",
    london: "LHR", paris: "CDG",
  };
  Object.entries(cities).forEach(([w, c]) => {
    if (t.toLowerCase().includes(w) && !codes.includes(c)) codes.push(c);
  });

  const dateRe = new RegExp(
    `\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s*(?:of\\s*)?(${MONTHS.join("|")})[a-z]*`, "gi");
  const dates = [];
  while ((m = dateRe.exec(t)) !== null) {
    dates.push(`${m[1].padStart(2, "0")} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}`);
  }

  const paxM = t.match(/\b(\d{1,2})\s*(?:people|pax|passengers|adults|of us|travell?ers)\b/i);
  let cabin = null;
  if (/business/i.test(t)) cabin = "Business";
  else if (/premium\s*economy/i.test(t)) cabin = "Premium economy";
  else if (/first\s*class/i.test(t)) cabin = "First";
  else if (/economy|coach/i.test(t)) cabin = "Economy";

  const nameM =
    t.match(/(?:this is|it'?s|my name is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/) ||
    t.match(/\bfor\s+(?:the\s+)?([A-Z][a-z]+)\s+family\b/);

  const missing = [];
  if (!nameM) missing.push("Client name");
  if (codes.length < 2) missing.push("Origin or destination");
  if (!dates.length) missing.push("Travel dates");
  if (!paxM) missing.push("Number of travellers");
  if (!cabin) missing.push("Cabin class");
  missing.push("Legal passport names and dates of birth");

  return {
    client: nameM ? nameM[1] : null,
    origin: codes[0] ?? null,
    destination: codes[1] ?? null,
    dates, pax: paxM ? Number(paxM[1]) : null, cabin,
    flexible: /flexib|around|either side|give or take/i.test(t),
    missing,
  };
}

const SAMPLE =
  "Hi this is Mizrahi, we need business class for 4 people from JFK to Tel Aviv " +
  "around 12 Oct returning 26 Oct, flexible a day or two either side. Thanks";

/* --- Helpers ------------------------------------------------------- */

function countdown(ms) {
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function greeting(d) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const levelColour = (l) =>
  l === "urgent" ? T.red : l === "warn" ? T.amber : l === "done" ? T.muted5 : T.ink2;

/* --- Small pieces -------------------------------------------------- */

function Panel({ title, right, children, pad }) {
  return (
    <div style={{
      border: `1px solid ${T.line}`, borderRadius: 2, background: "#fff", marginBottom: 16,
    }}>
      <div style={{
        background: T.panelHead, borderBottom: `1px solid ${T.line}`,
        padding: "8px 14px", display: "flex", alignItems: "center",
      }}>
        <div style={{
          fontSize: 11.5, fontWeight: 700, letterSpacing: "1.1px", color: T.panelHeadText,
        }}>{title}</div>
        <div style={{ flex: 1 }} />
        {right && <div style={{ fontSize: 11.5, color: T.muted3 }}>{right}</div>}
      </div>
      <div style={pad ? { padding: 14 } : undefined}>{children}</div>
    </div>
  );
}

const th = (right) => ({
  textAlign: right ? "right" : "left", fontWeight: 700, color: T.muted,
  padding: "7px 8px", borderBottom: `1px solid ${T.line}`, fontSize: 14,
});
const td = { padding: "10px 8px", borderBottom: `1px solid ${T.lineRow}`, fontSize: 14 };

const secondaryBtn = {
  height: 34, padding: "0 16px", background: "#fff", border: `1px solid ${T.lineBtn}`,
  borderRadius: 2, color: T.ink2, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
};
const primaryBtn = {
  height: 34, padding: "0 18px", background: T.green, border: `1px solid ${T.greenDarker}`,
  borderRadius: 2, color: "#fff", fontWeight: 700, fontSize: 14,
  fontFamily: "inherit", cursor: "pointer",
};

/* --- Component ----------------------------------------------------- */

export default function YBTravelHome() {
  const [tab, setTab] = useState("Home");
  const [now, setNow] = useState(() => new Date());
  const [mountedAt] = useState(() => Date.now());
  const [activeTile, setActiveTile] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [draft, setDraft] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = now.getTime() - mountedAt;

  const dateLabel = useMemo(() => now.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }), [now]);
  const timeLabel = now.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div style={{ minWidth: 1280, color: T.ink, fontFamily: T.font, background: "#f7f7f2" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap');
        .yb-link { color: ${T.green}; text-decoration: underline; }
        .yb-navlink { color: ${T.navText}; font-size: 13px; text-decoration: underline; }
        .yb-navlink:hover { color: #fff; }
        .yb-btn-primary:hover { background: ${T.greenHover} !important; }
        .yb-btn-secondary:hover { background: ${T.hoverBtn} !important; }
        .yb-btn-gold:hover { background: ${T.goldHover} !important; }
        .yb-tile:hover { border-color: ${T.muted5} !important; }
      `}</style>

      {/* ---------- Top utility bar ---------- */}
      <div style={{
        background: T.green,
        backgroundImage: `linear-gradient(180deg, ${T.greenLight} 0%, ${T.greenDark} 100%)`,
        padding: "0 22px", display: "flex", alignItems: "center", gap: 18, height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 3, background: T.gold, color: T.green,
            fontWeight: 900, fontSize: 12, display: "flex", alignItems: "center",
            justifyContent: "center", letterSpacing: ".5px",
          }}>YB</div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 19, letterSpacing: ".4px" }}>
            YB TRAVEL
          </div>
        </div>
        <div style={{ color: T.deskText, fontSize: 13.5, marginLeft: 6 }}>Brooklyn Desk</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            placeholder="Search name, request number, or PNR"
            style={{
              width: 360, height: 28, border: `1px solid ${T.greenDarker}`, borderRadius: 2,
              padding: "0 9px", fontSize: 13.5, fontFamily: "inherit", background: "#fff",
              color: T.ink, outline: "none",
            }}
          />
          <button className="yb-btn-gold" style={{
            height: 30, padding: "0 20px", background: T.gold, border: `1px solid ${T.goldBorder}`,
            borderRadius: 2, color: T.goldText, fontWeight: 700, fontSize: 13.5,
            fontFamily: "inherit", cursor: "pointer",
          }}>Go</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginLeft: 22 }}>
          <a href="#" className="yb-navlink" onClick={(e) => e.preventDefault()}>Setup</a>
          <a href="#" className="yb-navlink" onClick={(e) => e.preventDefault()}>Help</a>
          <a href="#" className="yb-navlink" onClick={(e) => e.preventDefault()}>Sign Out</a>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>M. Roth</div>
        </div>
      </div>

      {/* ---------- Primary nav ---------- */}
      <div style={{
        background: T.greenDark, padding: "0 22px", display: "flex",
        alignItems: "flex-end", gap: 2, height: 44,
      }}>
        {TABS.map((label) => (
          <button key={label} onClick={() => setTab(label)}
            style={tab === label ? {
              background: "#fff", border: 0, borderRadius: "3px 3px 0 0", color: T.green,
              fontWeight: 700, fontSize: 15, fontFamily: "inherit", padding: "9px 22px",
              cursor: "pointer",
            } : {
              background: "transparent", border: 0, color: T.navText, fontWeight: 700,
              fontSize: 15, fontFamily: "inherit", padding: "9px 20px 12px", cursor: "pointer",
            }}>{label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{
          background: "none", border: 0, color: T.navMore, fontSize: 14.5,
          fontFamily: "inherit", padding: "0 4px 12px", cursor: "pointer",
        }}>More ▾</button>
      </div>

      {/* ---------- Page header ---------- */}
      <div style={{
        background: "#fff", borderBottom: `1px solid ${T.lineHead}`,
        padding: "16px 22px 14px", display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 3, background: T.green,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 13, height: 13, border: `2px solid ${T.gold}`, borderRadius: 1 }} />
        </div>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "1.4px", color: T.muted4, fontWeight: 700 }}>
            HOME
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h1 style={{ margin: "1px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: "-.2px" }}>
              {greeting(now)}, Miriam
            </h1>
            <span style={{ fontSize: 13, color: T.muted3 }}>
              {dateLabel} · {timeLabel} Brooklyn
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="yb-btn-primary" style={primaryBtn}>+ New Request</button>
          <button className="yb-btn-secondary" style={secondaryBtn}>+ New Client</button>
          <button className="yb-btn-secondary" style={secondaryBtn}>Retrieve PNR</button>
          <button className="yb-btn-secondary" style={secondaryBtn}>Export ▾</button>
        </div>
      </div>

      {/* ---------- Metric tiles ---------- */}
      <div style={{ padding: "16px 22px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {TILES.map((t) => {
            const on = activeTile === t.key;
            return (
              <button key={t.key} className="yb-tile"
                onClick={() => setActiveTile(on ? null : t.key)}
                style={{
                  border: `1px solid ${on ? T.green : T.line}`,
                  borderRadius: 2, background: "#fff", textAlign: "left",
                  padding: "12px 14px", cursor: "pointer", fontFamily: "inherit",
                  boxShadow: on ? `inset 0 -3px 0 ${T.green}` : "none",
                }}>
                <div style={{
                  fontSize: 30, fontWeight: 900, lineHeight: 1,
                  color: t.urgent ? T.red : T.green,
                  fontVariantNumeric: "tabular-nums",
                }}>{t.n}</div>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: "1.1px",
                  color: T.muted4, marginTop: 8,
                }}>{t.label}</div>
                <div style={{ fontSize: 12.5, color: T.muted3, marginTop: 3 }}>{t.sub}</div>
              </button>
            );
          })}
        </div>
        {activeTile && (
          <div style={{ fontSize: 12.5, color: T.muted3, marginTop: 8 }}>
            Opens <span style={{ fontWeight: 700, color: T.muted }}>
              /requests?view={activeTile}</span> — saved views are URL-addressable.
          </div>
        )}
      </div>

      {/* ---------- Body ---------- */}
      <div style={{
        padding: "16px 22px 0", display: "grid",
        gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start",
      }}>
        {/* ---- Left column ---- */}
        <div>
          <Panel title="REQUIRES YOUR ATTENTION NOW" right="open all requests">
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: T.tableHead }}>
                  <th style={{ ...th(), width: 104, paddingLeft: 14 }}>Request #</th>
                  <th style={{ ...th(), width: 130 }}>Client</th>
                  <th style={{ ...th(), width: 120 }}>Trip</th>
                  <th style={{ ...th(), width: 150 }}>Stage</th>
                  <th style={th(true)}>Due</th>
                  <th style={{ ...th(true), width: 64, paddingRight: 14 }}>Agent</th>
                </tr>
              </thead>
              <tbody>
                {URGENT.map((r) => {
                  const hovered = hoverRow === r.id;
                  const text = r.liveIn
                    ? `${r.prefix} ${countdown(r.liveIn - elapsed)}`
                    : r.deadline;
                  return (
                    <tr key={r.id}
                      onMouseEnter={() => setHoverRow(r.id)}
                      onMouseLeave={() => setHoverRow(null)}
                      style={{ background: hovered ? T.rowHover : "#fff", cursor: "pointer" }}>
                      <td style={{ ...td, paddingLeft: 14 }}>
                        <a href="#" className="yb-link" onClick={(e) => e.preventDefault()}>
                          {r.id}
                        </a>
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>{r.client}</td>
                      <td style={{ ...td, color: T.ink2 }}>{r.trip}</td>
                      <td style={{ ...td, color: T.ink2 }}>{r.stage}</td>
                      <td style={{
                        ...td, textAlign: "right",
                        color: r.alert ? T.red : T.muted,
                        fontWeight: r.alert ? 700 : 400,
                      }}>{text}</td>
                      <td style={{
                        ...td, textAlign: "right", color: T.muted3, paddingRight: 14,
                      }}>{r.agent}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          {/* ---- WhatsApp intake ---- */}
          <Panel
            title="WHATSAPP INTAKE — PASTE A CLIENT MESSAGE"
            right="AI-assisted · every draft reviewed before saving"
            pad
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Paste the client's WhatsApp message here…"
              style={{
                width: "100%", border: `1px solid ${T.lineBtn}`, borderRadius: 2,
                padding: "8px 10px", fontSize: 14, fontFamily: "inherit",
                color: T.ink, outline: "none", resize: "vertical",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => { setExtracted(extractFromMessage(draft)); setSaved(false); }}
                disabled={!draft.trim()}
                className={draft.trim() ? "yb-btn-primary" : undefined}
                style={draft.trim() ? primaryBtn : {
                  ...primaryBtn, background: "#dcdcd2",
                  border: `1px solid ${T.lineBtn}`, color: T.muted5, cursor: "default",
                }}
              >Extract details</button>
              <button className="yb-btn-secondary" style={secondaryBtn}
                onClick={() => { setDraft(SAMPLE); setExtracted(null); setSaved(false); }}>
                Use sample message
              </button>
              <button className="yb-btn-secondary" style={secondaryBtn}
                onClick={() => { setDraft(""); setExtracted(null); setSaved(false); }}>
                Clear
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, color: T.muted3 }}>
                Credentials, card and passport data are removed before extraction.
              </span>
            </div>

            {extracted && (
              <div style={{ marginTop: 14, border: `1px solid ${T.line}`, borderRadius: 2 }}>
                <div style={{
                  background: T.tableHead, borderBottom: `1px solid ${T.line}`,
                  padding: "7px 12px", fontSize: 11.5, fontWeight: 700,
                  letterSpacing: "1.1px", color: T.panelHeadText,
                }}>DRAFT RECORD — REVIEW BEFORE SAVING</div>

                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px 20px", padding: "12px",
                }}>
                  {[
                    ["Client", extracted.client],
                    ["Origin", extracted.origin && `${extracted.origin} — ${AIRPORTS[extracted.origin]}`],
                    ["Destination", extracted.destination && `${extracted.destination} — ${AIRPORTS[extracted.destination]}`],
                    ["Dates", extracted.dates.length ? extracted.dates.join(" – ") : null],
                    ["Travellers", extracted.pax],
                    ["Cabin", extracted.cabin],
                    ["Flexibility", extracted.flexible ? "Flexible dates indicated" : null],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: "1.1px", color: T.muted4,
                      }}>{k.toUpperCase()}</div>
                      <div style={{
                        fontSize: 14, marginTop: 2,
                        fontWeight: v ? 700 : 400,
                        color: v ? T.ink : T.muted5,
                        fontStyle: v ? "normal" : "italic",
                      }}>{v || "not found"}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  borderTop: `1px solid ${T.lineSoft}`, background: "#fdf7e8",
                  padding: "9px 12px",
                }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: "1.1px",
                    color: T.goldText, marginBottom: 3,
                  }}>MISSING BEFORE ONBOARDING CAN BE COMPLETED</div>
                  <div style={{ fontSize: 14, color: T.ink2 }}>
                    {extracted.missing.join(" · ")}
                  </div>
                </div>

                <div style={{
                  borderTop: `1px solid ${T.lineSoft}`, padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <button className="yb-btn-primary" style={primaryBtn}
                    onClick={() => setSaved(true)}>Review &amp; save as draft request</button>
                  <button className="yb-btn-secondary" style={secondaryBtn}
                    onClick={() => setExtracted(null)}>Discard</button>
                  {saved && (
                    <span style={{ fontSize: 13.5, color: T.green, fontWeight: 700 }}>
                      Saved as R-10496 · assigned to M. Roth · awaiting missing information
                    </span>
                  )}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="TRAVELLING SOON" right="check-in and departure watch">
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: T.tableHead }}>
                  <th style={{ ...th(), width: 170, paddingLeft: 14 }}>Client</th>
                  <th style={{ ...th(), width: 120 }}>Trip</th>
                  <th style={{ ...th(), width: 90 }}>Flight</th>
                  <th style={{ ...th(), width: 130 }}>Departs (local)</th>
                  <th style={{ ...th(), paddingRight: 14 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {DEPARTURES.map((d) => {
                  const hovered = hoverRow === d.client;
                  return (
                    <tr key={d.client}
                      onMouseEnter={() => setHoverRow(d.client)}
                      onMouseLeave={() => setHoverRow(null)}
                      style={{ background: hovered ? T.rowHover : "#fff", cursor: "pointer" }}>
                      <td style={{ ...td, paddingLeft: 14, fontWeight: 700 }}>
                        {d.client}
                        <span style={{ fontWeight: 400, color: T.muted5 }}> · {d.pax} pax</span>
                      </td>
                      <td style={{ ...td, color: T.ink2 }}>{d.trip}</td>
                      <td style={{ ...td, color: T.ink2 }}>{d.flight}</td>
                      <td style={{ ...td, color: T.ink2, fontVariantNumeric: "tabular-nums" }}>
                        {d.local}
                      </td>
                      <td style={{
                        ...td, paddingRight: 14, color: levelColour(d.level),
                        fontWeight: d.level === "urgent" || d.level === "warn" ? 700 : 400,
                      }}>{d.state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* ---- Right column ---- */}
        <div>
          <Panel title="ALERTS" right={`${ALERTS.filter(a => a.level === "urgent").length} urgent`}>
            {ALERTS.map((a, i) => (
              <div key={i} style={{
                borderBottom: i < ALERTS.length - 1 ? `1px solid ${T.lineRow}` : "none",
                padding: "9px 14px", display: "flex", gap: 8, fontSize: 13.5,
              }}>
                <span style={{ color: levelColour(a.level), fontWeight: 700 }}>●</span>
                <span style={{ color: T.ink2 }}>{a.text}</span>
              </div>
            ))}
          </Panel>

          <Panel title="YOUR QUEUE" right="18 assigned">
            {QUEUE.map((q, i) => (
              <div key={q.stage} style={{
                borderBottom: i < QUEUE.length - 1 ? `1px solid ${T.lineRow}` : "none",
                padding: "8px 14px", display: "flex", alignItems: "center",
                gap: 10, fontSize: 13.5,
              }}>
                <span style={{ width: 130, color: T.ink2 }}>{q.stage}</span>
                <span style={{ flex: 1, background: T.lineRow, height: 10, borderRadius: 1 }}>
                  <span style={{
                    display: "block", height: 10, borderRadius: 1,
                    width: `${(q.n / 7) * 100}%`, background: T.green,
                  }} />
                </span>
                <span style={{
                  width: 20, textAlign: "right", fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}>{q.n}</span>
              </div>
            ))}
          </Panel>

          <Panel title="RECENT ACTIVITY" right="audit trail">
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{
                borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${T.lineRow}` : "none",
                padding: "8px 14px", fontSize: 13.5, color: T.ink2,
              }}>
                <span style={{
                  color: T.muted5, fontVariantNumeric: "tabular-nums",
                }}>{a.at}</span>{" "}
                <span style={{ fontWeight: 700, color: T.ink }}>{a.who}</span>{" "}
                {a.what}
              </div>
            ))}
          </Panel>
        </div>
      </div>

      {/* ---------- System status ---------- */}
      <div style={{ padding: "0 22px 26px" }}>
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 2, background: "#fff" }}>
          <div style={{
            background: T.panelHead, borderBottom: `1px solid ${T.line}`, padding: "8px 14px",
            fontSize: 11.5, fontWeight: 700, letterSpacing: "1.1px", color: T.panelHeadText,
          }}>SYSTEM STATUS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
            {STATUS.map(([name, state, detail, level], i) => (
              <div key={name} style={{
                padding: "11px 14px",
                borderRight: i < STATUS.length - 1 ? `1px solid ${T.lineRow}` : "none",
              }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: "1.1px", color: T.muted4,
                }}>{name.toUpperCase()}</div>
                <div style={{
                  fontSize: 14, fontWeight: 700, marginTop: 3,
                  color: level === "warn" ? T.amber : T.green,
                }}>{state}</div>
                <div style={{ fontSize: 12.5, color: T.muted3 }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
