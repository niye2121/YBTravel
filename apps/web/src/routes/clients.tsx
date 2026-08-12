import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import type { Client, FeeGroup, OnboardingStage } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { FilterStrip } from "../components/AppShell/FilterStrip";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { useAuth } from "../lib/AuthContext";
import { clientsApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});

const selectClass =
  "h-[28px] rounded-yb border border-yb-line-btn bg-white px-[6px] text-[13.5px] font-bold text-yb-ink";

const STAGE_LABELS: Record<OnboardingStage, string> = {
  new_inquiry: "New inquiry",
  welcome_sent: "Welcome sent",
  waiting_for_info: "Waiting for info",
  information_received: "Information received",
  review_complete: "Review complete",
  fully_onboarded: "Fully onboarded",
};

const FEE_GROUP_LABELS: Record<FeeGroup, string> = {
  standard: "Standard",
  belev_echad: "Belev Echad",
  scheiman: "Scheiman",
};

function matchesFilter(client: Client, filter: string, currentUserId: number | undefined): boolean {
  switch (filter) {
    case "New Inquiry":
      return client.stage === "new_inquiry";
    case "Waiting for Info":
      return client.stage === "waiting_for_info";
    case "Fully Onboarded":
      return client.stage === "fully_onboarded";
    case "My Clients":
      return client.preferredRepId === currentUserId || client.secondaryRepId === currentUserId;
    default:
      return true;
  }
}

function ClientsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: clientsApi.list });
  const repsQuery = useQuery({ queryKey: ["clients", "reps"], queryFn: clientsApi.listReps });

  const [filter, setFilter] = useState("All Clients");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [preferredRepId, setPreferredRepId] = useState("");
  const [secondaryRepId, setSecondaryRepId] = useState("");
  const [feeGroup, setFeeGroup] = useState<FeeGroup>("standard");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
      setName("");
      setPreferredRepId("");
      setSecondaryRepId("");
      setFeeGroup("standard");
      setError(null);
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to create client"),
  });

  const allClients = clientsQuery.data ?? [];

  const filters = useMemo<[string, number][]>(
    () => [
      ["All Clients", allClients.length],
      ["New Inquiry", allClients.filter((c) => c.stage === "new_inquiry").length],
      ["Waiting for Info", allClients.filter((c) => c.stage === "waiting_for_info").length],
      ["Fully Onboarded", allClients.filter((c) => c.stage === "fully_onboarded").length],
      [
        "My Clients",
        allClients.filter((c) => c.preferredRepId === user?.id || c.secondaryRepId === user?.id).length,
      ],
    ],
    [allClients, user?.id],
  );

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allClients
      .filter((c) => matchesFilter(c, filter, user?.id))
      .filter((c) =>
        q ? [c.name, c.preferredRepName ?? "", STAGE_LABELS[c.stage]].join(" ").toLowerCase().includes(q) : true,
      );
  }, [allClients, filter, query, user?.id]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name,
      preferredRepId: preferredRepId ? Number(preferredRepId) : null,
      secondaryRepId: secondaryRepId ? Number(secondaryRepId) : null,
      feeGroup,
    });
  }

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      <FilterStrip filters={filters} active={filter} onChange={setFilter} />

      {/* Page header */}
      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">CLIENTS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">{filter}</h1>
            <span className="text-[13px] text-yb-muted3">{allClients.length} total</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <PrimaryButton onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New Client"}
          </PrimaryButton>
          <SecondaryButton>Export ▾</SecondaryButton>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mx-[22px] mb-[18px] rounded-yb border border-yb-line bg-yb-panel-head p-[16px]"
        >
          <div className="flex gap-[14px]">
            <label className="flex-1 text-[13px] text-yb-muted">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              />
            </label>
            <label className="flex-1 text-[13px] text-yb-muted">
              Fee group
              <select
                value={feeGroup}
                onChange={(e) => setFeeGroup(e.target.value as FeeGroup)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              >
                {(Object.keys(FEE_GROUP_LABELS) as FeeGroup[]).map((fg) => (
                  <option key={fg} value={fg}>
                    {FEE_GROUP_LABELS[fg]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-[13px] text-yb-muted">
              Preferred rep
              <select
                value={preferredRepId}
                onChange={(e) => setPreferredRepId(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              >
                <option value="">Unassigned</option>
                {(repsQuery.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-[13px] text-yb-muted">
              Secondary rep
              <select
                value={secondaryRepId}
                onChange={(e) => setSecondaryRepId(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              >
                <option value="">Unassigned</option>
                {(repsQuery.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <div className="mt-[10px] text-[13px] text-yb-red">{error}</div>}

          <div className="mt-[14px] flex gap-[10px]">
            <PrimaryButton type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Client"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setShowForm(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </form>
      )}

      {/* Panel */}
      <div className="mx-[22px] mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            CLIENTS — {filter.toUpperCase()}
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{clients.length} items</div>
        </div>

        <div className="flex items-center gap-[10px] border-b border-yb-line-soft bg-yb-toolbar px-[14px] py-[9px]">
          <span className="text-[13px] text-yb-muted">View:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={selectClass}
          >
            {filters.map(([l]) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] text-yb-green underline">
            Edit
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] text-yb-green underline">
            Create New View
          </a>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[150px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Client
              </th>
              <th className="w-[130px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Preferred Rep
              </th>
              <th className="w-[130px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Secondary Rep
              </th>
              <th className="w-[120px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Fee Group
              </th>
              <th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Onboarding Stage
              </th>
              <th className="w-[110px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold text-yb-muted">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const hovered = hoverRow === c.id;
              return (
                <tr
                  key={c.id}
                  onMouseEnter={() => setHoverRow(c.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                >
                  <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] font-bold">
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-yb-green underline">
                      {c.name}
                    </a>
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {c.preferredRepName ?? "—"}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {c.secondaryRepName ?? "—"}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {FEE_GROUP_LABELS[c.feeGroup]}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {STAGE_LABELS[c.stage]}
                  </td>
                  <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right text-yb-muted3">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {clientsQuery.isLoading && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">Loading clients…</div>
        )}
        {clients.length === 0 && !clientsQuery.isLoading && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            No clients match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
