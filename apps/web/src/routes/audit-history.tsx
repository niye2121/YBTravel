import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { Fragment, useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { auditHistoryApi, type AuditHistoryFilters, type AuditHistoryItem } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";
import { useAuth } from "../lib/AuthContext";

const EMPTY_FILTERS: AuditHistoryFilters = {
  q: "", actorUserId: "", clientId: "", action: "", dateFrom: "", dateTo: "", importantOnly: false, page: 1,
};

export const Route = createFileRoute("/audit-history")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "audit.read")) throw redirect({ to: "/" });
  },
  component: AuditHistoryPage,
});

/** Converts a stored action code into a readable administrator label. */
function actionLabel(action: string): string {
  return action.replaceAll(".", " · ").replaceAll("_", " ");
}

function AuditChangeDetails({ item }: { item: AuditHistoryItem }) {
  return <section aria-label="Audit event details" className="overflow-hidden rounded-yb border border-yb-line bg-white">
    <div className="flex items-center justify-between gap-3 border-b border-yb-line bg-yb-panel-head px-[14px] py-[10px]">
      <h2 className="text-[11px] font-bold tracking-[1px] text-yb-panel-head-text">{item.eventKind === "access" ? "ACCESS DETAILS" : "CHANGE DETAILS"}</h2>
      <span className="text-[12px] text-yb-muted3">{actionLabel(item.action)}</span>
    </div>
    <table className="w-full table-fixed border-collapse text-[12px]">
      <thead><tr className="h-[30px] bg-yb-table-head text-yb-muted"><th scope="col" className="w-1/5 px-[12px] text-left">Field</th><th scope="col" className="px-[12px] text-left">Before</th><th scope="col" className="px-[12px] text-left">After</th></tr></thead>
      <tbody>{item.changes.map((change) => <tr key={change.field} className="border-t border-yb-line-row align-top">
        <th scope="row" className="break-words px-[12px] py-[10px] text-left font-semibold">{change.field}</th>
        <td className="whitespace-pre-wrap break-words px-[12px] py-[10px] text-yb-muted [overflow-wrap:anywhere]">{change.before}</td>
        <td className="whitespace-pre-wrap break-words px-[12px] py-[10px] [overflow-wrap:anywhere]">{change.after}</td>
      </tr>)}</tbody>
    </table>
    {item.changes.length === 0 && <p className="px-[14px] py-[20px] text-center text-yb-muted3">This event has no field-level values to compare.</p>}
  </section>;
}

