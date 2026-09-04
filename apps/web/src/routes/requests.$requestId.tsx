import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { GROUPS, money, type RequestRow } from "../data/requestsData";
import { useAuth } from "../lib/AuthContext";
import { bookingFeesApi, messagingApi, requestsApi, type PassengerCategory, type RequestDetailsInput } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { EntityRecordsPanel } from "../components/EntityRecordsPanel";

export const Route = createFileRoute("/requests/$requestId")({ component: RequestDetailPage });

function dateTimeLabel(value: string | null): string {
  if (!value) return "Not configured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-[4px] text-[10px] font-bold uppercase tracking-[0.11em] text-[#6c766f]">{label}</div>
      <div className="text-[13px] leading-[18px] text-[#2c332d]">{children}</div>
    </div>
  );
}

function DemoRequestDetail({ request }: { request: RequestRow }) {
  const fare = request.fareText ?? (request.fare !== undefined ? money(request.fare) : "—");
  const deadline = request.deadline ?? request.deadlinePrefix ?? "Not configured";

  return (
    <>
      <header className="mb-[12px] flex items-end gap-[12px]">
        <div className="h-[22px] w-[22px] border border-[#b0b8ae] bg-white p-[5px]" aria-hidden="true">
          <div className="h-full w-full bg-[#d9a01e]" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#6c766f]">Demonstration request</div>
          <div className="flex items-baseline gap-[9px]">
            <h1 className="text-[24px] font-bold tracking-[-0.01em]">{request.id}</h1>
            <span className="border border-[#dbc67d] bg-[#fff7dc] px-[7px] py-[2px] text-[10.5px] font-bold text-[#765c08]">DEMO</span>
          </div>
        </div>
        <div className="flex-1" />
        <Link to="/requests" className="border border-[#8d968e] bg-white px-[14px] py-[6px] text-[12px] hover:bg-[#f0f2ed]">Back to Requests</Link>
      </header>

      <section className="border border-[#c3cbc2] border-t-[3px] border-t-[#0d5c39] bg-white">
        <div className="border-b border-[#d7dcd5] px-[16px] py-[10px]">
          <div className="text-[14px] font-bold">Request details</div>
          <div className="mt-[2px] text-[11px] text-[#6c766f]">Read-only demonstration data; this is not a database request.</div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 px-[20px] py-[18px]">
            <div className="mb-[15px] border-b border-[#d7dcd5] pb-[5px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Trip request</div>
            <div className="mb-[20px] border border-[#d7dcd5] bg-[#f9faf8] px-[13px] py-[12px] text-[14px] leading-[20px] text-[#2c332d]">{request.trip}</div>
            <div className="grid grid-cols-3 gap-x-[28px] gap-y-[18px]">
              <DetailField label="Client">{request.client}</DetailField>
              <DetailField label="Stage">{request.stage}</DetailField>
              <DetailField label="Assigned agent">{request.agent}</DetailField>
              <DetailField label="Waiting on">{request.waitWho}</DetailField>
              <DetailField label="Next action">{request.waitWhat}</DetailField>
              <DetailField label="Fare">{fare}</DetailField>
            </div>
          </div>
          <aside className="border-l border-[#d7dcd5] bg-[#f9faf8] px-[16px] py-[15px]">
            <div className="mb-[8px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Current workflow</div>
            <div className="mb-[13px] border border-[#b9d2c1] bg-[#edf7f0] px-[10px] py-[8px] text-[12px] font-bold text-[#0b5c3b]">{request.stage}</div>
            <DetailField label="Deadline">{deadline}</DetailField>
          </aside>
        </div>
      </section>
    </>
  );
}

function RequestDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { requestId: requestIdParam } = Route.useParams();
  const requestId = Number(requestIdParam);
  const demoRequest = GROUPS.flatMap((group) => group.items).find((item) => item.id === requestIdParam) ?? null;
  const isDatabaseRequest = Number.isInteger(requestId) && requestId > 0;
  const [query, setQuery] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [proposedReply, setProposedReply] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [details, setDetails] = useState<RequestDetailsInput>({
    passengerCount: null,
    origin: null,
    destination: null,
    departureDateText: null,
    returnDateText: null,
    cabinClass: null,
    flexibility: null,
    specialRequests: null,
  });
  const [feePassengers, setFeePassengers] = useState<Record<number, PassengerCategory>>({});
  const requestQuery = useQuery({
    queryKey: ["requests", requestId],
    queryFn: () => requestsApi.getById(requestId),
    enabled: isDatabaseRequest,
    retry: false,
  });
  const request = requestQuery.data;
  const informationQuery = useQuery({
    queryKey: ["requests", requestId, "information-status"],
    queryFn: () => requestsApi.getInformationStatus(requestId),
    enabled: Boolean(request),
    retry: false,
  });
  const bookingFeeQuery = useQuery({
    queryKey: ["requests", requestId, "booking-fee"],
    queryFn: () => bookingFeesApi.getRequestFee(requestId),
    enabled: Boolean(request), retry: false,
  });
  const mayManageAssignments = user?.roles.some(
    (role) => role === "system_administrator" || role === "offshore_intake_employee",
  ) ?? false;
  const mayClaimSelf = Boolean(
    user?.roles.includes("travel_agent") && request && request.assignedUserId === null,
  );
  const staffQuery = useQuery({
    queryKey: ["requests", "assignable-staff"],
    queryFn: requestsApi.listAssignableStaff,
    enabled: Boolean(request && mayManageAssignments),
  });
  const recommendationQuery = useQuery({
    queryKey: ["requests", requestId, "assignment-recommendation"],
    queryFn: () => requestsApi.getAssignmentRecommendation(requestId),
    enabled: Boolean(request && user),
    retry: false,
  });
  const assignmentHistoryQuery = useQuery({
    queryKey: ["requests", requestId, "assignment-history"],
    queryFn: () => requestsApi.getAssignmentHistory(requestId),
    enabled: Boolean(request && user),
    retry: false,
  });
  const assignMutation = useMutation({
    mutationFn: (assignedUserId: number) => requestsApi.assign(requestId, assignedUserId),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["requests", requestId], updated);
      setSelectedAssigneeId(String(updated.assignedUserId ?? ""));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
        queryClient.invalidateQueries({ queryKey: ["requests", requestId, "assignment-recommendation"] }),
        queryClient.invalidateQueries({ queryKey: ["requests", requestId, "assignment-history"] }),
      ]);
    },
  });
  const sendReplyMutation = useMutation({
    mutationFn: (text: string) =>
      messagingApi.sendMessage(request!.sourceConversationId!, text, requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["messaging", "conversations", request?.sourceConversationId, "messages"],
      });
    },
  });
  const updateDetailsMutation = useMutation({
    mutationFn: (input: RequestDetailsInput) => requestsApi.updateDetails(requestId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["requests", requestId], updated);
      setEditingDetails(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
        queryClient.invalidateQueries({ queryKey: ["requests", requestId, "information-status"] }),
      ]);
    },
  });
  const reviewInformationMutation = useMutation({
    mutationFn: (requirementFieldId: number) => requestsApi.reviewInformation(requestId, requirementFieldId),
    onSuccess: (status) => queryClient.setQueryData(["requests", requestId, "information-status"], status),
  });
  const bookingFeeMutation = useMutation({
    mutationFn: () => bookingFeesApi.saveRequestFee(requestId, Object.entries(feePassengers).map(([travellerId, category]) => ({ travellerId: Number(travellerId), category }))),
    onSuccess: (fee) => {
      queryClient.setQueryData(["requests", requestId, "booking-fee"], fee);
      void queryClient.invalidateQueries({ queryKey: ["requests", requestId] });
    },
  });

  useEffect(() => {
    setSelectedAssigneeId(request?.assignedUserId ? String(request.assignedUserId) : "");
  }, [request?.assignedUserId]);

  useEffect(() => {
    setProposedReply(request?.proposedReply ?? "");
    sendReplyMutation.reset();
  }, [request?.id, request?.proposedReply]);

  useEffect(() => {
    if (!request) return;
    setDetails({
      passengerCount: request.passengerCount,
      origin: request.origin,
      destination: request.destination,
      departureDateText: request.departureDateText,
      returnDateText: request.returnDateText,
      cabinClass: request.cabinClass,
      flexibility: request.flexibility,
      specialRequests: request.specialRequests,
    });
  }, [request]);

  useEffect(() => {
    if (!bookingFeeQuery.data) return;
    setFeePassengers(Object.fromEntries(bookingFeeQuery.data.passengers.map((item) => [item.travellerId, item.category])));
  }, [bookingFeeQuery.data]);

  return (
    <div className="yb-reference-scale min-h-screen min-w-[1180px] bg-[#eef0ea] font-[Helvetica,Arial,sans-serif] leading-[1.25] text-[#1c1f1b]">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} compact />

      <main className="px-[16px] pt-[14px] pb-[40px]">
        <div className="mb-[10px] flex items-center gap-[7px] text-[12px]">
          <Link to="/requests" className="text-[#0b5c3b] underline">Requests</Link>
          <span className="text-[#8a938b]">/</span>
          <span className="text-[#59635b]">{request?.requestNumber ?? demoRequest?.id ?? "Request details"}</span>
        </div>

        {isDatabaseRequest && requestQuery.isLoading && (
          <div className="border border-[#c3cbc2] bg-white p-[24px] text-[13px] text-[#6c766f]">Loading request…</div>
        )}

        {!demoRequest && !requestQuery.isLoading && (!isDatabaseRequest || requestQuery.isError || !request) && (
          <div className="border border-[#c3cbc2] bg-white p-[24px]">
            <h1 className="mb-[6px] text-[22px] font-bold">Request not found</h1>
            <p className="mb-[14px] text-[13px] text-[#6c766f]">This request may no longer exist.</p>
            <Link to="/requests" className="text-[13px] font-bold text-[#0b5c3b] underline">Return to Requests</Link>
          </div>
        )}

        {demoRequest && <DemoRequestDetail request={demoRequest} />}

        {request && (
          <>
            <header className="mb-[12px] flex items-end gap-[12px]">
              <div className="h-[22px] w-[22px] border border-[#b0b8ae] bg-white p-[5px]" aria-hidden="true">
                <div className="h-full w-full bg-[#d9a01e]" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#6c766f]">Travel request</div>
                <div className="flex items-baseline gap-[9px]">
                  <h1 className="text-[24px] font-bold tracking-[-0.01em]">{request.requestNumber}</h1>
                  <span className="border border-[#b9d2c1] bg-[#edf7f0] px-[7px] py-[2px] text-[10.5px] font-bold text-[#0b5c3b]">
                    {request.requestStatusName}
                  </span>
                </div>
              </div>
              <div className="flex-1" />
              <Link to="/requests" className="border border-[#8d968e] bg-white px-[14px] py-[6px] text-[12px] hover:bg-[#f0f2ed]">Back to Requests</Link>
            </header>

            <section className="border border-[#c3cbc2] border-t-[3px] border-t-[#0d5c39] bg-white">
              <div className="flex items-center gap-[10px] border-b border-[#d7dcd5] px-[16px] py-[10px]">
                <div className="text-[14px] font-bold">Request details</div>
                <div className="text-[11px] text-[#6c766f]">Created {dateTimeLabel(request.createdAt)}</div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 px-[20px] py-[18px]">
                  <div className="mb-[15px] border-b border-[#d7dcd5] pb-[5px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Trip request</div>
                  <div className="mb-[20px] border border-[#d7dcd5] bg-[#f9faf8] px-[13px] py-[12px] text-[14px] leading-[20px] text-[#2c332d]">
                    {request.tripSummary}
                  </div>
                  <div className="grid grid-cols-3 gap-x-[28px] gap-y-[18px]">
                    <DetailField label="Client">
                      <Link to="/clients/$clientId" params={{ clientId: String(request.clientId) }} className="font-bold text-[#0b5c3b] underline">
                        {request.clientName}
                      </Link>
                    </DetailField>
                    <DetailField label="Request type">{request.requestTypeName}</DetailField>
                    <DetailField label="Urgency">{request.urgencyName}</DetailField>
                    <DetailField label="Response due">{dateTimeLabel(request.responseDueAt)}</DetailField>
                    <DetailField label="Service due">{dateTimeLabel(request.serviceDueAt)}</DetailField>
                    <DetailField label="Created">{dateTimeLabel(request.createdAt)}</DetailField>
                  </div>

                  <div className="mt-[22px] border-t border-[#d7dcd5] pt-[16px]">
                    <div className="flex items-start gap-[10px]">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Travel information</div>
                        <div className="mt-[3px] text-[11px] text-[#6c766f]">Complete the structured details, then confirm any fields that require staff review.</div>
                      </div>
                      <div className="flex-1" />
                      <button type="button" onClick={() => setEditingDetails((value) => !value)} className="border border-[#8d968e] bg-white px-[11px] py-[5px] text-[11px] font-bold text-[#2c332d] hover:bg-[#f0f2ed]">{editingDetails ? "Cancel" : "Edit information"}</button>
                    </div>

                    {editingDetails ? (
                      <form className="mt-[10px] grid grid-cols-3 gap-[10px] border border-[#cbd3ca] bg-[#f9faf8] p-[12px]" onSubmit={(event) => { event.preventDefault(); updateDetailsMutation.mutate(details); }}>
                        <label className="text-[11px] font-bold">Passengers<input type="number" min={1} max={100} value={details.passengerCount ?? ""} onChange={(event) => setDetails({ ...details, passengerCount: event.target.value ? Number(event.target.value) : null })} className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <label className="text-[11px] font-bold">Origin<input value={details.origin ?? ""} onChange={(event) => setDetails({ ...details, origin: event.target.value || null })} placeholder="JFK / New York" className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <label className="text-[11px] font-bold">Destination<input value={details.destination ?? ""} onChange={(event) => setDetails({ ...details, destination: event.target.value || null })} placeholder="TLV / Tel Aviv" className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <label className="text-[11px] font-bold">Departure date / window<input value={details.departureDateText ?? ""} onChange={(event) => setDetails({ ...details, departureDateText: event.target.value || null })} placeholder="20 Sep or nearby" className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <label className="text-[11px] font-bold">Return date / window<input value={details.returnDateText ?? ""} onChange={(event) => setDetails({ ...details, returnDateText: event.target.value || null })} placeholder="After Sukkot" className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <label className="text-[11px] font-bold">Cabin class<input value={details.cabinClass ?? ""} onChange={(event) => setDetails({ ...details, cabinClass: event.target.value || null })} placeholder="Economy" className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <label className="text-[11px] font-bold">Flexibility<input value={details.flexibility ?? ""} onChange={(event) => setDetails({ ...details, flexibility: event.target.value || null })} placeholder="±2 days" className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <label className="col-span-2 text-[11px] font-bold">Special requests<input value={details.specialRequests ?? ""} onChange={(event) => setDetails({ ...details, specialRequests: event.target.value || null })} placeholder="Meals, accessibility, seating…" className="mt-[4px] h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[12px] font-normal" /></label>
                        <div className="col-span-3 flex items-center justify-end gap-[9px]">
                          {updateDetailsMutation.isError && <span className="text-[11px] text-[#b3261e]">{updateDetailsMutation.error instanceof Error ? updateDetailsMutation.error.message : "Could not save"}</span>}
                          <button type="submit" disabled={updateDetailsMutation.isPending} className="h-[30px] bg-[#0b5c3b] px-[14px] text-[11px] font-bold text-white disabled:opacity-50">{updateDetailsMutation.isPending ? "Saving…" : "Save information"}</button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-[10px] grid grid-cols-4 gap-x-[18px] gap-y-[12px] border border-[#d7dcd5] bg-[#f9faf8] p-[12px]">
                        <DetailField label="Passengers">{request.passengerCount ?? "—"}</DetailField>
                        <DetailField label="Origin">{request.origin ?? "—"}</DetailField>
                        <DetailField label="Destination">{request.destination ?? "—"}</DetailField>
                        <DetailField label="Cabin">{request.cabinClass ?? "—"}</DetailField>
                        <DetailField label="Departure">{request.departureDateText ?? "—"}</DetailField>
                        <DetailField label="Return">{request.returnDateText ?? "—"}</DetailField>
                        <DetailField label="Flexibility">{request.flexibility ?? "—"}</DetailField>
                        <DetailField label="Special requests">{request.specialRequests ?? "—"}</DetailField>
                      </div>
                    )}

                    {informationQuery.data && (
                      <div className="mt-[10px] border border-[#d7dcd5]">
                        <div className="flex items-center bg-[#eff2ec] px-[10px] py-[6px]">
                          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5c665e]">Information checklist</div>
                          <div className="flex-1" />
                          <span className={`px-[6px] py-[2px] text-[9.5px] font-bold ${informationQuery.data.complete ? "bg-[#e8f5eb] text-[#0b5c3b]" : "bg-[#fff3d5] text-[#7b5b00]"}`}>{informationQuery.data.complete ? "COMPLETE" : `${informationQuery.data.missingItems.length} ACTIONS NEEDED`}</span>
                        </div>
                        {informationQuery.data.checklist.map((item) => (
                          <div key={item.requirementFieldId} className="flex items-center gap-[9px] border-t border-[#edf0ea] px-[10px] py-[7px]">
                            <span className={`h-[8px] w-[8px] rounded-full ${!item.required && !item.present ? "bg-[#aab1aa]" : item.satisfied ? "bg-[#249155]" : item.present ? "bg-[#d89b13]" : "bg-[#b63a2b]"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[11.5px] font-bold">{item.label}</div>
                              <div className="truncate text-[10px] text-[#6c766f]">{item.present ? item.valueSummary : item.required ? "Missing" : "Optional · not provided"}{item.reviewed ? ` · reviewed${item.reviewedByName ? ` by ${item.reviewedByName}` : ""}` : item.present && item.requiresReview ? " · review required" : ""}</div>
                            </div>
                            {item.present && item.requiresReview && !item.reviewed && <button type="button" disabled={reviewInformationMutation.isPending} onClick={() => reviewInformationMutation.mutate(item.requirementFieldId)} className="border border-[#0b5c3b] bg-white px-[8px] py-[4px] text-[10px] font-bold text-[#0b5c3b] disabled:opacity-50">Confirm reviewed</button>}
                          </div>
                        ))}
                        <div className="border-t border-[#d7dcd5] bg-[#fafbf9] px-[10px] py-[6px] text-[10.5px] font-bold text-[#59635b]">Next: {informationQuery.data.nextAction}</div>
                      </div>
                    )}
                    {informationQuery.isError && <div className="mt-[8px] text-[11px] text-[#b3261e]">Information checklist could not be loaded.</div>}
                    {reviewInformationMutation.isError && <div className="mt-[8px] text-[11px] text-[#b3261e]">{reviewInformationMutation.error instanceof Error ? reviewInformationMutation.error.message : "Review could not be saved"}</div>}
                  </div>

                  <div className="mt-[22px] border-t border-[#d7dcd5] pt-[16px]">
                    <div className="flex items-start gap-[10px]"><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Booking fee by passenger</div><div className="mt-[3px] text-[11px] text-[#6c766f]">Select the travellers on this request and confirm their fee category. Saving creates a dated fee snapshot.</div></div><div className="flex-1" />
                      {bookingFeeQuery.data && <div className="text-right"><div className="text-[10px] text-[#6c766f]">{bookingFeeQuery.data.feeGroup.name} · {bookingFeeQuery.data.feeGroup.calculationBasis.replace("_", " ")}</div><div className="text-[18px] font-bold text-[#0b5c3b]">{bookingFeeQuery.data.currency} {bookingFeeQuery.data.totalAmount}</div></div>}
                    </div>
                    {bookingFeeQuery.isLoading && <div className="mt-[9px] text-[11px] text-[#6c766f]">Loading client travellers and fee rule…</div>}
                    {bookingFeeQuery.isError && <div className="mt-[9px] text-[11px] text-[#b3261e]">The client needs a valid booking-fee group before this can be calculated.</div>}
                    {bookingFeeQuery.data && (
                      <div className="mt-[10px] border border-[#d7dcd5]">
                        {bookingFeeQuery.data.availableTravellers.map((traveller) => {
                          const category = feePassengers[traveller.id];
                          return <div key={traveller.id} className="flex items-center gap-[10px] border-b border-[#edf0ea] px-[10px] py-[7px] last:border-b-0">
                            <input aria-label={`Include ${traveller.name}`} type="checkbox" checked={Boolean(category)} onChange={(event) => setFeePassengers((current) => { const next = { ...current }; if (event.target.checked) next[traveller.id] = "adult"; else delete next[traveller.id]; return next; })} />
                            <div className="min-w-0 flex-1"><div className="text-[11.5px] font-bold">{traveller.name}</div><div className="text-[9.5px] text-[#6c766f]">DOB {traveller.dob ?? "not recorded"}</div></div>
                            <select aria-label={`${traveller.name} passenger category`} disabled={!category} value={category ?? "adult"} onChange={(event) => setFeePassengers((current) => ({ ...current, [traveller.id]: event.target.value as PassengerCategory }))} className="h-[28px] border border-[#9aa29a] bg-white px-[7px] text-[10.5px]"><option value="adult">Adult</option><option value="child">Child</option><option value="infant">Infant</option></select>
                            {bookingFeeQuery.data.passengers.find((item) => item.travellerId === traveller.id) && <div className="w-[95px] text-right text-[10.5px] font-bold">{bookingFeeQuery.data.currency} {bookingFeeQuery.data.passengers.find((item) => item.travellerId === traveller.id)!.feeAmount}</div>}
                          </div>;
                        })}
                        {bookingFeeQuery.data.availableTravellers.length === 0 && <div className="p-[10px] text-[11px] text-[#6c766f]">Add travellers to the client profile first.</div>}
                        <div className="flex items-center border-t border-[#d7dcd5] bg-[#f9faf8] px-[10px] py-[7px]"><div className="text-[10px] text-[#6c766f]">{bookingFeeQuery.data.calculatedAt ? `Last calculated ${dateTimeLabel(bookingFeeQuery.data.calculatedAt)}` : "Not calculated yet"}</div><div className="flex-1" /><button type="button" disabled={Object.keys(feePassengers).length === 0 || bookingFeeMutation.isPending} onClick={() => bookingFeeMutation.mutate()} className="h-[29px] bg-[#0b5c3b] px-[12px] text-[10.5px] font-bold text-white disabled:opacity-50">{bookingFeeMutation.isPending ? "Calculating…" : "Save fee calculation"}</button></div>
                      </div>
                    )}
                    {bookingFeeMutation.isError && <div className="mt-[7px] text-[11px] text-[#b3261e]">{bookingFeeMutation.error instanceof Error ? bookingFeeMutation.error.message : "Fee calculation failed"}</div>}
                  </div>

                  <div className="mt-[22px] border-t border-[#d7dcd5] pt-[16px]">
                    <div className="flex items-start gap-[12px]">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Proposed answer to client</div>
                        <div className="mt-[3px] text-[11px] leading-[16px] text-[#6c766f]">
                          Prepared from the approved AI intake. Review and edit it before sending; the system never sends this automatically.
                        </div>
                      </div>
                      <div className="flex-1" />
                      {request.clientWhatsAppNumber && (
                        <div className="text-[11px] text-[#6c766f]">WhatsApp: {request.clientWhatsAppNumber.startsWith("+") ? request.clientWhatsAppNumber : `+${request.clientWhatsAppNumber}`}</div>
                      )}
                    </div>
                    <textarea
                      rows={6}
                      value={proposedReply}
                      onChange={(event) => {
                        setProposedReply(event.target.value);
                        sendReplyMutation.reset();
                      }}
                      placeholder="Write the reviewed response to the client…"
                      aria-label="Proposed answer to client"
                      className="mt-[9px] min-h-[118px] w-full resize-y border border-[#9aa29a] bg-white px-[10px] py-[8px] text-[13px] leading-[19px] outline-none focus:border-[#0b5c3b]"
                    />
                    <div className="mt-[8px] flex items-center gap-[10px]">
                      {request.sourceConversationId ? (
                        <div className="text-[10.5px] text-[#6c766f]">Explicit staff action required. Sending adds the message to the linked Inbox conversation.</div>
                      ) : (
                        <div className="text-[10.5px] text-[#8a6d10]">This request has no linked WhatsApp conversation, so a reply cannot be sent here.</div>
                      )}
                      <div className="flex-1" />
                      {sendReplyMutation.isSuccess && <div className="text-[11.5px] font-bold text-[#0b5c3b]">Sent to client</div>}
                      <button
                        type="button"
                        disabled={!request.sourceConversationId || proposedReply.trim().length === 0 || sendReplyMutation.isPending || sendReplyMutation.isSuccess}
                        onClick={() => sendReplyMutation.mutate(proposedReply.trim())}
                        className="h-[32px] bg-[#0b5c3b] px-[15px] text-[11.5px] font-bold text-white hover:bg-[#084a30] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sendReplyMutation.isPending ? "Sending…" : "Send to client"}
                      </button>
                    </div>
                    {sendReplyMutation.isError && (
                      <div role="alert" className="mt-[7px] text-[11px] leading-[15px] text-[#b3261e]">
                        {sendReplyMutation.error instanceof Error ? sendReplyMutation.error.message : "The reply could not be sent"}
                      </div>
                    )}
                  </div>
                </div>

                <aside className="border-l border-[#d7dcd5] bg-[#f9faf8] px-[16px] py-[15px]">
                  <div className="mb-[8px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Current workflow</div>
                  <div className="mb-[13px] border border-[#b9d2c1] bg-[#edf7f0] px-[10px] py-[8px] text-[12px] font-bold text-[#0b5c3b]">{request.requestStatusName}</div>
                  <DetailField label="Priority">{request.urgencyName}</DetailField>
                  <div className="mt-[17px] border-t border-[#d7dcd5] pt-[12px]">
                    <div className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Assigned staff</div>
                    <div className="mb-[7px] inline-flex border border-[#c3cbc2] bg-white px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-[#59635b]">
                      Assignment: {request.assignmentStatus.replaceAll("_", " ")}
                    </div>
                    <div className="text-[13px] font-bold text-[#2c332d]">{request.assignedUserName ?? "Unassigned"}</div>
                    {request.assignedAt && (
                      <div className="mt-[3px] text-[10.5px] leading-[15px] text-[#6c766f]">
                        Assigned {dateTimeLabel(request.assignedAt)}
                        {request.assignedByUserName ? ` by ${request.assignedByUserName}` : ""}
                      </div>
                    )}

                    {recommendationQuery.data && (
                      <div className="mt-[10px] border border-[#b9d2c1] bg-[#edf7f0] px-[9px] py-[8px]">
                        <div className="flex items-center gap-[6px]">
                          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0b5c3b]">System recommendation</div>
                          <div className="flex-1" />
                          <span className="bg-white px-[5px] py-[2px] text-[9.5px] font-bold uppercase text-[#59635b]">{recommendationQuery.data.routingLevel}</span>
                        </div>
                        <div className="mt-[5px] text-[12px] font-bold text-[#1f3528]">{recommendationQuery.data.recommendedUserName ?? "Supervisor review required"}</div>
                        <div className="mt-[3px] text-[10.5px] leading-[15px] text-[#59635b]">{recommendationQuery.data.explanation}</div>
                        {recommendationQuery.data.nextFallbackAt && <div className="mt-[3px] text-[10px] text-[#6c766f]">Next fallback: {dateTimeLabel(recommendationQuery.data.nextFallbackAt)}</div>}
                        {mayManageAssignments && recommendationQuery.data.recommendedUserId && recommendationQuery.data.routingLevel !== "escalation" && (
                          <button type="button" onClick={() => setSelectedAssigneeId(String(recommendationQuery.data!.recommendedUserId))} className="mt-[6px] text-[10.5px] font-bold text-[#0b5c3b] underline">Use this recommendation</button>
                        )}
                      </div>
                    )}

                    {mayManageAssignments && (
                      <div className="mt-[9px]">
                        <select
                          aria-label="Assigned staff"
                          value={selectedAssigneeId}
                          onChange={(event) => setSelectedAssigneeId(event.target.value)}
                          className="h-[30px] w-full border border-[#9aa29a] bg-white px-[7px] text-[11.5px] outline-none focus:border-[#0b5c3b]"
                        >
                          <option value="">Select staff…</option>
                          {staffQuery.data?.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedAssigneeId || assignMutation.isPending || Number(selectedAssigneeId) === request.assignedUserId}
                          onClick={() => assignMutation.mutate(Number(selectedAssigneeId))}
                          className="mt-[6px] h-[30px] w-full bg-[#0b5c3b] px-[10px] text-[11.5px] font-bold text-white hover:bg-[#084a30] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {assignMutation.isPending ? "Assigning…" : request.assignedUserId ? "Reassign request" : "Assign request"}
                        </button>
                      </div>
                    )}

                    {!mayManageAssignments && mayClaimSelf && user && (
                      <button
                        type="button"
                        disabled={assignMutation.isPending}
                        onClick={() => assignMutation.mutate(user.id)}
                        className="mt-[9px] h-[30px] w-full bg-[#0b5c3b] px-[10px] text-[11.5px] font-bold text-white hover:bg-[#084a30] disabled:opacity-50"
                      >
                        {assignMutation.isPending ? "Assigning…" : "Assign to me"}
                      </button>
                    )}
                    {staffQuery.isError && <div className="mt-[6px] text-[10.5px] text-[#b3261e]">Staff list could not be loaded.</div>}
                    {recommendationQuery.isError && <div className="mt-[6px] text-[10.5px] text-[#b3261e]">Assignment recommendation could not be calculated.</div>}
                    {assignMutation.isError && (
                      <div role="alert" className="mt-[6px] text-[10.5px] leading-[14px] text-[#b3261e]">
                        {assignMutation.error instanceof Error ? assignMutation.error.message : "Request assignment failed"}
                      </div>
                    )}

                    {(assignmentHistoryQuery.data?.length ?? 0) > 0 && (
                      <div className="mt-[12px] border-t border-[#d7dcd5] pt-[9px]">
                        <div className="mb-[6px] text-[10px] font-bold uppercase tracking-[0.1em] text-[#5c665e]">Assignment history</div>
                        {assignmentHistoryQuery.data?.slice(0, 4).map((event) => (
                          <div key={event.id} className="mb-[7px] border-l-2 border-[#b9d2c1] pl-[7px]">
                            <div className="text-[10.5px] font-bold text-[#2c332d]">{event.staffUserName ?? "Escalation"} · {event.routingLevel}</div>
                            <div className="text-[9.5px] text-[#6c766f]">{dateTimeLabel(event.createdAt)}{event.actorUserName ? ` by ${event.actorUserName}` : ""}</div>
                            <div className="mt-[2px] text-[9.5px] leading-[13px] text-[#59635b]">{event.explanation}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-[17px] border-t border-[#d7dcd5] pt-[12px]">
                    <div className="flex flex-col gap-[6px]">
                      {request.sourceConversationId && (
                        <Link
                          to="/inbox"
                          search={{ conversationId: request.sourceConversationId }}
                          className="block bg-[#0b5c3b] px-[10px] py-[7px] text-[11.5px] font-bold text-white hover:bg-[#084a30]"
                        >
                          Open client inbox
                        </Link>
                      )}
                      <Link to="/clients/$clientId" params={{ clientId: String(request.clientId) }} className="block border border-[#9aa29a] bg-white px-[10px] py-[7px] text-[11.5px] text-[#2c332d] hover:bg-[#f0f2ed]">View client profile</Link>
                    </div>
                  </div>
                </aside>
              </div>
            </section>
            <EntityRecordsPanel entity="request" id={requestId} />
          </>
        )}
      </main>
    </div>
  );
}
