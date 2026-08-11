import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { FilterStrip } from "../components/AppShell/FilterStrip";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { COLS, FILTERS, GROUPS, money } from "../data/requestsData";
import { NAV_TABS } from "../lib/navTabs";
import { countdown } from "../lib/time";

export const Route = createFileRoute("/requests")({
  component: RequestsPage,
});

const SORTS = [
  "Deadline, ascending",
  "Deadline, descending",
  "Fare, descending",
  "Client, A–Z",
] as const;
type SortOption = (typeof SORTS)[number];

const selectClass =
  "h-[28px] rounded-yb border border-yb-line-btn bg-white px-[6px] text-[13.5px] font-bold text-yb-ink";

function RequestsPage() {
  const [filter, setFilter] = useState("Needs Action Today");
  const [view, setView] = useState("Needs Action Today");
  const [sort, setSort] = useState<SortOption>("Deadline, ascending");
  const [show, setShow] = useState("50");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
        fareText: r.fareText ?? (r.fare !== undefined ? money(r.fare) : ""),
      }));
      if (q) {
        items = items.filter((r) =>
          [r.id, r.client, r.trip, r.stage, r.waitWhat].join(" ").toLowerCase().includes(q),
        );
      }
      if (sort === "Fare, descending") {
        items = [...items].sort((a, b) => (b.fare ?? 0) - (a.fare ?? 0));
      } else if (sort === "Deadline, descending") {
        items = [...items].sort((a, b) => b._k - a._k);
      } else if (sort === "Client, A–Z") {
        items = [...items].sort((a, b) => a.client.localeCompare(b.client));
      }
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [query, sort]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      <FilterStrip
        filters={FILTERS}
        active={filter}
        onChange={(label) => {
          setFilter(label);
          setView(label);
        }}
      />

      {/* Page header */}
      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">REQUESTS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">{filter}</h1>
            <span className="text-[13px] text-yb-muted3">48 open · 9 due today</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <PrimaryButton>+ New Request</PrimaryButton>
          <SecondaryButton>Assign…</SecondaryButton>
          <SecondaryButton>Print</SecondaryButton>
          <SecondaryButton>Export ▾</SecondaryButton>
        </div>
      </div>

      {/* Panel */}
      <div className="mx-[22px] mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            REQUESTS — {filter.toUpperCase()}
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{total} items</div>
        </div>

        {/* toolbar */}
        <div className="flex items-center gap-[10px] border-b border-yb-line-soft bg-yb-toolbar px-[14px] py-[9px]">
          <span className="text-[13px] text-yb-muted">View:</span>
          <select
            value={view}
            onChange={(e) => {
              setView(e.target.value);
              setFilter(e.target.value);
            }}
            className={selectClass}
          >
            {FILTERS.map(([l]) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] text-yb-green underline">
            Edit
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] text-yb-green underline">
            Create New View
          </a>

          <div className="flex-1" />

          <span className="text-[13px] text-yb-muted">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className={selectClass}
          >
            {SORTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <span className="text-[13px] text-yb-muted">Show:</span>
          <select value={show} onChange={(e) => setShow(e.target.value)} className={selectClass}>
            <option>50</option>
            <option>100</option>
          </select>
        </div>

        {/* table */}
        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              {COLS.map((c, i) => (
                <th
                  key={c.key}
                  style={c.w ? { width: c.w } : undefined}
                  className={`border-b border-yb-line py-[7px] font-bold text-yb-muted ${
                    c.right ? "text-right" : "text-left"
                  } ${
                    i === 0
                      ? "pr-2 pl-[14px]"
                      : i === COLS.length - 1
                        ? "pr-[14px] pl-2"
                        : "px-2"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          {groups.map((g) => (
            <tbody key={g.key}>
              <tr className="bg-yb-table-head">
                <td
                  colSpan={8}
                  className="px-[14px] py-[6px] text-[12px] font-bold tracking-[0.9px]"
                  style={{
                    borderTop: "1px solid var(--color-yb-line)",
                    borderBottom: "1px solid var(--color-yb-line-soft2)",
                  }}
                >
                  <span className={g.urgent ? "text-yb-red-group" : "text-yb-muted3"}>{g.label}</span>
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
                    className={`cursor-pointer ${
                      isSel ? "bg-[#eef3ee]" : hovered ? "bg-yb-row-hover" : "bg-white"
                    }`}
                  >
                    <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px]">
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-yb-green underline">
                        {r.id}
                      </a>
                    </td>
                    <td className="border-b border-yb-line-row px-2 py-[11px] font-bold">{r.client}</td>
                    <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{r.trip}</td>
                    <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{r.stage}</td>
                    <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-muted2">
                      <span className="text-yb-muted5">{r.waitWho}</span> · {r.waitWhat}
                    </td>
                    <td className="border-b border-yb-line-row px-2 py-[11px] text-right tabular-nums text-yb-ink">
                      {r.fareText}
                    </td>
                    <td className="border-b border-yb-line-row px-2 py-[11px] text-right">
                      <span className={r.alert ? "font-bold text-yb-red" : "text-yb-muted"}>
                        {deadlineText}
                      </span>
                    </td>
                    <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right text-yb-muted3">
                      {r.agent}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>

        {total === 0 && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            No requests match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