/** Displays searchable system changes and protected-data access to administrators. */
function AuditHistoryPage() {
  const { can } = useAuth();
  const [draft, setDraft] = useState<AuditHistoryFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AuditHistoryFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<AuditHistoryItem | null>(null);
  const historyQuery = useQuery({ queryKey: ["audit-history", filters], queryFn: () => auditHistoryApi.list(filters) });

  /** Applies the filter form and returns to the first result page. */
  function submitFilters(event: FormEvent) {
    event.preventDefault();
    setSelected(null);
    setFilters({ ...draft, page: 1 });
  }

  /** Clears all search constraints and returns to the newest event. */
  function clearFilters() {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setSelected(null);
  }

  /** Changes only the current result page while preserving applied filters. */
  function changePage(page: number) {
    setSelected(null);
    setFilters((current) => ({ ...current, page }));
  }

  const response = historyQuery.data;
  return (
    <div className="min-h-screen min-w-[1300px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} compact />
      <main className="px-[16px] pt-[14px] pb-[36px]">
        <header className="mb-[12px]">
          <div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">Administration</div>
          <h1 className="yb-page-title">Audit history</h1>
          <p className="mt-[3px] text-[12px] text-yb-muted3">System changes and protected-information access. Secret values are always redacted.</p>
        </header>

        <section className="border-2 border-yb-line bg-white">
          <div className="flex h-[32px] items-center border-b border-yb-line bg-yb-panel-head px-[14px]">
            <div className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">AUDIT EVENTS</div>
            <div className="flex-1" />
            <div className="text-[11px] text-yb-muted3">{response ? `${response.total} matching ${response.total === 1 ? "event" : "events"}` : "Loading history…"}</div>
          </div>

          <form onSubmit={submitFilters} className="border-b border-yb-line bg-yb-table-head px-[12px] py-[10px]">
            <div className="grid grid-cols-[1.3fr_1fr_1fr_1.2fr_130px_130px_auto] gap-[8px]">
              <label className="text-[10.5px] font-bold text-yb-muted">CLIENT<select aria-label="Filter by client" value={draft.clientId} onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))} className="mt-[3px] h-[30px] w-full border border-yb-line-btn bg-white px-[7px] text-[12px] font-normal text-yb-ink"><option value="">All clients</option>{(response?.clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.name} · #{client.id}</option>)}</select></label>
              <label className="text-[10.5px] font-bold text-yb-muted">SEARCH<input aria-label="Search audit history" value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Action, record, user, or email" className="mt-[3px] h-[30px] w-full border border-yb-line-btn bg-white px-[8px] text-[12px] font-normal text-yb-ink" /></label>
              <label className="text-[10.5px] font-bold text-yb-muted">USER<select aria-label="Filter by user" value={draft.actorUserId} onChange={(event) => setDraft((current) => ({ ...current, actorUserId: event.target.value }))} className="mt-[3px] h-[30px] w-full border border-yb-line-btn bg-white px-[7px] text-[12px] font-normal text-yb-ink"><option value="">All users</option>{(response?.actors ?? []).map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
              <label className="text-[10.5px] font-bold text-yb-muted">ACTION<select aria-label="Filter by action" value={draft.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))} className="mt-[3px] h-[30px] w-full border border-yb-line-btn bg-white px-[7px] text-[12px] font-normal text-yb-ink"><option value="">All actions</option>{(response?.actions ?? []).map((action) => <option key={action} value={action}>{actionLabel(action)}</option>)}</select></label>
              <label className="text-[10.5px] font-bold text-yb-muted">FROM<input type="date" aria-label="From date" value={draft.dateFrom} onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))} className="mt-[3px] h-[30px] w-full border border-yb-line-btn bg-white px-[7px] text-[12px] font-normal text-yb-ink" /></label>
              <label className="text-[10.5px] font-bold text-yb-muted">TO<input type="date" aria-label="To date" value={draft.dateTo} onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))} className="mt-[3px] h-[30px] w-full border border-yb-line-btn bg-white px-[7px] text-[12px] font-normal text-yb-ink" /></label>
              <div className="flex items-end gap-[8px]"><button type="submit" className="h-[30px] border border-yb-green-dark bg-yb-green px-[14px] text-[12px] font-bold text-white">Search</button><button type="button" onClick={clearFilters} className="h-[30px] border border-yb-line-btn bg-white px-[10px] text-[12px] underline">Clear</button></div>
            </div>
            <label className="mt-[8px] inline-flex items-center gap-[6px] text-[11.5px] text-yb-muted"><input type="checkbox" checked={draft.importantOnly} onChange={(event) => setDraft((current) => ({ ...current, importantOnly: event.target.checked }))} /> Important and protected-access activity only</label>
          </form>

          {historyQuery.isError && <p role="alert" className="p-[14px] text-[13px] text-yb-red">Could not load audit history. Please try Search again.</p>}
          <table className="w-full table-fixed border-collapse text-[12px]">
            <thead><tr className="h-[30px] bg-yb-table-head text-yb-muted"><th className="px-[12px] text-left">When</th><th className="text-left">User</th><th className="text-left">Action</th><th className="text-left">Record</th><th className="text-left">Activity</th><th className="px-[12px] text-right">Details</th></tr></thead>
            <tbody>{(response?.items ?? []).map((item) => <Fragment key={item.id}><tr className={`h-[46px] border-t border-yb-line-row hover:bg-yb-row-hover ${selected?.id === item.id ? "bg-yb-row-hover" : ""}`}><td className="px-[12px]"><div>{item.occurredAtLabel}</div><div className="mt-[2px] text-[10px] uppercase text-yb-muted3">{item.eventKind}</div></td><td><div className="font-bold">{item.actorName}</div><div className="mt-[2px] truncate text-[10px] text-yb-muted3">{item.actorEmail ?? "No email"}</div></td><td><div className="truncate font-bold">{actionLabel(item.action)}</div></td><td><div className="truncate">{item.entityType === "client" && /^[1-9]\d*$/.test(item.entityId) && can("clients.read") ? <Link to="/clients/$clientId" params={{ clientId: item.entityId }} className="font-semibold text-yb-green underline hover:no-underline" title={`Open client #${item.entityId}`}>client #{item.entityId}</Link> : <>{item.entityType.replaceAll("_", " ")} #{item.entityId}</>}</div></td><td>{item.importance === "important" ? <><div className="font-bold text-yb-red">Important</div><div className="mt-[2px] truncate text-[10px] text-yb-muted3">{item.reason}</div></> : <span className="text-yb-muted3">Standard</span>}</td><td className="px-[12px] text-right"><button type="button" aria-expanded={selected?.id === item.id} aria-controls={selected?.id === item.id ? `audit-details-${item.id}` : undefined} onClick={() => setSelected((current) => current?.id === item.id ? null : item)} className="font-bold text-yb-green underline">{selected?.id === item.id ? "Close" : "View changes"}</button></td></tr>{selected?.id === item.id && <tr id={`audit-details-${item.id}`}><td colSpan={6} className="bg-yb-canvas p-[12px]"><AuditChangeDetails item={item} /></td></tr>}</Fragment>)}</tbody>
          </table>
          {historyQuery.isLoading && <div className="border-t border-yb-line-row px-[14px] py-[28px] text-center text-[12px] text-yb-muted3">Loading audit history…</div>}
          {!historyQuery.isLoading && response?.items.length === 0 && <div className="border-t border-yb-line-row px-[14px] py-[28px] text-center"><div className="font-bold">No audit events match these filters.</div><button type="button" onClick={clearFilters} className="mt-[4px] text-yb-green underline">Clear filters</button></div>}


          {response && response.pageCount > 1 && <div className="flex h-[42px] items-center justify-end gap-[10px] border-t border-yb-line bg-yb-panel-head px-[14px]"><button type="button" disabled={response.page <= 1} onClick={() => changePage(response.page - 1)} className="h-[28px] border border-yb-line-btn bg-white px-[10px] text-[11.5px] disabled:text-yb-muted3">Previous</button><span className="text-[11.5px] tabular-nums">Page {response.page} of {response.pageCount}</span><button type="button" disabled={response.page >= response.pageCount} onClick={() => changePage(response.page + 1)} className="h-[28px] border border-yb-line-btn bg-white px-[10px] text-[11.5px] disabled:text-yb-muted3">Next</button></div>}
        </section>
      </main>
    </div>
  );
}
