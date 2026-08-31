import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Client, TravellerRelationship } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { bookingFeesApi, clientsApi, travellersApi, workflowSettingsApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/clients/$clientId")({ component: ClientDetailPage });

type AddMode = "new" | "existing";

type ClientEditState = {
  name: string;
  clientType: Client["clientType"];
  phoneNumber: string;
  preferredRepId: string;
  secondaryRepId: string;
  bookingFeeGroupId: string;
  stage: string;
};

const RELATIONSHIP_LABELS: Record<TravellerRelationship, string> = {
  self: "Self / account holder",
  spouse_partner: "Spouse or partner",
  child: "Child",
  parent_guardian: "Parent or guardian",
  sibling: "Sibling",
  other_relative: "Other relative",
  employee: "Employee",
  employer: "Employer",
  colleague: "Colleague",
  friend: "Friend",
  guest: "Guest",
  group_member: "Group member",
  other: "Other",
};

const relationships = Object.keys(RELATIONSHIP_LABELS) as TravellerRelationship[];
const controlClass =
  "h-[30px] w-full border border-[#8d968e] bg-white px-[8px] text-[13px] text-[#1c1f1b] outline-none focus:border-[#1a6b46] focus:ring-1 focus:ring-[#1a6b46]";

const CLIENT_TYPES: Array<{ value: Client["clientType"]; label: string }> = [
  { value: "household", label: "Household" },
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual" },
];

function dateLabel(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US");
}

function passportLabel(value: string) {
  if (value === "on_file") return "On file";
  if (value === "expiring_soon") return "Expiring soon";
  return "Missing";
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-[4px] text-[10px] font-bold uppercase tracking-[0.11em] text-[#6c766f]">
        {label}
      </div>
      <div className="text-[13px] text-[#2c332d]">{children}</div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block text-[12px] text-[#3c443d]">
      <span className="mb-[5px] block font-bold">
        {required && <span className="mr-[3px] text-[#a8341f]">*</span>}
        {label}
      </span>
      {children}
    </label>
  );
}

function ClientDetailPage() {
  const { clientId: clientIdParam } = Route.useParams();
  const clientId = Number(clientIdParam);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [showEditClient, setShowEditClient] = useState(false);
  const [editState, setEditState] = useState<ClientEditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [showAddTraveller, setShowAddTraveller] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("new");
  const [legalName, setLegalName] = useState("");
  const [dob, setDob] = useState("");
  const [relationship, setRelationship] = useState<TravellerRelationship | "">("");
  const [existingTravellerId, setExistingTravellerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: clientsApi.list });
  const repsQuery = useQuery({ queryKey: ["clients", "reps"], queryFn: clientsApi.listReps });
  const feeGroupsQuery = useQuery({ queryKey: ["booking-fees", "active"], queryFn: bookingFeesApi.listActive });
  const workflowQuery = useQuery({ queryKey: ["workflow-settings", "active"], queryFn: workflowSettingsApi.listActive });
  const travellersQuery = useQuery({ queryKey: ["travellers"], queryFn: travellersApi.list });
  const clientTravellersQuery = useQuery({
    queryKey: ["clients", clientId, "travellers"],
    queryFn: () => clientsApi.listTravellers(clientId),
    enabled: Number.isInteger(clientId) && clientId > 0,
  });

  const client = clientsQuery.data?.find((item) => item.id === clientId);
  const linkedIds = useMemo(
    () => new Set((clientTravellersQuery.data ?? []).map((traveller) => traveller.id)),
    [clientTravellersQuery.data],
  );
  const availableTravellers = (travellersQuery.data ?? []).filter(
    (traveller) => !traveller.isDemo && !linkedIds.has(traveller.id),
  );

  function openEditClient(current: Client) {
    const matchingFeeGroup = feeGroupsQuery.data?.find(
      (group) => group.name.toLowerCase() === current.bookingFeeGroupName.toLowerCase(),
    );
    setEditState({
      name: current.name,
      clientType: current.clientType,
      phoneNumber: current.phoneNumber ?? "",
      preferredRepId: current.preferredRepId ? String(current.preferredRepId) : "",
      secondaryRepId: current.secondaryRepId ? String(current.secondaryRepId) : "",
      bookingFeeGroupId: current.bookingFeeGroupId
        ? String(current.bookingFeeGroupId)
        : matchingFeeGroup
          ? String(matchingFeeGroup.id)
          : "",
      stage: current.stage,
    });
    setEditError(null);
    setNotice(null);
    setShowAddTraveller(false);
    setShowEditClient(true);
  }

  function closeEditClient() {
    setShowEditClient(false);
    setEditState(null);
    setEditError(null);
  }

  function resetAddForm() {
    setLegalName("");
    setDob("");
    setRelationship("");
    setExistingTravellerId("");
    setError(null);
  }

  function refreshTravellers() {
    void queryClient.invalidateQueries({ queryKey: ["clients", clientId, "travellers"] });
    void queryClient.invalidateQueries({ queryKey: ["travellers"] });
  }

  const createTravellerMutation = useMutation({
    mutationFn: travellersApi.create,
    onSuccess: () => {
      refreshTravellers();
      resetAddForm();
      setShowAddTraveller(false);
      setNotice("Traveller created and added to this client.");
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to create traveller"),
  });

  const linkTravellerMutation = useMutation({
    mutationFn: (input: { travellerId: number; relationship: string | null }) =>
      clientsApi.linkTraveller(clientId, input),
    onSuccess: () => {
      refreshTravellers();
      resetAddForm();
      setShowAddTraveller(false);
      setNotice("Existing traveller added to this client.");
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to add traveller"),
  });

  const updateClientMutation = useMutation({
    mutationFn: (input: NonNullable<typeof editState>) =>
      clientsApi.update(clientId, {
        name: input.name.trim(),
        clientType: input.clientType,
        phoneNumber: input.phoneNumber.trim() || null,
        preferredRepId: input.preferredRepId ? Number(input.preferredRepId) : null,
        secondaryRepId: input.secondaryRepId ? Number(input.secondaryRepId) : null,
        bookingFeeGroupId: Number(input.bookingFeeGroupId),
        stage: input.stage,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Client[]>(["clients"], (current) =>
        (current ?? []).map((item) => (item.id === updated.id ? updated : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      closeEditClient();
      setNotice("Client details updated.");
    },
    onError: (err: unknown) =>
      setEditError(err instanceof Error ? err.message : "Failed to update client"),
  });

  function submitClientEdit(event: FormEvent) {
    event.preventDefault();
    setEditError(null);
    if (!editState?.name.trim()) {
      setEditError("Client name is required");
      return;
    }
    if (!editState.bookingFeeGroupId) {
      setEditError("Select an active booking fee group");
      return;
    }
    if (!editState.stage) {
      setEditError("Select an onboarding stage");
      return;
    }
    updateClientMutation.mutate(editState);
  }

  function submitTraveller(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!relationship) {
      setError("Select the traveller's relationship to this client");
      return;
    }
    if (addMode === "new") {
      if (!legalName.trim() || !dob) {
        setError("Legal name and date of birth are required");
        return;
      }
      createTravellerMutation.mutate({
        name: legalName.trim(),
        dob,
        passportStatus: "missing",
        links: [{ clientId, relationship }],
      });
      return;
    }
    if (!existingTravellerId) {
      setError("Choose an existing traveller");
      return;
    }
    linkTravellerMutation.mutate({ travellerId: Number(existingTravellerId), relationship });
  }

  const addPending = createTravellerMutation.isPending || linkTravellerMutation.isPending;

  return (
    <div className="yb-reference-scale min-h-screen min-w-[1180px] bg-[#eef0ea] font-[Helvetica,Arial,sans-serif] leading-[1.25] text-[#1c1f1b]">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} compact />

      <main className="px-[16px] pt-[14px] pb-[40px]">
        <div className="mb-[10px] flex items-center gap-[7px] text-[12px]">
          <Link to="/clients" search={{}} className="text-[#0b5c3b] underline">
            Clients
          </Link>
          <span className="text-[#8a938b]">/</span>
          <span className="text-[#59635b]">{client?.name ?? "Client details"}</span>
        </div>

        {clientsQuery.isLoading && (
          <div className="border border-[#c3cbc2] bg-white p-[24px] text-[13px] text-[#6c766f]">
            Loading client…
          </div>
        )}

        {!clientsQuery.isLoading && (!Number.isInteger(clientId) || !client) && (
          <div className="border border-[#c3cbc2] bg-white p-[24px]">
            <h1 className="mb-[6px] text-[22px] font-bold">Client not found</h1>
            <p className="mb-[14px] text-[13px] text-[#6c766f]">This client may no longer exist.</p>
            <Link to="/clients" search={{}} className="text-[13px] font-bold text-[#0b5c3b] underline">
              Return to Clients
            </Link>
          </div>
        )}

        {client && (
          <>
            <header className="mb-[12px] flex items-end gap-[12px]">
              <div className="h-[22px] w-[22px] border border-[#b0b8ae] bg-white p-[5px]" aria-hidden="true">
                <div className="h-full w-full bg-[#d9a01e]" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#6c766f]">Client</div>
                <div className="flex items-baseline gap-[8px]">
                  <h1 className="text-[24px] font-bold tracking-[-0.01em]">{client.name}</h1>
                  <span className="text-[12px] text-[#6c766f]">{client.stageName}</span>
                  {client.isDemo && (
                    <span className="border border-[#d3b35a] bg-[#fff7d8] px-[6px] py-[2px] text-[9px] font-bold text-[#7b5b00]">
                      DEMO · READ ONLY
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1" />
              {!client.isDemo && (
                <SecondaryButton
                  className="h-[30px] px-[14px] text-[12px]"
                  onClick={() => (showEditClient ? closeEditClient() : openEditClient(client))}
                >
                  {showEditClient ? "Cancel Edit" : "Edit Client"}
                </SecondaryButton>
              )}
              <PrimaryButton className="h-[30px] px-[14px] text-[12px]" disabled={client.isDemo} onClick={() => { setShowAddTraveller(true); setNotice(null); }}>
                + Add Traveller
              </PrimaryButton>
            </header>

            {showEditClient && editState ? (
              <form onSubmit={submitClientEdit} className="mb-[14px] border border-[#c3cbc2] border-t-[3px] border-t-[#0d5c39] bg-white">
                <div className="flex items-center border-b border-[#e4e8e2] px-[16px] py-[10px]">
                  <div>
                    <div className="text-[14px] font-bold">Edit client</div>
                    <div className="mt-[2px] text-[11px] text-[#6c766f]">Update the profile details used across requests, travellers, and fees.</div>
                  </div>
                  <div className="flex-1" />
                  <button type="button" aria-label="Close edit client form" onClick={closeEditClient} className="text-[20px] text-[#6c766f]">×</button>
                </div>

                <div className="grid grid-cols-3 gap-x-[24px] gap-y-[14px] px-[18px] py-[16px]">
                  <div className="col-span-3 border-b border-[#e4e8e2] pb-[5px] text-[10px] font-bold tracking-[0.12em] text-[#5c665e]">CLIENT DETAILS</div>
                  <FormField label="Client name" required>
                    <input autoFocus required value={editState.name} onChange={(event) => setEditState({ ...editState, name: event.target.value })} className={controlClass} />
                  </FormField>
                  <FormField label="WhatsApp number">
                    <input type="tel" value={editState.phoneNumber} onChange={(event) => setEditState({ ...editState, phoneNumber: event.target.value })} placeholder="+1 212 555 0123" className={controlClass} />
                  </FormField>
                  <FormField label="Onboarding stage" required>
                    <select required value={editState.stage} onChange={(event) => setEditState({ ...editState, stage: event.target.value })} className={controlClass}>
                      {(workflowQuery.data?.stages ?? []).map((stage) => <option key={stage.id} value={stage.code}>{stage.name}</option>)}
                    </select>
                  </FormField>

                  <div className="col-span-3">
                    <div className="mb-[5px] text-[12px] font-bold text-[#3c443d]">Client type</div>
                    <div className="flex h-[30px] max-w-[480px] overflow-hidden border border-[#8d968e]">
                      {CLIENT_TYPES.map((type) => (
                        <button key={type.value} type="button" aria-pressed={editState.clientType === type.value} onClick={() => setEditState({ ...editState, clientType: type.value })} className={`flex-1 border-r border-[#c3cbc2] px-[10px] text-[12px] last:border-r-0 ${editState.clientType === type.value ? "bg-[#0d5c39] font-bold text-white" : "bg-white text-[#3c443d] hover:bg-[#f2f5f0]"}`}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-3 mt-[2px] border-b border-[#e4e8e2] pb-[5px] text-[10px] font-bold tracking-[0.12em] text-[#5c665e]">ASSIGNMENT &amp; FEES</div>
                  <FormField label="Preferred rep">
                    <select value={editState.preferredRepId} onChange={(event) => setEditState({ ...editState, preferredRepId: event.target.value })} className={controlClass}>
                      <option value="">Unassigned</option>
                      {(repsQuery.data ?? []).map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Secondary rep">
                    <select value={editState.secondaryRepId} onChange={(event) => setEditState({ ...editState, secondaryRepId: event.target.value })} className={controlClass}>
                      <option value="">Unassigned</option>
                      {(repsQuery.data ?? []).map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Fee group" required>
                    <select required value={editState.bookingFeeGroupId} onChange={(event) => setEditState({ ...editState, bookingFeeGroupId: event.target.value })} className={controlClass}>
                      <option value="">Select fee group…</option>
                      {(feeGroupsQuery.data ?? []).map((group) => <option key={group.id} value={group.id}>{group.name} — {group.currency} {group.amount}</option>)}
                    </select>
                  </FormField>
                  {editError && <div className="col-span-3 text-[12px] text-[#a8341f]">{editError}</div>}
                </div>

                <div className="flex items-center border-t border-[#d7dcd5] bg-[#f2f5f0] px-[16px] py-[10px]">
                  <div className="text-[11px] text-[#7a8580]">Created {new Date(client.createdAt).toLocaleDateString()} · Demo profiles cannot be edited</div>
                  <div className="flex-1" />
                  <SecondaryButton type="button" className="mr-[10px] h-[30px] px-[16px] text-[12px]" onClick={closeEditClient}>Cancel</SecondaryButton>
                  <PrimaryButton type="submit" className="h-[30px] px-[18px] text-[12px]" disabled={updateClientMutation.isPending || !editState.name.trim() || !editState.bookingFeeGroupId || !editState.stage}>
                    {updateClientMutation.isPending ? "Saving…" : "Save Changes"}
                  </PrimaryButton>
                </div>
              </form>
            ) : (
            <section className="mb-[14px] border border-[#c3cbc2] bg-white">
              <div className="border-b border-[#d7dcd5] bg-[#eff2ec] px-[12px] py-[7px] text-[10px] font-bold tracking-[0.12em] text-[#5c665e]">
                CLIENT DETAILS
              </div>
              <div className="grid grid-cols-7 gap-x-[22px] gap-y-[18px] px-[18px] py-[16px]">
                <DetailField label="Client type">{client.clientType.charAt(0).toUpperCase() + client.clientType.slice(1)}</DetailField>
                <DetailField label="WhatsApp">{client.phoneNumber ?? "—"}</DetailField>
                <DetailField label="Onboarding stage">{client.stageName}</DetailField>
                <DetailField label="Preferred rep">{client.preferredRepName ?? "Unassigned"}</DetailField>
                <DetailField label="Secondary rep">{client.secondaryRepName ?? "Unassigned"}</DetailField>
                <DetailField label="Fee group">{client.bookingFeeGroupName}</DetailField>
                <DetailField label="Created">{new Date(client.createdAt).toLocaleDateString()}</DetailField>
              </div>
              {client.isDemo && (
                <div className="border-t border-[#e4e8e2] bg-[#fffaf0] px-[18px] py-[8px] text-[11.5px] text-[#765b16]">
                  This sample profile is controlled from System Administrator Setup. Disable demo data to hide it from operational screens.
                </div>
              )}
            </section>
            )}

            {showAddTraveller && (
              <form onSubmit={submitTraveller} className="mb-[14px] border border-[#c3cbc2] border-t-[3px] border-t-[#0d5c39] bg-white">
                <div className="flex items-center border-b border-[#e4e8e2] px-[16px] py-[10px]">
                  <div>
                    <div className="text-[14px] font-bold">Add traveller</div>
                    <div className="mt-[2px] text-[11px] text-[#6c766f]">The traveller will be linked to {client.name}.</div>
                  </div>
                  <div className="flex-1" />
                  <button type="button" aria-label="Close add traveller form" onClick={() => { setShowAddTraveller(false); resetAddForm(); }} className="text-[20px] text-[#6c766f]">×</button>
                </div>

                <div className="grid grid-cols-[190px_minmax(0,1fr)]">
                  <div className="border-r border-[#e4e8e2] bg-[#f9faf8] p-[12px]">
                    {([[
                      "new", "Create new traveller",
                    ], ["existing", "Add existing traveller"]] as Array<[AddMode, string]>).map(([mode, label]) => (
                      <button key={mode} type="button" onClick={() => { setAddMode(mode); resetAddForm(); }} className={`mb-[6px] w-full border px-[10px] py-[8px] text-left text-[12px] ${addMode === mode ? "border-[#0d5c39] bg-[#eaf2ed] font-bold text-[#0d5c39]" : "border-[#ccd3cb] bg-white text-[#3c443d]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-[18px] px-[18px] py-[16px]">
                    {addMode === "new" ? (
                      <>
                        <FormField label="Legal name" required>
                          <input autoFocus value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="Given and family name" className={controlClass} />
                        </FormField>
                        <FormField label="Date of birth" required>
                          <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} className={controlClass} />
                        </FormField>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <FormField label="Existing traveller" required>
                          <select autoFocus value={existingTravellerId} onChange={(event) => setExistingTravellerId(event.target.value)} className={controlClass}>
                            <option value="">Select traveller…</option>
                            {availableTravellers.map((traveller) => <option key={traveller.id} value={traveller.id}>{traveller.name}</option>)}
                          </select>
                          {!travellersQuery.isLoading && availableTravellers.length === 0 && <div className="mt-[4px] text-[11px] text-[#7a8580]">Every existing traveller is already linked to this client.</div>}
                        </FormField>
                      </div>
                    )}
                    <FormField label="Relationship" required>
                      <select value={relationship} onChange={(event) => setRelationship(event.target.value as TravellerRelationship | "")} className={controlClass}>
                        <option value="">Select relationship…</option>
                        {relationships.map((value) => <option key={value} value={value}>{RELATIONSHIP_LABELS[value]}</option>)}
                      </select>
                    </FormField>
                    {addMode === "new" && <div className="col-span-3 text-[11px] text-[#7a8580]">Passport information can be completed later from the Travellers area.</div>}
                    {error && <div className="col-span-3 text-[12px] text-[#a8341f]">{error}</div>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-[10px] border-t border-[#d7dcd5] bg-[#f2f5f0] px-[16px] py-[10px]">
                  <SecondaryButton type="button" className="h-[30px] px-[16px] text-[12px]" onClick={() => { setShowAddTraveller(false); resetAddForm(); }}>Cancel</SecondaryButton>
                  <PrimaryButton type="submit" className="h-[30px] px-[18px] text-[12px]" disabled={addPending}>
                    {addPending ? "Adding…" : addMode === "new" ? "Create & Add Traveller" : "Add Traveller"}
                  </PrimaryButton>
                </div>
              </form>
            )}

            {notice && <div className="mb-[14px] border border-[#b7d1bf] bg-[#eef6f0] px-[12px] py-[9px] text-[12px] text-[#0d5c39]">{notice}</div>}

            <section className="border border-[#c3cbc2] bg-white">
              <div className="flex items-center border-b border-[#d7dcd5] bg-[#eff2ec] px-[12px] py-[7px]">
                <div className="text-[10px] font-bold tracking-[0.12em] text-[#5c665e]">TRAVELLERS</div>
                <div className="flex-1" />
                <div className="text-[11px] text-[#6c766f]">{clientTravellersQuery.data?.length ?? 0} linked</div>
              </div>
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-[#f7f9f6]">
                  {['Traveller', 'Date of Birth', 'Relationship', 'Passport Status'].map((heading) => <th key={heading} className="border-b border-[#cfd6ce] px-[12px] py-[7px] text-left text-[11px] font-bold text-[#3c443d]">{heading}</th>)}
                </tr></thead>
                <tbody>
                  {(clientTravellersQuery.data ?? []).map((traveller) => (
                    <tr key={traveller.id} className="hover:bg-[#f7f9f6]">
                      <td className="border-b border-[#edf0ea] px-[12px] py-[10px] font-bold text-[#0b5c3b]"><Link to="/travellers/$travellerId" params={{ travellerId: String(traveller.id) }} className="underline">{traveller.name}</Link></td>
                      <td className="border-b border-[#edf0ea] px-[12px] py-[10px]">{dateLabel(traveller.dob)}</td>
                      <td className="border-b border-[#edf0ea] px-[12px] py-[10px]">{traveller.relationship ? RELATIONSHIP_LABELS[traveller.relationship as TravellerRelationship] ?? traveller.relationship : "—"}</td>
                      <td className={`border-b border-[#edf0ea] px-[12px] py-[10px] font-bold ${traveller.passportStatus === "missing" ? "text-[#a8341f]" : traveller.passportStatus === "expiring_soon" ? "text-[#8a6d10]" : "text-[#0d5c39]"}`}>{passportLabel(traveller.passportStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clientTravellersQuery.isLoading && <div className="p-[24px] text-center text-[12px] text-[#6c766f]">Loading travellers…</div>}
              {!clientTravellersQuery.isLoading && (clientTravellersQuery.data?.length ?? 0) === 0 && <div className="p-[24px] text-center text-[12px] text-[#6c766f]">No travellers are linked to this client yet. Use Add Traveller to create or attach one.</div>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
