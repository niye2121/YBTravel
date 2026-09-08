import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { WhatsAppSubnav } from "../components/AppShell/WhatsAppSubnav";
import {
  messagingApi,
  requestWorkflowSettingsApi,
  requestsApi,
  type CreateWhatsAppGroupInput,
  type GroupParticipantInput,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/whatsapp-groups")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "whatsapp.read")) throw redirect({ to: "/" });
  },
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
  const canCreate = hasPermission(user, "whatsapp.create_groups");
  const canCreateRequest = hasPermission(user, "requests.create");

  const accountsQuery = useQuery({
    queryKey: ["messaging", "accounts"],
    queryFn: messagingApi.listAccounts,
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
  const conversationsQuery = useQuery({
    queryKey: ["messaging", "conversations"],
    queryFn: messagingApi.listConversations,
  });
  const requestSettingsQuery = useQuery({
    queryKey: ["request-workflow-settings", "active"],
    queryFn: requestWorkflowSettingsApi.listActive,
    enabled: canCreate && canCreateRequest,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [clientId, setClientId] = useState("");
  const [travelRequestId, setTravelRequestId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [travellerPhones, setTravellerPhones] = useState<PhoneSelections>({});
  const [staffPhones, setStaffPhones] = useState<PhoneSelections>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [tripSummary, setTripSummary] = useState("");
  const [requestTypeId, setRequestTypeId] = useState("");
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

  useEffect(() => {
    if (!requestFormOpen || requestTypeId) return;
    const defaultType = requestSettingsQuery.data?.requestTypes[0];
    if (defaultType) setRequestTypeId(String(defaultType.id));
  }, [requestFormOpen, requestTypeId, requestSettingsQuery.data?.requestTypes]);

  useEffect(() => {
    if (accountId || !accountsQuery.data?.length) return;
    const primary = accountsQuery.data.find((account) => account.isPrimary) ?? accountsQuery.data[0];
    if (primary) setAccountId(String(primary.id));
  }, [accountId, accountsQuery.data]);

  const requestMutation = useMutation({
    mutationFn: requestsApi.create,
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ["messaging", "group-options"] });
      setTravelRequestId(String(request.id));
      if (selectedClient) setGroupName(`${selectedClient.name} · ${request.requestNumber}`);
      setTripSummary("");
      setRequestTypeId("");
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
    const nextClient = options?.clients.find((client) => String(client.id) === value);
    const newestRequest = (options?.requests ?? []).find(
      (request) => String(request.clientId) === value,
    );
    setClientId(value);
    setTravelRequestId(newestRequest ? String(newestRequest.id) : "");
    setGroupName(
      nextClient && newestRequest ? `${nextClient.name} · ${newestRequest.requestNumber}` : "",
    );
    setTravellerPhones({});
    setStaffPhones({});
    setTripSummary("");
    setRequestFormOpen(canCreateRequest && Boolean(value) && !newestRequest);
    setRequestError(null);
    setFormError(null);
  }

  function changeRequest(value: string) {
    const request = clientRequests.find((item) => String(item.id) === value);
    setTravelRequestId(value);
    setGroupName(selectedClient && request ? `${selectedClient.name} · ${request.requestNumber}` : "");
    setRequestFormOpen(false);
    setFormError(null);
  }

  function toggleSelection(
    id: number,
    selections: PhoneSelections,
    setSelections: (value: PhoneSelections) => void,
    defaultPhone = "",
  ) {
    if (Object.prototype.hasOwnProperty.call(selections, id)) {
      const next = { ...selections };
      delete next[id];
      setSelections(next);
    } else {
      setSelections({ ...selections, [id]: defaultPhone });
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
      accountId: Number(accountId),
      clientId: Number(clientId),
      travelRequestId: Number(travelRequestId),
      name: groupName,
      travellers: toParticipants(travellerPhones),
      staff: toParticipants(staffPhones),
    };
    groupMutation.mutate(input);
  }

  const selectedTravellerCount = Object.keys(travellerPhones).length;
  const selectedStaffCount = Object.keys(staffPhones).length;
  const selectedCount = selectedTravellerCount + selectedStaffCount;
  const selectedPhones = [...Object.values(travellerPhones), ...Object.values(staffPhones)];
  const participantPhonesReady =
    selectedPhones.length > 0 && selectedPhones.every((phone) => phone.replace(/\D/g, "").length >= 8);
  const selectedAccount = accountsQuery.data?.find((account) => String(account.id) === accountId);
  const connected = selectedAccount?.status === "connected";
  const groups = groupsQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];
  const groupCanSubmit =
    connected &&
    Boolean(clientId) &&
    Boolean(travelRequestId) &&
    Boolean(groupName.trim()) &&
    participantPhonesReady;

  const nextStepMessage = !connected
    ? "WhatsApp must be connected before the group can be created."
    : !clientId
      ? "Start by selecting a client."
      : !travelRequestId
        ? "Save a new travel request below, or select an existing request."
        : selectedCount === 0
          ? "Select at least one traveller or staff participant."
          : !participantPhonesReady
            ? "Enter a valid WhatsApp number with country code for every selected participant."
            : !groupName.trim()
              ? "Enter a group name or use Generate Name."
              : "Ready to create in WhatsApp.";

  return (
    <div className="min-h-screen min-w-[1180px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} compact />
      <WhatsAppSubnav active="groups" conversationCount={conversations.length} groupCount={groups.length} showSecondaryTabs />

      <div className="flex flex-wrap items-center gap-[20px] px-[24px] pt-[18px] pb-[14px]">
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-yb-muted4">WHATSAPP</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] yb-page-title">Managed Groups</h1>
            <span className="text-[12px] text-yb-muted3">{groups.length} {groups.length === 1 ? "group" : "groups"}</span>
          </div>
        </div>
        <div className="flex-1" />
        <Link to="/inbox" className="flex h-[36px] items-center rounded-yb border border-yb-line-btn bg-white px-[14px] text-[13px] font-medium text-yb-ink hover:bg-yb-row-hover">Back to Inbox</Link>
        {canCreate && (
          <PrimaryButton onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? "Close Form" : "+ New Group"}
          </PrimaryButton>
        )}
      </div>

      {!canCreate && (
        <div className="mx-[22px] border border-yb-line bg-yb-toolbar px-[14px] py-[10px] text-[13px] text-yb-ink2">
          You can review managed groups. Creating one requires the WhatsApp group permission.
        </div>
      )}

      {formOpen && canCreate && (
        <form onSubmit={submitGroup} className="yb-card mx-[22px] overflow-hidden rounded-yb border border-yb-line border-t-[3px] border-t-yb-green bg-white">
          <div className="flex items-center border-b border-yb-line-soft px-[16px] py-[10px]">
            <div className="text-[14px] font-black">Create a linked WhatsApp group</div>
            <div className="ml-[10px] text-[11.5px] text-yb-muted3">Link the group, add participants, and name it.</div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 px-[20px] py-[16px]">
              <div className="mb-[12px] border-b border-yb-line-soft pb-[6px] text-[10.5px] font-bold tracking-[1.3px] text-yb-panel-head-text">STEP 1 · LINK THE GROUP</div>
              <div className="mb-[12px] grid grid-cols-[90px_minmax(0,1fr)] items-start gap-[10px]">
                <label htmlFor="whatsapp-group-account" className="pt-[9px] text-right text-[12px] text-yb-muted"><span className="mr-[3px] font-bold text-yb-red">*</span>Account</label>
                <div><select id="whatsapp-group-account" required value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass}><option value="">Select connected account</option>{(accountsQuery.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.label} · {account.status === "connected" ? `+${account.phoneNumber}` : "not connected"}</option>)}</select><div className="mt-[3px] text-[11px] text-yb-muted4">This number will own the WhatsApp group and route its messages.</div></div>
              </div>
              <div className="grid grid-cols-2 gap-x-[30px]">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-[10px]">
                  <label htmlFor="whatsapp-group-client" className="pt-[9px] text-right text-[12px] text-yb-muted"><span className="mr-[3px] font-bold text-yb-red">*</span>Client</label>
                  <div>
                    <select id="whatsapp-group-client" required value={clientId} onChange={(event) => changeClient(event.target.value)} className={inputClass}>
                      <option value="">Select client</option>
                      {(options?.clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    <div className="mt-[3px] text-[11px] text-yb-muted4">Travellers below load from this client.</div>
                  </div>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-[10px]">
                  <label htmlFor="whatsapp-group-request" className="pt-[9px] text-right text-[12px] text-yb-muted"><span className="mr-[3px] font-bold text-yb-red">*</span>Travel request</label>
                  <div>
                    <select id="whatsapp-group-request" required value={travelRequestId} onChange={(event) => changeRequest(event.target.value)} disabled={!clientId} className={inputClass}>
                      <option value="">Select saved request</option>
                      {clientRequests.map((request) => <option key={request.id} value={request.id}>{request.requestNumber} — {request.tripSummary}</option>)}
                    </select>
                    <div className="mt-[3px] text-[11px] text-yb-muted4">
                      {!clientId
                        ? "Choose a client first."
                        : clientRequests.length === 0
                          ? canCreateRequest ? "No saved request exists for this client. Create one below." : "No saved request exists, and you do not have permission to create one."
                          : `${clientRequests.length} saved request${clientRequests.length === 1 ? "" : "s"}; the newest is selected automatically.`}
                    </div>
                    {clientId && canCreateRequest && (
                      <button type="button" onClick={() => setRequestFormOpen((open) => !open)} className="mt-[4px] text-[11.5px] text-yb-green underline">
                        {requestFormOpen ? "Cancel new request" : "+ Add a real request record"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {requestFormOpen && canCreateRequest && (
                <div className="mt-[12px] border border-yb-line-soft bg-yb-toolbar p-[10px]">
                  <div className="text-[12.5px] font-bold">New request for {selectedClient?.name}</div>
                  <div className="mt-[7px] grid grid-cols-[220px_1fr_auto] items-end gap-[10px]">
                    <label className="text-[12px] text-yb-muted">Request type<select required value={requestTypeId} onChange={(event) => setRequestTypeId(event.target.value)} className={inputClass}><option value="">Select type</option>{(requestSettingsQuery.data?.requestTypes ?? []).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
                    <label className="text-[12px] text-yb-muted">Trip summary<input required value={tripSummary} onChange={(event) => setTripSummary(event.target.value)} placeholder="JFK → TLV · 14 Aug – 2 Sep" className={inputClass} /></label>
                    <PrimaryButton type="button" disabled={!requestTypeId || !tripSummary.trim() || requestMutation.isPending} onClick={() => requestMutation.mutate({ clientId: Number(clientId), tripSummary, requestTypeId: Number(requestTypeId) })}>{requestMutation.isPending ? "Saving…" : "Save request & continue"}</PrimaryButton>
                  </div>
                  {requestError && <div className="mt-[7px] text-[12px] text-yb-red">{requestError}</div>}
                </div>
              )}

              <div className="mt-[14px] mb-[12px] flex items-center gap-[9px] border-b border-yb-line-soft pb-[6px] text-[10.5px] font-bold tracking-[1.3px] text-yb-panel-head-text">
                <span>STEP 2 · PARTICIPANTS</span>
                <span className="font-normal tracking-normal text-yb-muted3">{selectedCount === 0 ? "none selected yet" : `${selectedCount} selected (${selectedTravellerCount} travellers, ${selectedStaffCount} staff)`}</span>
              </div>
              <div className="grid grid-cols-2 gap-[14px]">
                <div className="border border-yb-line-soft bg-white">
                  <div className="flex items-center border-b border-yb-line-soft bg-yb-table-head px-[9px] py-[6px]"><span className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">TRAVELLERS</span><div className="flex-1" /><span className="text-[10.5px] text-yb-muted4">{clientTravellers.length || "—"}</span></div>
                  <div className="max-h-[210px] overflow-y-auto">
                    {clientTravellers.map((traveller) => {
                      const selected = Object.prototype.hasOwnProperty.call(travellerPhones, traveller.id);
                      return <div key={traveller.id} className={`border-b border-yb-line-row px-[10px] py-[7px] ${selected ? "bg-yb-row-hover" : "bg-white"}`}><label className="flex items-center gap-[8px] text-[12.5px] font-bold"><input type="checkbox" checked={selected} onChange={() => toggleSelection(traveller.id, travellerPhones, setTravellerPhones)} />{traveller.name}</label>{selected && <input required value={travellerPhones[traveller.id]} onChange={(event) => setTravellerPhones({ ...travellerPhones, [traveller.id]: event.target.value })} placeholder="WhatsApp number with country code" className={inputClass} />}</div>;
                    })}
                    {!clientId && <div className="px-[10px] py-[22px] text-center text-[12px] text-yb-muted3">Choose a client to load travellers.</div>}
                    {clientId && clientTravellers.length === 0 && <div className="px-[10px] py-[22px] text-center text-[12px] text-yb-muted3">No travellers are linked to this client.</div>}
                  </div>
                </div>
                <div className="border border-yb-line-soft bg-white">
                  <div className="border-b border-yb-line-soft bg-yb-table-head px-[9px] py-[6px] text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">STAFF</div>
                  <div className="max-h-[210px] overflow-y-auto">
                    {(options?.staff ?? []).map((staff) => {
                      const selected = Object.prototype.hasOwnProperty.call(staffPhones, staff.id);
                      return <div key={staff.id} className={`border-b border-yb-line-row px-[10px] py-[7px] ${selected ? "bg-yb-row-hover" : "bg-white"}`}><label className="flex items-center gap-[8px] text-[12.5px] font-bold"><input type="checkbox" disabled={!staff.phoneNumber} checked={selected} onChange={() => toggleSelection(staff.id, staffPhones, setStaffPhones, staff.phoneNumber ?? "")} />{staff.name}<span className="font-normal text-yb-muted3">{staff.roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}</span></label><div className={`mt-[3px] pl-[22px] text-[11px] ${staff.phoneNumber ? "text-yb-muted3" : "font-bold text-yb-red"}`}>{staff.phoneNumber ? displayPhone(staff.phoneNumber) : "Add a WhatsApp number in the employee profile first"}</div>{selected && <input readOnly value={staffPhones[staff.id]} className={`${inputClass} bg-yb-toolbar`} />}</div>;
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-[16px] mb-[10px] border-b border-yb-line-soft pb-[6px] text-[10.5px] font-bold tracking-[1.3px] text-yb-panel-head-text">STEP 3 · NAME THE GROUP</div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-[10px]">
                <label htmlFor="whatsapp-group-name" className="pt-[9px] text-right text-[12px] text-yb-muted"><span className="mr-[3px] font-bold text-yb-red">*</span>Group name</label>
                <div><div className="flex items-end gap-[8px]"><input id="whatsapp-group-name" required maxLength={100} value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Select a request to generate the name" className={inputClass} /><SecondaryButton type="button" className="shrink-0" disabled={!travelRequestId} onClick={generateName}>Generate Name</SecondaryButton></div><div className="mt-[3px] text-[11px] text-yb-muted4">A suggested name is filled automatically after the request is selected. You may edit it.</div></div>
              </div>
            </div>

            <aside className="border-l border-yb-line-soft bg-yb-toolbar px-[18px] py-[16px]">
              <div className="mb-[8px] text-[10.5px] font-bold tracking-[1.2px] text-yb-panel-head-text">GROUP PREVIEW</div>
              <div className="border border-yb-line-soft bg-white p-[10px]">
                <div className="flex items-center gap-[9px]"><div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-yb-green text-[11px] font-bold text-white">GR</div><div className="min-w-0"><div className="truncate text-[12.5px] font-bold">{groupName.trim() || "Group name will appear here"}</div><div className="text-[11px] text-yb-muted4">{selectedCount + 1} participant{selectedCount === 0 ? "" : "s"} incl. desk number</div></div></div>
              </div>
              <div className="mt-[12px] text-[11.5px] leading-[18px] text-yb-muted2">The selected account <strong>{selectedAccount?.label ?? "—"}</strong> {selectedAccount?.phoneNumber ? `(+${selectedAccount.phoneNumber.replace(/^\+/, "")})` : ""} is included automatically by WhatsApp.</div>
              <div className="my-[12px] border-t border-yb-line-row" />
              <div className="text-[11.5px] leading-[18px] text-yb-muted3">Each selected participant must have a valid WhatsApp number. Registration is checked before the group is created.</div>
            </aside>
          </div>

          <div className="flex items-center gap-[10px] border-t border-yb-line bg-yb-panel-head px-[16px] py-[10px]">
            <div>
              <div className="flex flex-wrap gap-[6px]">
                {[
                  [Boolean(clientId), "1. Client"],
                  [Boolean(travelRequestId), "2. Request"],
                  [participantPhonesReady, "3. Participants + numbers"],
                  [Boolean(groupName.trim()), "4. Group name"],
                ].map(([complete, label]) => (
                  <span key={String(label)} className={`border px-[7px] py-[3px] text-[10.5px] font-bold ${complete ? "border-[#b9d7c4] bg-[#edf7f0] text-yb-green" : "border-yb-line-btn bg-white text-yb-muted3"}`}>
                    {complete ? "✓ " : ""}{label}
                  </span>
                ))}
              </div>
              <div className={`mt-[5px] text-[11.5px] ${formError || !connected ? "text-yb-red" : "text-yb-muted3"}`}>
                {formError ?? nextStepMessage}
              </div>
            </div>
            <div className="flex-1" />
            <SecondaryButton type="button" onClick={() => setFormOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={!groupCanSubmit || groupMutation.isPending}>{groupMutation.isPending ? "Creating in WhatsApp…" : "Create WhatsApp Group"}</PrimaryButton>
          </div>
        </form>
      )}

      <div className="mx-[24px] mb-[26px] overflow-hidden rounded-yb-panel border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[12px] py-[7px]"><div className="text-[10.5px] font-bold tracking-[1.2px] text-yb-panel-head-text">MANAGED WHATSAPP GROUPS</div><div className="flex-1" /><div className="text-[11px] text-yb-muted3">{groups.length} groups</div></div>
        <table className="w-full table-fixed border-collapse text-[12.5px]">
          <thead><tr className="bg-yb-table-head"><th className="w-[250px] border-b border-yb-line px-[12px] py-[7px] text-left text-[11px] font-bold text-yb-muted">Group</th><th className="w-[170px] border-b border-yb-line px-[12px] py-[7px] text-left text-[11px] font-bold text-yb-muted">Client</th><th className="w-[210px] border-b border-yb-line px-[12px] py-[7px] text-left text-[11px] font-bold text-yb-muted">Request</th><th className="border-b border-yb-line px-[12px] py-[7px] text-left text-[11px] font-bold text-yb-muted">Participants</th><th className="w-[100px] border-b border-yb-line px-[12px] py-[7px] text-left text-[11px] font-bold text-yb-muted">Status</th><th className="w-[150px] border-b border-yb-line px-[12px] py-[7px] text-right text-[11px] font-bold text-yb-muted">Created by</th></tr></thead>
          <tbody>{groups.map((group) => <tr key={group.id} className="hover:bg-yb-row-hover"><td className="border-b border-yb-line-row px-[12px] py-[9px]">{group.conversationId !== null ? <Link to="/inbox" search={{ conversationId: group.conversationId }} className="font-bold text-yb-green underline">{group.name}</Link> : <div className="font-bold text-yb-muted3">{group.name}</div>}<div className="mt-[2px] truncate text-[10px] font-bold text-yb-muted3">{group.accountLabel}</div><div className="mt-[2px] truncate font-mono text-[10px] text-yb-muted4">{group.whatsappGroupId ?? "Provider ID pending"}</div>{group.conversationId !== null && <div className="mt-[3px] text-[10.5px] text-yb-muted3">Open conversation to read and send messages</div>}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]">{group.clientName}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]"><div className="font-bold">{group.requestNumber}</div><div className="mt-[2px] truncate text-[11px] text-yb-muted3">{group.tripSummary}</div></td><td className="border-b border-yb-line-row px-[12px] py-[9px] text-yb-ink2">{group.participants.length === 0 ? "—" : `${group.participants.length} (${group.participants.filter((p) => p.type === "traveller").length} travellers, ${group.participants.filter((p) => p.type === "staff").length} staff)`}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]">{group.status === "active" ? <span className="inline-flex items-center gap-[5px] text-yb-green"><span className="h-[7px] w-[7px] rounded-full bg-[#2f8a4f]" />Active</span> : group.status === "failed" ? <span title={group.failureReason ?? undefined} className="font-bold text-yb-red">Failed</span> : <span className="font-bold text-yb-amber">Creating</span>}</td><td className="border-b border-yb-line-row px-[12px] py-[9px] text-right text-yb-muted3">{group.createdByName}</td></tr>)}</tbody>
        </table>
        {groupsQuery.isLoading && <div className="px-[14px] py-[28px] text-center text-[13px] text-yb-muted3">Loading groups…</div>}
        {!groupsQuery.isLoading && groups.length === 0 && <div className="px-[14px] py-[28px] text-center text-[13px] text-yb-muted3">No WhatsApp groups have been created from YB Travel yet.</div>}
      </div>
    </div>
  );
}
