import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import type { PassportStatus } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { clientsApi, travellersApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/travellers")({
  component: TravellersPage,
});

const statusColour = (s: PassportStatus) =>
  s === "missing" ? "text-yb-red" : s === "expiring_soon" ? "text-yb-amber" : "text-yb-ink2";

const PASSPORT_STATUS_LABELS: Record<PassportStatus, string> = {
  on_file: "On file",
  missing: "Missing",
  expiring_soon: "Expiring soon",
};

type LinkDraft = { clientId: string; relationship: string };

function TravellersPage() {
  const queryClient = useQueryClient();
  const travellersQuery = useQuery({ queryKey: ["travellers"], queryFn: travellersApi.list });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: clientsApi.list });

  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [passportStatus, setPassportStatus] = useState<PassportStatus>("missing");
  const [links, setLinks] = useState<LinkDraft[]>([{ clientId: "", relationship: "" }]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: travellersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travellers"] });
      setShowForm(false);
      setName("");
      setDob("");
      setPassportStatus("missing");
      setLinks([{ clientId: "", relationship: "" }]);
      setError(null);
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to create traveller"),
  });

  const allTravellers = travellersQuery.data ?? [];

  const travellers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTravellers
      .filter((t) => (missingOnly ? t.passportStatus === "missing" : true))
      .filter((t) =>
        q
          ? [t.name, ...t.clients.map((c) => c.clientName)].join(" ").toLowerCase().includes(q)
          : true,
      );
  }, [allTravellers, query, missingOnly]);

  const missingCount = allTravellers.filter((t) => t.passportStatus === "missing").length;

  function updateLink(index: number, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name,
      dob: dob || null,
      passportStatus,
      links: links
        .filter((l) => l.clientId)
        .map((l) => ({ clientId: Number(l.clientId), relationship: l.relationship || null })),
    });
  }

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      {/* Page header — no filter strip: this is a flat reference list
          (P1-04), not a workflow queue, so a search + single toggle
          replaces the saved-views pattern used on Requests/Clients. */}
      <div className="flex items-center gap-[14px] border-b border-yb-line-head px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">TRAVELLERS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">All Travellers</h1>
            <span className="text-[13px] text-yb-muted3">
              {allTravellers.length} total · {missingCount} missing passport info
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={() => setMissingOnly((v) => !v)}
            className={`h-[34px] rounded-yb border px-[16px] text-[14px] ${
              missingOnly
                ? "border-yb-red bg-[#fdf1f0] font-bold text-yb-red"
                : "border-yb-line-btn bg-white text-yb-ink2"
            }`}
          >
            Missing Passport Info
          </button>
          <PrimaryButton onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New Traveller"}
          </PrimaryButton>
          <SecondaryButton>Export ▾</SecondaryButton>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mx-[22px] mt-4 mb-[18px] rounded-yb border border-yb-line bg-yb-panel-head p-[16px]"
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
              Date of birth
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              />
            </label>
            <label className="flex-1 text-[13px] text-yb-muted">
              Passport status
              <select
                value={passportStatus}
                onChange={(e) => setPassportStatus(e.target.value as PassportStatus)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              >
                {(Object.keys(PASSPORT_STATUS_LABELS) as PassportStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PASSPORT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-[14px]">
            <div className="mb-[6px] text-[13px] text-yb-muted">
              Linked client accounts — the same traveller can be linked to more than one
            </div>
            {links.map((link, i) => (
              <div key={i} className="mb-[8px] flex items-center gap-[10px]">
                <select
                  value={link.clientId}
                  onChange={(e) => updateLink(i, { clientId: e.target.value })}
                  className="h-[32px] w-[220px] rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
                >
                  <option value="">Select a client…</option>
                  {(clientsQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Relationship (e.g. spouse, employee) — optional"
                  value={link.relationship}
                  onChange={(e) => updateLink(i, { relationship: e.target.value })}
                  className="h-[32px] w-[280px] rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
                />
                {links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-[13px] text-yb-red underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLinks((prev) => [...prev, { clientId: "", relationship: "" }])}
              className="text-[13px] text-yb-green underline"
            >
              + Add another client
            </button>
          </div>

          {error && <div className="mt-[10px] text-[13px] text-yb-red">{error}</div>}

          <div className="mt-[14px] flex gap-[10px]">
            <PrimaryButton type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Traveller"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setShowForm(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </form>
      )}

      {/* Panel */}
      <div className="mx-[22px] mt-4 mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            TRAVELLERS{missingOnly ? " — MISSING PASSPORT INFO" : ""}
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{travellers.length} items</div>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[170px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Name
              </th>
              <th className="w-[130px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Date of Birth
              </th>
              <th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Passport Status
              </th>
              <th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Client Accounts
              </th>
            </tr>
          </thead>
          <tbody>
            {travellers.map((t) => {
              const hovered = hoverRow === t.id;
              return (
                <tr
                  key={t.id}
                  onMouseEnter={() => setHoverRow(t.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                >
                  <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] font-bold">{t.name}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {t.dob ? new Date(t.dob).toLocaleDateString() : "Missing"}
                  </td>
                  <td
                    className={`border-b border-yb-line-row px-2 py-[11px] ${statusColour(t.passportStatus)} ${
                      t.passportStatus !== "on_file" ? "font-bold" : ""
                    }`}
                  >
                    {PASSPORT_STATUS_LABELS[t.passportStatus]}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {t.clients.length === 0
                      ? "—"
                      : t.clients.map((c, i) => (
                          <span key={c.clientId}>
                            {i > 0 && ", "}
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-yb-green underline">
                              {c.clientName}
                            </a>
                            {c.relationship && (
                              <span className="text-yb-muted3"> ({c.relationship})</span>
                            )}
                          </span>
                        ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {travellersQuery.isLoading && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            Loading travellers…
          </div>
        )}
        {travellers.length === 0 && !travellersQuery.isLoading && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            No travellers match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
