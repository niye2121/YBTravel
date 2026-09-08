import { Link, Outlet, createFileRoute, redirect, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Client } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { FilterStrip } from "../components/AppShell/FilterStrip";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { ImplementationStatusIcon } from "../components/ImplementationStatusIcon";
import { useAuth } from "../lib/AuthContext";
import { bookingFeesApi, clientsApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/clients")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "clients.read")) throw redirect({ to: "/" });
  },
  validateSearch: z.object({
    newClient: z.boolean().optional(),
    name: z.coerce.string().optional(),
    whatsappNumber: z.coerce.string().optional(),
    conversationId: z.coerce.number().int().positive().optional(),
  }),
  component: ClientsPage,
});

const selectClass =
  "h-[28px] rounded-yb border border-yb-line-btn bg-white px-[6px] text-[13.5px] font-bold text-yb-ink";

const clientTypeLabel = (value: Client["clientType"]) =>
  value.charAt(0).toUpperCase() + value.slice(1);

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

function phoneDigits(value: string | null | undefined): string {
  return value?.replace(/\D/g, "") ?? "";
}

function ClientsPage() {
  const params = useParams({ strict: false }) as { clientId?: string };
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user, can } = useAuth();
  const canCreateClient = can("clients.create") && can("fees.read");
  const queryClient = useQueryClient();
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: clientsApi.list });
  const repsQuery = useQuery({ queryKey: ["clients", "reps"], queryFn: clientsApi.listReps });
  const feeGroupsQuery = useQuery({ queryKey: ["booking-fees", "active"], queryFn: bookingFeesApi.listActive, enabled: canCreateClient });

  const [filter, setFilter] = useState("All Clients");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(search.newClient === true && canCreateClient);
  const [name, setName] = useState(search.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(search.whatsappNumber ?? "");
  const [preferredRepId, setPreferredRepId] = useState("");
  const [secondaryRepId, setSecondaryRepId] = useState("");
  const [bookingFeeGroupId, setBookingFeeGroupId] = useState("");
  const [clientType, setClientType] = useState<"Household" | "Company" | "Individual">("Household");
  const [error, setError] = useState<string | null>(null);
  const closeAfterCreateRef = useRef(true);

  useEffect(() => {
    if (!search.newClient || !canCreateClient) return;
    setShowForm(true);
    setName(search.name ?? "");
    setPhoneNumber(search.whatsappNumber ?? "");
  }, [canCreateClient, search.name, search.newClient, search.whatsappNumber]);

  useEffect(() => {
    if (!showForm || bookingFeeGroupId || !feeGroupsQuery.data?.length) return;
    const defaultGroup =
      feeGroupsQuery.data.find((group) => group.code === "standard") ?? feeGroupsQuery.data[0];
    if (defaultGroup) setBookingFeeGroupId(String(defaultGroup.id));
  }, [bookingFeeGroupId, feeGroupsQuery.data, showForm]);

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
      setShowForm(!closeAfterCreateRef.current);
      setName("");
      setPhoneNumber("");
      setPreferredRepId("");
      setSecondaryRepId("");
      setClientType("Household");
      if (closeAfterCreateRef.current) setBookingFeeGroupId("");
      setError(null);
      if (search.conversationId) {
        void navigate({ to: "/inbox" });
      } else if (closeAfterCreateRef.current) {
        void navigate({ to: "/clients", search: {} });
      }
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to create client"),
  });

  const allClients = clientsQuery.data ?? [];
  const existingPhoneClient = useMemo(() => {
    const digits = phoneDigits(phoneNumber);
    if (!digits) return null;
    return allClients.find((client) => phoneDigits(client.phoneNumber) === digits) ?? null;
  }, [allClients, phoneNumber]);

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
        q
          ? [
              c.name,
              c.phoneNumber ?? "",
              c.clientType,
              c.preferredRepName ?? "",
              c.secondaryRepName ?? "",
              c.bookingFeeGroupName,
              c.stageName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      );
  }, [allClients, filter, query, user?.id]);

  useEffect(() => {
    if (!showForm) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowForm(false);
        setError(null);
        void navigate({ to: "/clients", search: {} });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, showForm]);

  function closeForm() {
    setShowForm(false);
    setError(null);
    if (search.conversationId) void navigate({ to: "/inbox" });
    else void navigate({ to: "/clients", search: {} });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    closeAfterCreateRef.current = submitter?.dataset.createMode !== "another";
    if (!bookingFeeGroupId) {
      setError("Create and select an active booking fee group first");
      return;
    }
    createMutation.mutate({
      name,
      clientType: clientType.toLowerCase() as Client["clientType"],
      phoneNumber: phoneNumber.trim() || null,
      preferredRepId: preferredRepId ? Number(preferredRepId) : null,
      secondaryRepId: secondaryRepId ? Number(secondaryRepId) : null,
      bookingFeeGroupId: Number(bookingFeeGroupId),
      conversationId: search.conversationId,
    });
  }

  if (params.clientId) return <Outlet />;

  return (
    <div className="min-h-screen min-w-[1180px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} compact />

      <FilterStrip filters={filters} active={filter} onChange={setFilter} compact />

      {/* Page header */}
      <div className="flex items-end gap-[12px] px-[16px] pt-[14px] pb-[12px]">
        <div className="flex h-[22px] w-[22px] items-center justify-center border border-yb-line-btn bg-white">
          <div className="h-[10px] w-[10px] bg-yb-gold" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">CLIENTS</div>
          <div className="flex items-baseline gap-[8px]">
            <h1 className="yb-page-title">{filter}</h1>
            <span className="text-[12px] text-yb-muted3">{allClients.length} total</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          {canCreateClient && !showForm && <PrimaryButton onClick={() => setShowForm(true)}>+ New Client</PrimaryButton>}
          <SecondaryButton className="group/status-parent flex h-[30px] items-center gap-[6px] px-[14px] text-[12px]" aria-disabled="true">Export ▾ <ImplementationStatusIcon label="Not implemented" description="Client export is not available yet." withinInteractiveControl /></SecondaryButton>
        </div>
      </div>

      {canCreateClient && showForm && (
        <form
          onSubmit={handleSubmit}
          className="yb-card mx-[16px] mb-[14px] overflow-hidden rounded-none border border-yb-line border-t-[3px] border-t-yb-green bg-white"
        >
          <div className="flex items-center border-b border-yb-line-soft px-[16px] py-[10px]">
            <div className="text-[14px] font-black text-yb-ink">New client</div>
            <div className="ml-[10px] text-[11px] text-yb-muted3">
              Only the name is required — everything else can be filled in later.
            </div>
            <div className="flex-1" />
            <button
              type="button"
              aria-label="Close new client form"
              onClick={closeForm}
              className="flex h-[22px] w-[22px] items-center justify-center text-[20px] leading-none text-yb-muted3 hover:text-yb-ink"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_300px] items-stretch">
            <div className="grid min-w-0 grid-cols-3 content-start gap-x-[32px] px-[22px] pt-[16px] pb-[18px]">
              <div className="col-span-3 mb-[12px] border-b border-yb-line-soft pb-[5px] text-[10px] font-bold tracking-[1.2px] text-yb-muted2">
                CLIENT DETAILS
              </div>

              <div className="mb-[12px] grid grid-cols-[118px_minmax(0,1fr)] items-baseline gap-x-[12px]">
                <label htmlFor="client-name" className="pt-[6px] text-right text-[12px] text-yb-ink2">
                  <span className="font-bold text-yb-red">*</span> Client name
                </label>
                <div>
                  <input
                    id="client-name"
                    autoFocus
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Feldman Household"
                    className="h-[28px] w-full border border-yb-line-btn bg-white px-[7px] text-[13px] text-yb-ink outline-none focus:outline-2 focus:outline-yb-green"
                  />
                  <div className="mt-[3px] text-[11px] text-yb-muted4">
                    How the client appears on requests and invoices.
                  </div>
                </div>
              </div>

              <div className="mb-[12px] grid grid-cols-[118px_minmax(0,1fr)] items-baseline gap-x-[12px]">
                <label htmlFor="client-phone" className="pt-[6px] text-right text-[12px] text-yb-ink2">
                  {search.conversationId && <span className="font-bold text-yb-red">*</span>} WhatsApp number
                </label>
                <div>
                  <input
                    id="client-phone"
                    type="tel"
                    required={Boolean(search.conversationId)}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 212 555 0123"
                    className="h-[28px] w-full border border-yb-line-btn bg-white px-[7px] text-[13px] text-yb-ink outline-none focus:outline-2 focus:outline-yb-green"
                  />
                  <div className="mt-[3px] text-[11px] text-yb-muted4">
                    Used to link WhatsApp conversations and prevent duplicate clients.
                  </div>
                </div>
              </div>

              <div className="mb-[12px] grid grid-cols-[118px_minmax(0,1fr)] items-baseline gap-x-[12px]">
                <div className="pt-[6px] text-right text-[12px] text-yb-ink2">Client type</div>
                <div>
                  <div className="flex h-[28px] overflow-hidden border border-yb-line-btn">
                    {(["Household", "Company", "Individual"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={clientType === type}
                        onClick={() => setClientType(type)}
                        className={`min-w-0 flex-1 border-r border-yb-line last:border-r-0 px-[8px] text-[12px] ${
                          clientType === type
                            ? "bg-yb-green font-bold text-white"
                            : "bg-white font-normal text-yb-ink2 hover:bg-yb-hover-btn"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="mt-[3px] text-[11px] text-yb-muted4">
                    Determines the traveller fields on the profile.
                  </div>
                </div>
              </div>

              <div className="col-span-3 mt-[6px] mb-[12px] border-b border-yb-line-soft pb-[5px] text-[10px] font-bold tracking-[1.2px] text-yb-muted2">
                ASSIGNMENT &amp; FEES
              </div>

              <div className="mb-[12px] grid grid-cols-[118px_minmax(0,1fr)] items-baseline gap-x-[12px]">
                <label htmlFor="preferred-rep" className="pt-[6px] text-right text-[12px] text-yb-ink2">
                  Preferred rep
                </label>
                <div>
                  <select
                    id="preferred-rep"
                    value={preferredRepId}
                    onChange={(e) => setPreferredRepId(e.target.value)}
                    className="h-[28px] w-full border border-yb-line-btn bg-white px-[4px] text-[13px] text-yb-ink"
                  >
                    <option value="">Unassigned</option>
                    {(repsQuery.data ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-[3px] text-[11px] text-yb-muted4">
                    Unassigned routes to the desk queue.
                  </div>
                </div>
              </div>

              <div className="mb-[12px] grid grid-cols-[118px_minmax(0,1fr)] items-baseline gap-x-[12px]">
                <label htmlFor="secondary-rep" className="pt-[6px] text-right text-[12px] text-yb-ink2">
                  Secondary rep
                </label>
                  <select
                    id="secondary-rep"
                    value={secondaryRepId}
                    onChange={(e) => setSecondaryRepId(e.target.value)}
                    className="h-[28px] w-full border border-yb-line-btn bg-white px-[4px] text-[13px] text-yb-ink"
                  >
                    <option value="">Unassigned</option>
                    {(repsQuery.data ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
              </div>

              <div className="grid grid-cols-[118px_minmax(0,1fr)] items-baseline gap-x-[12px]">
                <label htmlFor="fee-group" className="pt-[6px] text-right text-[12px] text-yb-ink2">
                  Fee group
                </label>
                <div>
                  {(feeGroupsQuery.data?.length ?? 0) > 0 ? (
                    <select
                      id="fee-group"
                      required
                      value={bookingFeeGroupId}
                      onChange={(e) => setBookingFeeGroupId(e.target.value)}
                      className="h-[28px] w-full border border-yb-line-btn bg-white px-[4px] text-[13px] text-yb-ink"
                    >
                      {(feeGroupsQuery.data ?? []).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} — {group.currency} {group.amount}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <div className="flex h-[28px] items-center border border-dashed border-[#a9b1a8] bg-[#f6f7f4] px-[7px] text-[13px] text-[#8a938b]">
                        {feeGroupsQuery.isLoading ? "Loading fee groups…" : "No active fee groups"}
                      </div>
                      {!feeGroupsQuery.isLoading && (
                        <div className="mt-[4px] text-[11px] leading-[1.5] text-yb-amber">
                          Optional now — an administrator adds groups in{" "}
                          <a href="/setup/booking-fees" className="font-bold text-yb-green underline">
                            Setup → Booking Fees
                          </a>
                          .
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {error && <div className="col-span-3 mt-[14px] text-[12px] text-yb-red">{error}</div>}
              {search.conversationId && existingPhoneClient && !error && (
                <div className="col-span-3 mt-[14px] border border-[#b7cbbd] bg-[#edf7f0] px-[10px] py-[8px] text-[12px] leading-[1.45] text-yb-green">
                  This WhatsApp number already belongs to <strong>{existingPhoneClient.name}</strong>.
                  Continuing will link this Inbox conversation to that client; it will not create a duplicate.
                </div>
              )}
            </div>

            <aside className="border-l border-yb-line-soft bg-yb-panel-head px-[18px] py-[16px]">
              <div className="mb-[8px] text-[10px] font-bold tracking-[1.2px] text-yb-muted2">
                WHAT HAPPENS NEXT
              </div>
              <div className="text-[11.5px] leading-[1.65] text-[#59635b]">
                The client is filed under <strong>New Inquiry</strong>. From its row you can send the
                onboarding link, add travellers, or open the full profile to complete address, documents
                and fees.
              </div>
              <div className="my-[12px] border-t border-yb-line-soft" />
              <div className="text-[11.5px] leading-[1.65] text-yb-muted4">
                Duplicate names are allowed, but the same phone number cannot belong to two clients.
              </div>
            </aside>
          </div>

          <div className="flex items-center gap-[10px] border-t border-yb-line bg-yb-panel-head px-[16px] py-[10px]">
            <div className="text-[11px] text-yb-muted4">Enter to create · Esc to cancel</div>
            <div className="flex-1" />
            <SecondaryButton className="h-[30px] px-[16px] text-[12px]" type="button" onClick={closeForm}>
              Cancel
            </SecondaryButton>
            {!search.conversationId && (
              <SecondaryButton
                className="h-[30px] px-[16px] text-[12px]"
                type="submit"
                data-create-mode="another"
                disabled={createMutation.isPending || !name.trim() || (feeGroupsQuery.data?.length ?? 0) === 0}
              >
                Create &amp; New
              </SecondaryButton>
            )}
            <PrimaryButton
              className="h-[30px] px-[20px] text-[12px]"
              type="submit"
              disabled={createMutation.isPending || !name.trim() || (feeGroupsQuery.data?.length ?? 0) === 0}
            >
              {createMutation.isPending
                ? existingPhoneClient ? "Linking…" : "Creating…"
                : search.conversationId
                  ? existingPhoneClient ? "Link Existing Client" : "Create & Link Client"
                  : "Create Client"}
            </PrimaryButton>
          </div>
        </form>
      )}

      {/* Panel */}
      <div className="mx-[16px] mb-[26px] rounded-none border border-yb-line bg-white">
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
          <span className="flex items-center gap-[5px] text-[13px] text-yb-muted3">Edit <ImplementationStatusIcon label="Not implemented" description="Custom view editing is not available yet." /></span>
          <span className="flex items-center gap-[5px] text-[13px] text-yb-muted3">Create New View <ImplementationStatusIcon label="Not implemented" description="Creating custom client views is not available yet." /></span>
          <div className="flex-1" />
          <label htmlFor="client-list-search" className="text-[12px] font-bold text-yb-muted">
            Search:
          </label>
          <input
            id="client-list-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, phone, rep, or stage"
            className="h-[28px] w-[260px] border border-yb-line-btn bg-white px-[8px] text-[12.5px] text-yb-ink outline-none focus:border-yb-green"
          />
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[250px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Client
              </th>
              <th className="w-[90px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Type
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
                    <div className="flex items-center gap-[6px] whitespace-nowrap">
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: String(c.id) }}
                        className="text-yb-green underline"
                      >
                        {c.name}
                      </Link>
                      {c.isDemo && (
                        <span className="border border-[#d3b35a] bg-[#fff7d8] px-[5px] py-[1px] text-[9px] font-bold text-[#7b5b00]">
                          DEMO
                        </span>
                      )}
                    </div>
                    {c.phoneNumber && (
                      <div className="mt-[2px] text-[11px] font-normal text-yb-muted3">{c.phoneNumber}</div>
                    )}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {clientTypeLabel(c.clientType)}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {c.preferredRepName ?? "—"}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {c.secondaryRepName ?? "—"}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {c.bookingFeeGroupName}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    {c.stageName}
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
