import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { FilterStrip, type FilterOption } from "../components/AppShell/FilterStrip";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { ImplementationStatusIcon } from "../components/ImplementationStatusIcon";
import { COLS, FILTERS, GROUPS, money, type RequestGroup } from "../data/requestsData";
import { useAuth } from "../lib/AuthContext";
import { requestsApi, type TravelRequestRecord } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { countdown } from "../lib/time";
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/requests")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "requests.read")) throw redirect({ to: "/" });
  },
  component: RequestsPage,
});

const SORTS = [
  "Deadline, ascending",
  "Deadline, descending",
  "Fare, descending",
  "Client, A–Z",
] as const;
type SortOption = (typeof SORTS)[number];
const ALL_REQUESTS = "All Requests";
const ASSIGNED_TO_ME = "Assigned to Me";

const selectClass =
  "h-[28px] rounded-yb border border-yb-line-btn bg-white px-[6px] text-[13.5px] font-bold text-yb-ink";

function requestDeadline(request: TravelRequestRecord): string {
  const dueAt = request.serviceDueAt ?? request.responseDueAt;
  if (!dueAt) return "Not configured";
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "Not configured";
  const label = request.serviceDueAt ? "Service due" : "Response due";
  return `${label} — ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function liveRequestGroup(
  requests: TravelRequestRecord[],
  key = "live-requests",
  title = "LIVE REQUESTS",
): RequestGroup | null {
  if (requests.length === 0) return null;
  return {
    key,
    label: `${title} — ${requests.length} ${requests.length === 1 ? "REQUEST" : "REQUESTS"}`,
    items: requests.map((request) => ({
      id: request.requestNumber,
      requestId: request.id,
      client: request.clientName,
      trip: request.tripSummary,
      stage: request.requestStatusName,
      waitWho: "Us",
      waitWhat: request.requestTypeName,
      fareText: "—",
      deadline: requestDeadline(request),
      agent: request.assignedUserName ?? "—",
    })),
  };
}

function RequestsPage() {
  const { user, can } = useAuth();
  const params = useParams({ strict: false }) as { requestId?: string };
  const navigate = useNavigate();
  const [filter, setFilter] = useState(ALL_REQUESTS);
  const [view, setView] = useState(ALL_REQUESTS);
  const [sort, setSort] = useState<SortOption>("Deadline, ascending");
  const [show, setShow] = useState("50");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [mountedAt] = useState(() => Date.now());
  const [, setTick] = useState(0);
  const requestsQuery = useQuery({
    queryKey: ["requests"],
    queryFn: requestsApi.list,
  });

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Date.now() - mountedAt;
  const liveRequests = requestsQuery.data ?? [];
  const assignedToMeRequests = liveRequests.filter((request) => request.assignedUserId === user?.id);
  const unassignedRequests = liveRequests.filter((request) => request.assignedUserId === null);
  const previewFilterStatus = {
    label: "Not implemented",
    description: "This workflow view currently shows demonstration data, not live requests.",
  };
  const workflowFilters: FilterOption[] = FILTERS.map(([label, count]) =>
    label === "Unassigned" ? [label, unassignedRequests.length] : [label, count, previewFilterStatus],
  );
  const requestFilters: FilterOption[] = [
    [ALL_REQUESTS, liveRequests.length],
    [ASSIGNED_TO_ME, assignedToMeRequests.length],
    ...workflowFilters,
  ];

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const liveGroup = liveRequestGroup(liveRequests);
    const assignedToMeGroup = liveRequestGroup(assignedToMeRequests, "assigned-to-me", "ASSIGNED TO ME");
    const unassignedGroup = liveRequestGroup(unassignedRequests, "unassigned-live", "UNASSIGNED REQUESTS");
    const sourceGroups = q
      ? liveGroup ? [liveGroup, ...GROUPS] : GROUPS
      : filter === ALL_REQUESTS
        ? liveGroup ? [liveGroup] : []
        : filter === ASSIGNED_TO_ME
          ? assignedToMeGroup ? [assignedToMeGroup] : []
          : filter === "Unassigned"
            ? unassignedGroup ? [unassignedGroup] : []
        : GROUPS;
    return sourceGroups.map((g) => {
      let items = g.items.map((r, i) => ({
        ...r,
        _k: i,
        fareText: r.fareText ?? (r.fare !== undefined ? money(r.fare) : ""),
      }));
      if (q) {
        items = items.filter((r) =>
          [r.id, r.client, r.trip, r.stage, r.waitWho, r.waitWhat, r.fareText, r.deadline, r.agent]
            .join(" ")
            .toLowerCase()
            .includes(q),
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
  }, [assignedToMeRequests, filter, liveRequests, query, sort, unassignedRequests]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  if (params.requestId) return <Outlet />;

  return (
    <div className="min-h-screen min-w-[1280px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      <FilterStrip
        filters={requestFilters}
        active={filter}
        onChange={(label) => {
          setFilter(label);
          setView(label);
          setQuery("");
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
            <h1 className="mt-[1px] yb-page-title">{filter}</h1>
            <span className="text-[13px] text-yb-muted3">
              {requestsQuery.isLoading
                ? "Loading live requests…"
                : filter === ALL_REQUESTS
                  ? `${liveRequests.length} real ${liveRequests.length === 1 ? "request" : "requests"}`
                  : filter === ASSIGNED_TO_ME
                    ? `${assignedToMeRequests.length} assigned to you`
                    : filter === "Unassigned"
                      ? `${unassignedRequests.length} awaiting assignment`
                  : "Demonstration workflow view"}
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          {can("requests.create") && <PrimaryButton className="group/status-parent flex items-center gap-[7px]" aria-disabled="true">+ New Request <ImplementationStatusIcon label="Coming in Phase 2" description="Create requests from Inbox for now. Standalone request creation is not implemented yet." withinInteractiveControl /></PrimaryButton>}
          {(can("requests.assign_self") || can("requests.assign_any")) && <SecondaryButton className="group/status-parent flex items-center gap-[7px]" aria-disabled="true">Assign… <ImplementationStatusIcon label="Not implemented here" description="Assignment is available from an individual request, not as a bulk action yet." withinInteractiveControl /></SecondaryButton>}
          <SecondaryButton className="group/status-parent flex items-center gap-[7px]" aria-disabled="true">Print <ImplementationStatusIcon label="Not implemented" description="Printing this queue is not available yet." withinInteractiveControl /></SecondaryButton>
          <SecondaryButton className="group/status-parent flex items-center gap-[7px]" aria-disabled="true">Export ▾ <ImplementationStatusIcon label="Not implemented" description="Request export is not available yet." withinInteractiveControl /></SecondaryButton>
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
              setQuery("");
            }}
            className={selectClass}
          >
            {requestFilters.map(([l]) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <span className="flex items-center gap-[5px] text-[13px] text-yb-muted3">Edit <ImplementationStatusIcon label="Not implemented" description="Custom view editing is not available yet." /></span>
          <span className="flex items-center gap-[5px] text-[13px] text-yb-muted3">Create New View <ImplementationStatusIcon label="Not implemented" description="Creating custom request views is not available yet." /></span>

          <div className="flex-1" />

          <div className="flex h-[28px] w-[280px] items-center border border-yb-line-btn bg-white">
            <span className="px-[8px] text-[13px] text-yb-muted4" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests"
              aria-label="Search requests"
              className="min-w-0 flex-1 bg-transparent pr-[7px] text-[13px] text-yb-ink outline-none placeholder:text-yb-muted4"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="h-full border-l border-yb-line-soft px-[8px] text-[11px] font-bold text-yb-muted3 hover:bg-yb-row-hover"
                aria-label="Clear request search"
              >
                Clear
              </button>
            )}
          </div>

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
                const deadlineText = r.liveIn
                  ? `${r.deadlinePrefix} ${countdown(r.liveIn - elapsed)}`
                  : r.deadline;
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={() => setHoverRow(r.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    onClick={() => navigate({
                      to: "/requests/$requestId",
                      params: { requestId: r.requestId ? String(r.requestId) : r.id },
                    })}
                    className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                  >
                    <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px]">
                      <Link
                        to="/requests/$requestId"
                        params={{ requestId: r.requestId ? String(r.requestId) : r.id }}
                        onClick={(event) => event.stopPropagation()}
                        className="text-yb-green underline"
                      >
                        {r.id}
                      </Link>
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
            {requestsQuery.isError
              ? "Live requests could not be loaded. Please retry after checking the API connection."
              : <>No requests match &ldquo;{query}&rdquo;.</>}
          </div>
        )}
      </div>
    </div>
  );
}
