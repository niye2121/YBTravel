import { useState, useEffect, useMemo, Fragment } from "react";

/* ------------------------------------------------------------------
   YB Travel — Requests / Needs Action Today

   Built to the approved design (Requests Queue standalone HTML):
   Lato, exact palette, 2px radii, fixed column widths, no shadows.

   Workbook items: P1-21 (all open requests in one place),
   P1-12 (reminders and next required action), P1-10 (ownership).
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
  red: "#b3261e", redGroup: "#9c2b1c",
  font: "'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
};

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/* --- Data ---------------------------------------------------------- */
/* liveIn: milliseconds remaining, drives the countdown in the label.
   Rows without liveIn use their static deadline string.              */

const GROUPS = [
  {
    key: "today",
    label: "DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS",
    urgent: true,
    items: [
      { id: "R-10482", client: "Kaplan", trip: "JFK → TLV · 14 Aug – 2 Sep",
        stage: "Ready to issue", waitWho: "Us", waitWhat: "ticketing limit, EL AL",
        fare: 4187.36, agent: "SR", alert: true,
        deadlinePrefix: "Ticketing limit — today 3:20 PM, TTL", liveIn: 2 * HOUR + 51 * MIN },
      { id: "R-10467", client: "Mizrahi", trip: "EWR → TLV · 3 Oct – 21 Oct",
        stage: "Proposal sent", waitWho: "Client", waitWhat: "no answer 2 days",
        fare: 9240, agent: "RV", alert: true,
        deadlinePrefix: "Hold expires — today 4:15 PM, Hold", liveIn: 4 * HOUR + 12 * MIN },
      { id: "R-10455", client: "Friedman", trip: "TLV → JFK · 28 Aug",
        stage: "Paid", waitWho: "Us", waitWhat: "issue when ready",
        fare: 11904, agent: "YN", deadline: "Ticketing limit — tomorrow 9:00 AM" },
      { id: "R-10402", client: "Weiss", trip: "JFK → TLV · 12 Sep – 30 Sep",
        stage: "Waiting for info", waitWho: "Client", waitWhat: "passport, Ariel (12)",
        fareText: "~$5,900", agent: "SR", alert: true,
        deadline: "Follow up — overdue 2 days" },
      { id: "R-10471", client: "Katz", trip: "LAX → TLV · 9 Sep – 24 Sep",
        stage: "Payment pending", waitWho: "Client", waitWhat: "invoice sent",
        fare: 6720, agent: "RV", deadline: "Hold expires — tomorrow 11:00 AM" },
      { id: "R-10486", client: "Gross", trip: "MIA → TLV · 2 Sep – 18 Sep",
        stage: "Ready to issue", waitWho: "Us", waitWhat: "supervisor approval, markup",
        fare: 8630, agent: "SR", alert: true,
        deadlinePrefix: "Ticketing limit — today 5:00 PM, TTL", liveIn: 3 * HOUR + 40 * MIN },
      { id: "R-10493", client: "Rosenberg", trip: "JFK → TLV · 20 Aug – 4 Sep",
        stage: "Quoted", waitWho: "Client", waitWhat: "reviewing options",
        fare: 7410, agent: "MR", deadline: "Follow up — today 6:00 PM" },
      { id: "R-10478", client: "Lieberman", trip: "EWR → TLV · 11 Sep",
        stage: "Waiting for info", waitWho: "Client", waitWhat: "DOB, two travellers",
        fareText: "—", agent: "YN", deadline: "Follow up — today 8:00 PM" },
      { id: "R-10495", client: "Shapiro", trip: "ORD → TLV · 29 Dec – 12 Jan",
        stage: "New inquiry", waitWho: "Us", waitWhat: "not yet entered",
        fareText: "—", agent: "—", deadline: "Follow up — today 10:00 PM" },
    ],
  },
  {
    key: "tomorrow",
    label: "DUE TOMORROW — 6 REQUESTS",
    items: [
      { id: "R-10388", client: "Berkowitz", trip: "EWR → TLV · 1 Apr – 20 Apr",
        stage: "Quoted", waitWho: "Client", waitWhat: "no response 4 days",
        fare: 8155, agent: "MR", deadline: "Follow up — stale" },
      { id: "R-10440", client: "Schwartz", trip: "JFK → TLV · 18 Aug",
        stage: "Ticketed", waitWho: "Us", waitWhat: "check-in opens 6h",
        fare: 2340, agent: "YN", deadline: "Check-in opens — today 10:00 PM" },
      { id: "R-10490", client: "Adler", trip: "BOS → TLV · 22 Dec – 5 Jan",
        stage: "New inquiry", waitWho: "Us", waitWhat: "not yet entered",
        fareText: "—", agent: "—", deadline: "Follow up — today" },
      { id: "R-10489", client: "Stern", trip: "ORD → TLV · 7 Sep – 21 Sep",
        stage: "Quoted", waitWho: "Client", waitWhat: "quote sent today",
        fare: 4905, agent: "SR", deadline: "Follow up — tomorrow" },
      { id: "R-10476", client: "Gross", trip: "MIA → TLV · 2 Nov – 19 Nov",
        stage: "Proposal sent", waitWho: "Client", waitWhat: "choosing dates",
        fare: 5480, agent: "MR", deadline: "Follow up — tomorrow" },
      { id: "R-10461", client: "Halberstam", trip: "JFK → TLV · 25 Sep – 12 Oct",
        stage: "Payment pending", waitWho: "Client", waitWhat: "awaiting wire",
        fare: 10480, agent: "RV", deadline: "Hold expires — tomorrow 3:00 PM" },
    ],
  },
];

