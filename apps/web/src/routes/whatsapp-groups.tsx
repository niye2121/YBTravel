import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  messagingApi,
  requestsApi,
  type CreateWhatsAppGroupInput,
  type GroupParticipantInput,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser } from "../lib/session";

export const Route = createFileRoute("/whatsapp-groups")({
  component: WhatsAppGroupsPage,
});

const inputClass =
  "mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink";

const ROLE_LABELS: Record<string, string> = {
  offshore_intake_employee: "Offshore Intake",
  travel_agent: "Travel Agent",
  system_administrator: "System Administrator",
  supervisor_manager: "Supervisor / Manager",
  ticketing_agent: "Ticketing Agent",
  finance_user: "Finance User",
};

type PhoneSelections = Record<number, string>;

function displayPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : "—";
}

function WhatsAppGroupsPage() {
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const canCreate =
    user?.roles.some((role) => role === "travel_agent" || role === "system_administrator") ?? false;

  const statusQuery = useQuery({
    queryKey: ["messaging", "status"],
    queryFn: messagingApi.getStatus,
    refetchInterval: 5000,
  });
  const optionsQuery = useQuery({
    queryKey: ["messaging", "group-options"],
    queryFn: messagingApi.getGroupOptions,
  });
  const groupsQuery = useQuery({
    queryKey: ["messaging", "groups"],
    queryFn: messagingApi.listGroups,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [travelRequestId, setTravelRequestId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [travellerPhones, setTravellerPhones] = useState<PhoneSelections>({});
  const [staffPhones, setStaffPhones] = useState<PhoneSelections>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [tripSummary, setTripSummary] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);

  const options = optionsQuery.data;
  const selectedClient = options?.clients.find((client) => String(client.id) === clientId);
  const clientRequests = useMemo(
    () => (options?.requests ?? []).filter((request) => String(request.clientId) === clientId),
    [options?.requests, clientId],
  );
  const clientTravellers = useMemo(
    () =>
      (options?.travellers ?? []).filter(
        (traveller) => clientId && traveller.clientIds.includes(Number(clientId)),
      ),
    [options?.travellers, clientId],
  );

  const requestMutation = useMutation({
    mutationFn: requestsApi.create,
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ["messaging", "group-options"] });
      setTravelRequestId(String(request.id));
      setTripSummary("");
      setRequestFormOpen(false);
      setRequestError(null);
    },
    onError: (error: unknown) => {
      setRequestError(error instanceof Error ? error.message : "Failed to create travel request");
    },
  });

  const groupMutation = useMutation({
    mutationFn: messagingApi.createGroup,
    onSuccess: async (group) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messaging", "groups"] }),
        queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] }),
      ]);
      setFormOpen(false);
      setClientId("");
      setTravelRequestId("");
      setGroupName("");
      setTravellerPhones({});
      setStaffPhones({});
      setFormError(null);
      if (group.conversationId !== null) {
        void queryClient.invalidateQueries({
          queryKey: ["messaging", "conversations", group.conversationId, "messages"],
        });
      }
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : "Failed to create WhatsApp group");
    },
  });

  function changeClient(value: string) {
    setClientId(value);
    setTravelRequestId("");
    setGroupName("");
    setTravellerPhones({});
    setRequestFormOpen(false);
    setRequestError(null);
  }

  function toggleSelection(
    id: number,
    selections: PhoneSelections,
    setSelections: (value: PhoneSelections) => void,
  ) {
    if (Object.prototype.hasOwnProperty.call(selections, id)) {
      const next = { ...selections };
      delete next[id];
      setSelections(next);
    } else {
      setSelections({ ...selections, [id]: "" });
    }
  }

  function toParticipants(selections: PhoneSelections): GroupParticipantInput[] {
    return Object.entries(selections).map(([id, phoneNumber]) => ({
      id: Number(id),
      phoneNumber,
    }));
  }

  function generateName() {
    const request = clientRequests.find((item) => String(item.id) === travelRequestId);
    if (!selectedClient || !request) {
      setFormError("Select a client and travel request before generating the name");
      return;
    }
    setGroupName(`${selectedClient.name} · ${request.requestNumber}`);
    setFormError(null);
  }

  function submitGroup(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const input: CreateWhatsAppGroupInput = {
      clientId: Number(clientId),
      travelRequestId: Number(travelRequestId),
      name: groupName,
      travellers: toParticipants(travellerPhones),
      staff: toParticipants(staffPhones),
    };
    groupMutation.mutate(input);
  }

  const selectedCount = Object.keys(travellerPhones).length + Object.keys(staffPhones).length;
  const connected = statusQuery.data?.status === "connected";
  const groups = groupsQuery.data ?? [];

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] border-b border-yb-line-head px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">WHATSAPP</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">Managed Groups</h1>
            <span className={connected ? "text-[13px] font-bold text-yb-green" : "text-[13px] font-bold text-yb-red"}>
              {connected ? "Connected" : "WhatsApp disconnected"}
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <Link to="/inbox" className="text-[13px] text-yb-green underline">Back to Inbox</Link>
        {canCreate && (
          <PrimaryButton onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? "Cancel" : "+ Create WhatsApp Group"}
          </PrimaryButton>
        )}
      </div>

      {!canCreate && (
        <div className="mx-[22px] mt-[14px] border border-yb-line bg-yb-toolbar px-[14px] py-[10px] text-[13px] text-yb-ink2">
          You can review managed groups. Creating a group currently requires the Travel Agent or System Administrator role.
        </div>
      )}

      {formOpen && canCreate && (
        <form onSubmit={submitGroup} className="mx-[22px] mt-[16px] border border-yb-line bg-yb-panel-head p-[16px]">
          <div className="mb-[12px] flex items-center">
            <div>
              <div className="text-[15px] font-black">Create a linked WhatsApp group</div>
              <div className="mt-[2px] text-[12.5px] text-yb-muted3">
                The connected YB Travel number is included automatically by WhatsApp.
              </div>
            </div>
            <div className="flex-1" />
            <div className="text-[12.5px] font-bold text-yb-muted">{selectedCount} selected participant{selectedCount === 1 ? "" : "s"}</div>
          </div>

          <div className="grid grid-cols-2 gap-[14px]">
            <label className="text-[13px] text-yb-muted">
              Client
              <select required value={clientId} onChange={(event) => changeClient(event.target.value)} className={inputClass}>
                <option value="">Select client</option>
                {(options?.clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <div>
              <label className="text-[13px] text-yb-muted">
                Travel request
                <select required value={travelRequestId} onChange={(event) => setTravelRequestId(event.target.value)} disabled={!clientId} className={inputClass}>
                  <option value="">Select saved request</option>
                  {clientRequests.map((request) => <option key={request.id} value={request.id}>{request.requestNumber} — {request.tripSummary}</option>)}
                </select>
              </label>
              {clientId && (
                <button type="button" onClick={() => setRequestFormOpen((open) => !open)} className="mt-[5px] text-[12.5px] text-yb-green underline">
                  {requestFormOpen ? "Cancel new request" : "+ Add a real request record"}
                </button>
              )}
            </div>
          </div>

          {requestFormOpen && (
            <div className="mt-[10px] border border-yb-line-soft bg-white p-[10px]">
              <div className="text-[12.5px] font-bold">New request for {selectedClient?.name}</div>
              <div className="mt-[7px] flex items-end gap-[10px]">
                <label className="flex-1 text-[12.5px] text-yb-muted">
                  Trip summary
                  <input required value={tripSummary} onChange={(event) => setTripSummary(event.target.value)} placeholder="JFK → TLV · 14 Aug – 2 Sep" className={inputClass} />
                </label>
                <PrimaryButton type="button" disabled={!tripSummary.trim() || requestMutation.isPending} onClick={() => requestMutation.mutate({ clientId: Number(clientId), tripSummary })}>
                  {requestMutation.isPending ? "Saving…" : "Save Request"}
                </PrimaryButton>
              </div>
              {requestError && <div className="mt-[7px] text-[12.5px] text-yb-red">{requestError}</div>}
            </div>
          )}

          <div className="mt-[14px] grid grid-cols-2 gap-[14px]">
            <div className="border border-yb-line bg-white">
              <div className="border-b border-yb-line bg-yb-table-head px-[10px] py-[7px] text-[12px] font-bold tracking-[0.7px] text-yb-muted">TRAVELLERS FOR THIS CLIENT</div>
              <div className="max-h-[220px] overflow-y-auto">
                {clientTravellers.map((traveller) => {
                  const selected = Object.prototype.hasOwnProperty.call(travellerPhones, traveller.id);
                  return (
                    <div key={traveller.id} className="border-b border-yb-line-row px-[10px] py-[8px]">
                      <label className="flex items-center gap-[7px] text-[13px] font-bold">
                        <input type="checkbox" checked={selected} onChange={() => toggleSelection(traveller.id, travellerPhones, setTravellerPhones)} />
                        {traveller.name}
                      </label>
                      {selected && <input required value={travellerPhones[traveller.id]} onChange={(event) => setTravellerPhones({ ...travellerPhones, [traveller.id]: event.target.value })} placeholder="WhatsApp number with country code" className={inputClass} />}
                    </div>
                  );
                })}
                {!clientId && <div className="px-[10px] py-[18px] text-center text-[12.5px] text-yb-muted3">Select a client first.</div>}
                {clientId && clientTravellers.length === 0 && <div className="px-[10px] py-[18px] text-center text-[12.5px] text-yb-muted3">No travellers are linked to this client.</div>}
              </div>
            </div>

            <div className="border border-yb-line bg-white">
              <div className="border-b border-yb-line bg-yb-table-head px-[10px] py-[7px] text-[12px] font-bold tracking-[0.7px] text-yb-muted">STAFF PARTICIPANTS</div>
              <div className="max-h-[220px] overflow-y-auto">
                {(options?.staff ?? []).map((staff) => {
                  const selected = Object.prototype.hasOwnProperty.call(staffPhones, staff.id);
                  return (
                    <div key={staff.id} className="border-b border-yb-line-row px-[10px] py-[8px]">
                      <label className="flex items-center gap-[7px] text-[13px] font-bold">
                        <input type="checkbox" checked={selected} onChange={() => toggleSelection(staff.id, staffPhones, setStaffPhones)} />
                        {staff.name}
                        <span className="font-normal text-yb-muted3">{staff.roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}</span>
                      </label>
                      {selected && <input required value={staffPhones[staff.id]} onChange={(event) => setStaffPhones({ ...staffPhones, [staff.id]: event.target.value })} placeholder="WhatsApp number with country code" className={inputClass} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-[14px] grid grid-cols-[1fr_auto] items-end gap-[10px]">
            <label className="text-[13px] text-yb-muted">
              Group name
              <input required maxLength={100} value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Enter a name or generate one" className={inputClass} />
            </label>
            <SecondaryButton type="button" onClick={generateName}>Generate Name</SecondaryButton>
          </div>

          {formError && <div className="mt-[10px] text-[13px] text-yb-red">{formError}</div>}
          {!connected && <div className="mt-[10px] text-[13px] font-bold text-yb-red">WhatsApp must be connected before the group can be created.</div>}

          <div className="mt-[14px] flex gap-[10px]">
            <PrimaryButton type="submit" disabled={!connected || !clientId || !travelRequestId || !groupName.trim() || selectedCount === 0 || groupMutation.isPending}>
              {groupMutation.isPending ? "Creating in WhatsApp…" : "Create WhatsApp Group"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setFormOpen(false)}>Cancel</SecondaryButton>
          </div>
        </form>
      )}

      <div className="mx-[22px] mt-[16px] mb-[26px] border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-[8px]">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">MANAGED WHATSAPP GROUPS</div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{groups.length} groups</div>
        </div>
        <table className="w-full table-fixed border-collapse text-[13.5px]">
          <thead><tr className="bg-yb-table-head"><th className="w-[230px] border-b border-yb-line py-[7px] pl-[14px] text-left font-bold text-yb-muted">Group</th><th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Client</th><th className="w-[250px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Request</th><th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Participants</th><th className="w-[100px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Status</th><th className="w-[150px] border-b border-yb-line py-[7px] pr-[14px] text-right font-bold text-yb-muted">Created by</th></tr></thead>
          <tbody>{groups.map((group) => <tr key={group.id} className="hover:bg-yb-row-hover"><td className="border-b border-yb-line-row py-[10px] pl-[14px]"><div className="font-bold">{group.name}</div><div className="mt-[2px] truncate font-mono text-[10.5px] text-yb-muted4">{group.whatsappGroupId ?? "Provider ID pending"}</div></td><td className="border-b border-yb-line-row px-2 py-[10px]">{group.clientName}</td><td className="border-b border-yb-line-row px-2 py-[10px]"><div className="font-bold">{group.requestNumber}</div><div className="mt-[2px] truncate text-[12px] text-yb-muted3">{group.tripSummary}</div></td><td className="border-b border-yb-line-row px-2 py-[10px] text-yb-ink2">{group.participants.length === 0 ? "—" : group.participants.map((participant, index) => <span key={`${participant.type}-${participant.entityId}`}>{index > 0 && ", "}{participant.displayName} <span className="text-yb-muted4">({displayPhone(participant.phoneNumber)})</span></span>)}</td><td className="border-b border-yb-line-row px-2 py-[10px]">{group.status === "active" ? <span className="font-bold text-yb-green">Active</span> : group.status === "failed" ? <span title={group.failureReason ?? undefined} className="font-bold text-yb-red">Failed</span> : <span className="font-bold text-yb-amber">Creating</span>}</td><td className="border-b border-yb-line-row py-[10px] pr-[14px] text-right text-yb-muted3">{group.createdByName}</td></tr>)}</tbody>
        </table>
        {groupsQuery.isLoading && <div className="px-[14px] py-[28px] text-center text-[13.5px] text-yb-muted3">Loading groups…</div>}
        {!groupsQuery.isLoading && groups.length === 0 && <div className="px-[14px] py-[28px] text-center text-[13.5px] text-yb-muted3">No WhatsApp groups have been created from YB Travel yet.</div>}
      </div>
    </div>
  );
}
