import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { AppHeader } from "../components/AppShell/AppHeader";
import { Panel } from "../components/AppShell/Panel";
import { PrimaryButton } from "../components/AppShell/buttons";
import { messagingApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getSocket } from "../lib/socket";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

function InboxPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState("");

  const statusQuery = useQuery({
    queryKey: ["messaging", "status"],
    queryFn: messagingApi.getStatus,
    refetchInterval: 5000,
  });

  const conversationsQuery = useQuery({
    queryKey: ["messaging", "conversations"],
    queryFn: messagingApi.listConversations,
    enabled: statusQuery.data?.status === "connected",
  });

  const messagesQuery = useQuery({
    queryKey: ["messaging", "conversations", selectedId, "messages"],
    queryFn: () => messagingApi.listMessages(selectedId as number),
    enabled: selectedId !== null,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => messagingApi.sendMessage(selectedId as number, text),
    onSuccess: () => {
      setReply("");
      if (selectedId !== null) {
        queryClient.invalidateQueries({
          queryKey: ["messaging", "conversations", selectedId, "messages"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
    },
  });

  useEffect(() => {
    const socket = getSocket();

    const onStatus = () => {
      queryClient.invalidateQueries({ queryKey: ["messaging", "status"] });
    };
    const onNewMessage = (payload: { conversationId: number }) => {
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "conversations", payload.conversationId, "messages"],
      });
    };
    const onConversationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
    };

    socket.on("connection:status", onStatus);
    socket.on("message:new", onNewMessage);
    socket.on("conversation:updated", onConversationUpdated);

    return () => {
      socket.off("connection:status", onStatus);
      socket.off("message:new", onNewMessage);
      socket.off("conversation:updated", onConversationUpdated);
    };
  }, [queryClient]);

  const status = statusQuery.data;
  const conversations = conversationsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="min-w-[1280px] bg-[#f7f7f2] text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] border-b border-yb-line-head bg-white px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">INBOX</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">WhatsApp inbox</h1>
            <span className="text-[13px] text-yb-muted3">
              {status?.status === "connected"
                ? `Connected — ${status.phoneNumber}`
                : status?.status === "qr_pending"
                  ? "Waiting for scan"
                  : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <Link to="/whatsapp-groups" className="text-[13px] font-bold text-yb-green underline">
          Manage WhatsApp Groups
        </Link>
      </div>

      <div className="px-[22px] pt-4 pb-[26px]">
        {status?.status !== "connected" ? (
          <Panel
            title="CONNECT WHATSAPP"
            right="separate/test number only — see docs/05-open-decisions.md #9"
            pad
          >
            {status?.status === "qr_pending" && status.qr ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="rounded-yb border border-yb-line bg-white p-4">
                  <QRCode value={status.qr} size={220} />
                </div>
                <p className="max-w-[420px] text-center text-[13.5px] text-yb-muted3">
                  Open WhatsApp on the <strong>separate/test number</strong> → Linked Devices → Link a
                  Device, and scan this code.
                </p>
              </div>
            ) : (
              <p className="py-6 text-center text-[14px] text-yb-muted3">
                Waiting for the WhatsApp connection to start…
              </p>
            )}
          </Panel>
        ) : (
          <div className="grid grid-cols-[320px_1fr] gap-4">
            <Panel title="CONVERSATIONS" right={`${conversations.length}`}>
              <div className="max-h-[500px] overflow-y-auto">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`block w-full border-b border-yb-line-row px-[14px] py-2 text-left ${
                        active ? "bg-yb-row-hover" : "bg-white hover:bg-yb-row-hover"
                      }`}
                    >
                      <div className="truncate text-[14px] font-bold text-yb-ink">
                        {c.displayName ?? c.phoneNumber}
                      </div>
                      {c.displayName && c.displayName !== c.phoneNumber && (
                        <div className="truncate text-[11.5px] text-yb-muted4">{c.phoneNumber}</div>
                      )}
                      <div className="truncate text-[12.5px] text-yb-muted3">
                        {c.lastMessageBody ?? "No messages yet"}
                      </div>
                    </button>
                  );
                })}
                {conversations.length === 0 && (
                  <div className="px-[14px] py-6 text-center text-[13.5px] text-yb-muted3">
                    No conversations yet — waiting for an incoming message.
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              title={
                selectedConversation
                  ? selectedConversation.displayName ?? selectedConversation.phoneNumber
                  : "SELECT A CONVERSATION"
              }
            >
              {selectedConversation ? (
                <div className="flex h-[500px] flex-col">
                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[70%] rounded-yb px-3 py-2 text-[14px] ${
                          m.direction === "outbound"
                            ? "ml-auto bg-yb-green text-white"
                            : "bg-yb-table-head text-yb-ink"
                        }`}
                      >
                        {m.body}
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="py-6 text-center text-[13.5px] text-yb-muted3">No messages yet.</div>
                    )}
                  </div>
                  <div className="flex items-center gap-[10px] border-t border-yb-line-soft p-3">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type a reply…"
                      className="h-[34px] flex-1 rounded-yb border border-yb-line-btn px-[10px] text-[14px] text-yb-ink outline-none"
                    />
                    <PrimaryButton
                      disabled={!reply.trim() || sendMutation.isPending}
                      onClick={() => sendMutation.mutate(reply)}
                    >
                      Send
                    </PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="flex h-[500px] items-center justify-center text-[13.5px] text-yb-muted3">
                  Pick a conversation on the left.
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