const FILTERS = [
  ["Needs Action Today", 9], ["Needs Intake", 2], ["Waiting on Client", 5],
  ["Holds Expiring", 3], ["Fare Watches", 4], ["Ready to Issue", 2],
  ["Unassigned", 1],
];

const TABS = ["Requests", "Clients", "Travellers", "Bookings", "Tickets", "Reports"];

const COLS = [
  { key: "id", label: "Request #", w: 104 },
  { key: "client", label: "Client", w: 130 },
  { key: "trip", label: "Trip", w: 250 },
  { key: "stage", label: "Stage", w: 150 },
  { key: "waiting", label: "Waiting On", w: null },
  { key: "fare", label: "Fare", w: 110, right: true },
  { key: "deadline", label: "Deadline", w: 290, right: true },
  { key: "agent", label: "Agent", w: 64, right: true },
];

/* --- Helpers ------------------------------------------------------- */

const money = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function countdown(ms) {
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/* --- Component ----------------------------------------------------- */

export default function YBTravelRequests() {
  const [tab, setTab] = useState("Requests");
  const [filter, setFilter] = useState("Needs Action Today");
  const [view, setView] = useState("Needs Action Today");
  const [sort, setSort] = useState("Deadline, ascending");
  const [show, setShow] = useState("50");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mountedAt] = useState(() => Date.now());
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Date.now() - mountedAt;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((g) => {
      let items = g.items.map((r, i) => ({
        ...r,
        _k: i,
        fareText: r.fareText || money(r.fare),
      }));
      if (q) {
        items = items.filter((r) =>
          [r.id, r.client, r.trip, r.stage, r.waitWhat]
            .join(" ").toLowerCase().includes(q)
        );
      }
      if (sort === "Fare, descending") {
        items = [...items].sort((a, b) => (b.fare || 0) - (a.fare || 0));
      } else if (sort === "Deadline, descending") {
        items = [...items].sort((a, b) => b._k - a._k);
      } else if (sort === "Client, A–Z") {
        items = [...items].sort((a, b) => a.client.localeCompare(b.client));
      }
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [query, sort]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const cellBase = {
    padding: "11px 8px",
    borderBottom: `1px solid ${T.lineRow}`,
  };

  return (
    <div style={{ minWidth: 1280, color: T.ink, fontFamily: T.font, background: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap');
        .yb-link { color: ${T.green}; text-decoration: underline; }
        .yb-navlink { color: ${T.navText}; font-size: 13px; text-decoration: underline; }
        .yb-navlink:hover { color: #fff; }
        .yb-btn-primary:hover { background: ${T.greenHover} !important; }
        .yb-btn-secondary:hover { background: ${T.hoverBtn} !important; }
        .yb-btn-gold:hover { background: ${T.goldHover} !important; }
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, request number, or PNR"
            style={{
              width: 360, height: 28, border: `1px solid ${T.greenDarker}`, borderRadius: 2,
              padding: "0 9px", fontSize: 13.5, fontFamily: "inherit", background: "#fff",
              color: T.ink, outline: "none",
            }}
          />
          <button className="yb-btn-gold" style={{
            height: 30, padding: "0 20px", background: T.gold,
            border: `1px solid ${T.goldBorder}`, borderRadius: 2, color: T.goldText,
            fontWeight: 700, fontSize: 13.5, fontFamily: "inherit", cursor: "pointer",
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
          <button
            key={label}
            onClick={() => setTab(label)}
            style={tab === label ? {
              background: "#fff", border: 0, borderRadius: "3px 3px 0 0", color: T.green,
              fontWeight: 700, fontSize: 15, fontFamily: "inherit", padding: "9px 22px",
              cursor: "pointer",
            } : {
              background: "transparent", border: 0, color: T.navText, fontWeight: 700,
              fontSize: 15, fontFamily: "inherit", padding: "9px 20px 12px", cursor: "pointer",
            }}
          >{label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{
          background: "none", border: 0, color: T.navMore, fontSize: 14.5,
          fontFamily: "inherit", padding: "0 4px 12px", cursor: "pointer",
        }}>More ▾</button>
      </div>

      {/* ---------- Filter strip ---------- */}
      <div style={{
        borderBottom: `1px solid ${T.lineHead}`, background: "#fff", padding: "0 22px",
        display: "flex", alignItems: "stretch", gap: 26, height: 40,
      }}>
        {FILTERS.map(([label, count]) => {
          const active = filter === label;
          return (
            <button
              key={label}
              onClick={() => { setFilter(label); setView(label); }}
              style={{
                display: "flex", alignItems: "center", gap: 7, background: "none", border: 0,
                borderBottom: `3px solid ${active ? T.green : "transparent"}`,
                color: active ? "#12352a" : T.muted, fontWeight: active ? 700 : 400,
                fontSize: 14, fontFamily: "inherit", padding: "0 2px", cursor: "pointer",
                marginBottom: -1,
              }}
            >
              <span>{label}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: active ? T.goldCount : T.muted5,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ---------- Page header ---------- */}
      <div style={{ padding: "16px 22px 14px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 3, background: T.green,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 13, height: 13, border: `2px solid ${T.gold}`, borderRadius: 1 }} />
        </div>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "1.4px", color: T.muted4, fontWeight: 700 }}>
            REQUESTS
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h1 style={{ margin: "1px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: "-.2px" }}>
              {filter}
            </h1>
            <span style={{ fontSize: 13, color: T.muted3 }}>48 open · 9 due today</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="yb-btn-primary" style={{
            height: 34, padding: "0 18px", background: T.green,
            border: `1px solid ${T.greenDarker}`, borderRadius: 2, color: "#fff",
            fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
          }}>+ New Request</button>
          {["Assign…", "Print", "Export ▾"].map((l) => (
            <button key={l} className="yb-btn-secondary" style={{
              height: 34, padding: "0 16px", background: "#fff",
              border: `1px solid ${T.lineBtn}`, borderRadius: 2, color: T.ink2,
              fontSize: 14, fontFamily: "inherit", cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ---------- Panel ---------- */}
      <div style={{
        margin: "0 22px 26px", border: `1px solid ${T.line}`, borderRadius: 2, background: "#fff",
      }}>
        <div style={{
          background: T.panelHead, borderBottom: `1px solid ${T.line}`,
          padding: "8px 14px", display: "flex", alignItems: "center",
        }}>
          <div style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: "1.1px", color: T.panelHeadText,
          }}>REQUESTS — {filter.toUpperCase()}</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11.5, color: T.muted3 }}>{total} items</div>
        </div>

        {/* toolbar */}
        <div style={{
          padding: "9px 14px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: `1px solid ${T.lineSoft}`, background: T.toolbar,
        }}>
          <span style={{ fontSize: 13, color: T.muted }}>View:</span>
          <select value={view} onChange={(e) => { setView(e.target.value); setFilter(e.target.value); }}
            style={selectStyle}>
            {FILTERS.map(([l]) => <option key={l}>{l}</option>)}
          </select>
          <a href="#" className="yb-link" style={{ fontSize: 13 }}
             onClick={(e) => e.preventDefault()}>Edit</a>
          <a href="#" className="yb-link" style={{ fontSize: 13 }}
             onClick={(e) => e.preventDefault()}>Create New View</a>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 13, color: T.muted }}>Sort:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle}>
            <option>Deadline, ascending</option>
            <option>Deadline, descending</option>
            <option>Fare, descending</option>
            <option>Client, A–Z</option>
          </select>

          <span style={{ fontSize: 13, color: T.muted }}>Show:</span>
          <select value={show} onChange={(e) => setShow(e.target.value)} style={selectStyle}>
            <option>50</option>
            <option>100</option>
          </select>
        </div>

        {/* table */}
        <table style={{
          width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed",
        }}>
          <thead>
            <tr style={{ background: T.tableHead }}>
              {COLS.map((c, i) => (
                <th key={c.key} style={{
                  textAlign: c.right ? "right" : "left", fontWeight: 700, color: T.muted,
                  padding: i === 0 ? "7px 8px 7px 14px"
                    : i === COLS.length - 1 ? "7px 14px 7px 8px" : "7px 8px",
                  borderBottom: `1px solid ${T.line}`,
                  width: c.w ?? undefined,
                }}>{c.label}</th>
              ))}
            </tr>
          </thead>

          {groups.map((g) => (
            <tbody key={g.key}>
              <tr style={{ background: T.tableHead }}>
                <td colSpan={8} style={{
                  padding: "6px 14px", borderTop: `1px solid ${T.line}`,
                  borderBottom: `1px solid ${T.lineSoft2}`, fontSize: 12,
                  fontWeight: 700, letterSpacing: ".9px",
                }}>
                  <span style={{ color: g.urgent ? T.redGroup : T.muted3 }}>{g.label}</span>
                </td>
              </tr>

              {g.items.map((r) => {
                const hovered = hoverRow === r.id;
                const isSel = selected === r.id;
                const deadlineText = r.liveIn
                  ? `${r.deadlinePrefix} ${countdown(r.liveIn - elapsed)}`
                  : r.deadline;
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={() => setHoverRow(r.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    onClick={() => setSelected(isSel ? null : r.id)}
                    style={{
                      background: isSel ? "#eef3ee" : hovered ? T.rowHover : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ ...cellBase, padding: "11px 8px 11px 14px" }}>
                      <a href="#" className="yb-link" onClick={(e) => e.preventDefault()}>
                        {r.id}
                      </a>
                    </td>
                    <td style={{ ...cellBase, fontWeight: 700 }}>{r.client}</td>
                    <td style={{ ...cellBase, color: T.ink2 }}>{r.trip}</td>
                    <td style={{ ...cellBase, color: T.ink2 }}>{r.stage}</td>
                    <td style={{ ...cellBase, color: T.muted2 }}>
                      <span style={{ color: T.muted5 }}>{r.waitWho}</span> · {r.waitWhat}
                    </td>
                    <td style={{
                      ...cellBase, textAlign: "right",
                      fontVariantNumeric: "tabular-nums", color: T.ink,
                    }}>{r.fareText}</td>
                    <td style={{ ...cellBase, textAlign: "right" }}>
                      <span style={r.alert
                        ? { color: T.red, fontWeight: 700 }
                        : { color: T.muted }}>{deadlineText}</span>
                    </td>
                    <td style={{
                      ...cellBase, padding: "11px 14px 11px 8px",
                      textAlign: "right", color: T.muted3,
                    }}>{r.agent}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>

        {total === 0 && (
          <div style={{ padding: "28px 14px", textAlign: "center", color: T.muted3, fontSize: 14 }}>
            No requests match “{query}”.
          </div>
        )}
      </div>
    </div>
  );
}

const selectStyle = {
  height: 28, border: `1px solid ${T.lineBtn}`, borderRadius: 2, background: "#fff",
  fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: T.ink, padding: "0 6px",
};
