import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { GROUPS, money, type RequestRow } from "../data/requestsData";
import { useAuth } from "../lib/AuthContext";
import { messagingApi, requestsApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";

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
  const requestQuery = useQuery({
    queryKey: ["requests", requestId],
    queryFn: () => requestsApi.getById(requestId),
    enabled: isDatabaseRequest,
    retry: false,
  });
  const request = requestQuery.data;
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

  useEffect(() => {
    setSelectedAssigneeId(request?.assignedUserId ? String(request.assignedUserId) : "");
  }, [request?.assignedUserId]);

  useEffect(() => {
    setProposedReply(request?.proposedReply ?? "");
    sendReplyMutation.reset();
  }, [request?.id, request?.proposedReply]);

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
                    <Link to="/clients/$clientId" params={{ clientId: String(request.clientId) }} className="block border border-[#9aa29a] bg-white px-[10px] py-[7px] text-[11.5px] text-[#2c332d] hover:bg-[#f0f2ed]">View client profile</Link>
                  </div>
                </aside>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
