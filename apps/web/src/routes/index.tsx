import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { Panel } from "../components/AppShell/Panel";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  ALERTS, DEPARTURES, QUEUE, TILES, URGENT,
  type Departure,
} from "../data/homeData";
import { NAV_TABS } from "../lib/navTabs";
import { countdown, greeting } from "../lib/time";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type Level = Departure["level"] | "info";

const levelColour = (l: Level) =>
  l === "urgent" ? "text-yb-red" : l === "warn" ? "text-yb-amber" : l === "done" ? "text-yb-muted5" : "text-yb-ink2";

function HomePage() {
  const [now, setNow] = useState(() => new Date());
  const [mountedAt] = useState(() => Date.now());
  const [activeTile, setActiveTile] = useState<string | null>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = now.getTime() - mountedAt;

  const dateLabel = useMemo(
    () => now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    [now],
  );
  const timeLabel = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="min-w-[1280px] bg-[#f7f7f2] text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      {/* Page header */}
      <div className="flex items-center gap-[14px] border-b border-yb-line-head bg-white px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">HOME</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">
              {greeting(now)}, Miriam
            </h1>
            <span className="text-[13px] text-yb-muted3">
              {dateLabel} · {timeLabel} Brooklyn
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <PrimaryButton>+ New Request</PrimaryButton>
          <SecondaryButton>+ New Client</SecondaryButton>
          <SecondaryButton>Retrieve PNR</SecondaryButton>
          <SecondaryButton>Export ▾</SecondaryButton>
        </div>
      </div>

      {/* Metric tiles */}
      <div className="px-[22px] pt-[16px]">
        <div className="grid grid-cols-6 gap-3">
          {TILES.map((tile) => {
            const on = activeTile === tile.key;
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => setActiveTile(on ? null : tile.key)}
                className={`rounded-yb border bg-white px-[14px] py-3 text-left ${
                  on ? "border-yb-green shadow-[inset_0_-3px_0_var(--color-yb-green)]" : "border-yb-line hover:border-yb-muted5"
                }`}
              >
                <div
                  className={`text-[30px] leading-none font-black tabular-nums ${
                    tile.urgent ? "text-yb-red" : "text-yb-green"
                  }`}
                >
                  {tile.n}
                </div>
                <div className="mt-2 text-[10.5px] font-bold tracking-[1.1px] text-yb-muted4">
                  {tile.label}
                </div>
                <div className="mt-[3px] text-[12.5px] text-yb-muted3">{tile.sub}</div>
              </button>
            );
          })}
        </div>
        {activeTile && (
          <div className="mt-2 text-[12.5px] text-yb-muted3">
            Opens <span className="font-bold text-yb-muted">/requests?view={activeTile}</span> — saved
            views are URL-addressable.
          </div>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[3fr_2fr] items-start gap-4 px-[22px] pt-4 pb-[26px]">
        {/* Left column — urgent, act-now content */}
        <div>
          <Panel title="REQUIRES YOUR ATTENTION NOW" right="open all requests">
            {/* Same reasoning as Travelling Soon's wrapper below: scroll rather
                than let Due wrap into unreadable fragments at the 1280px floor. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-collapse">
                <thead>
                  <tr className="bg-yb-table-head">
                    <th className="w-[104px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left text-[14px] font-bold text-yb-muted">
                      Request #
                    </th>
                    <th className="w-[130px] border-b border-yb-line px-2 py-[7px] text-left text-[14px] font-bold text-yb-muted">
                      Client
                    </th>
                    <th className="w-[120px] border-b border-yb-line px-2 py-[7px] text-left text-[14px] font-bold text-yb-muted">
                      Trip
                    </th>
                    <th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left text-[14px] font-bold text-yb-muted">
                      Stage
                    </th>
                    <th className="border-b border-yb-line px-2 py-[7px] text-right text-[14px] font-bold text-yb-muted">
                      Due
                    </th>
                    <th className="w-[64px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right text-[14px] font-bold text-yb-muted">
                      Agent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {URGENT.map((r) => {
                    const hovered = hoverRow === r.id;
                    const text = r.liveIn ? `${r.prefix} ${countdown(r.liveIn - elapsed)}` : r.deadline;
                    return (
                      <tr
                        key={r.id}
                        onMouseEnter={() => setHoverRow(r.id)}
                        onMouseLeave={() => setHoverRow(null)}
                        className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                      >
                        <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px]">
                          <a href="#" onClick={(e) => e.preventDefault()} className="text-yb-green underline">
                            {r.id}
                          </a>
                        </td>
                        <td className="border-b border-yb-line-row px-2 py-[11px] font-bold">{r.client}</td>
                        <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{r.trip}</td>
                        <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{r.stage}</td>
                        <td className="border-b border-yb-line-row px-2 py-[11px] text-right">
                          <span className={r.alert ? "font-bold text-yb-red" : "text-yb-muted"}>{text}</span>
                        </td>
                        <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right text-yb-muted3">
                          {r.agent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="ALERTS" right={`${ALERTS.filter((a) => a.level === "urgent").length} urgent`}>
            {ALERTS.map((a, i) => (
              <div
                key={a.text}
                className={`flex gap-2 px-[14px] py-[9px] text-[13.5px] ${
                  i < ALERTS.length - 1 ? "border-b border-yb-line-row" : ""
                }`}
              >
                <span className={`font-bold ${levelColour(a.level)}`}>●</span>
                <span className="text-yb-ink2">{a.text}</span>
              </div>
            ))}
          </Panel>
        </div>

        {/* Right column — ongoing tracking content */}
        <div>
          <Panel title="TRAVELLING SOON" right="check-in and departure watch">
            {/* This column is narrower than the table's comfortable width at the
                tool's 1280px floor — scroll here rather than squeeze Status text
                into unreadable fragments. Not an issue above ~1450px. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] table-fixed border-collapse">
                <thead>
                  <tr className="bg-yb-table-head">
                    <th className="w-[170px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left text-[14px] font-bold text-yb-muted">
                      Client
                    </th>
                    <th className="w-[120px] border-b border-yb-line px-2 py-[7px] text-left text-[14px] font-bold text-yb-muted">
                      Trip
                    </th>
                    <th className="w-[90px] border-b border-yb-line px-2 py-[7px] text-left text-[14px] font-bold text-yb-muted">
                      Flight
                    </th>
                    <th className="w-[130px] border-b border-yb-line px-2 py-[7px] text-left text-[14px] font-bold text-yb-muted">
                      Departs (local)
                    </th>
                    <th className="border-b border-yb-line py-[7px] pr-[14px] pl-2 text-left text-[14px] font-bold text-yb-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTURES.map((d) => {
                    const hovered = hoverRow === d.client;
                    return (
                      <tr
                        key={d.client}
                        onMouseEnter={() => setHoverRow(d.client)}
                        onMouseLeave={() => setHoverRow(null)}
                        className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                      >
                        <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] font-bold">
                          {d.client}
                          <span className="font-normal text-yb-muted5"> · {d.pax} pax</span>
                        </td>
                        <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{d.trip}</td>
                        <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{d.flight}</td>
                        <td className="border-b border-yb-line-row px-2 py-[11px] tabular-nums text-yb-ink2">
                          {d.local}
                        </td>
                        <td
                          className={`border-b border-yb-line-row py-[11px] pr-[14px] pl-2 ${levelColour(d.level)} ${
                            d.level === "urgent" || d.level === "warn" ? "font-bold" : ""
                          }`}
                        >
                          {d.state}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="YOUR QUEUE" right="18 assigned">
            {QUEUE.map((q, i) => (
              <div
                key={q.stage}
                className={`flex items-center gap-[10px] px-[14px] py-2 text-[13.5px] ${
                  i < QUEUE.length - 1 ? "border-b border-yb-line-row" : ""
                }`}
              >
                <span className="w-[130px] text-yb-ink2">{q.stage}</span>
                <span className="h-[10px] flex-1 rounded-[1px] bg-yb-line-row">
                  <span
                    className="block h-[10px] rounded-[1px] bg-yb-green"
                    style={{ width: `${(q.n / 7) * 100}%` }}
                  />
                </span>
                <span className="w-5 text-right font-bold tabular-nums">{q.n}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
