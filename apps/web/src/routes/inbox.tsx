import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { z } from "zod";
import { AppHeader } from "../components/AppShell/AppHeader";
import { Panel } from "../components/AppShell/Panel";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { WhatsAppSubnav } from "../components/AppShell/WhatsAppSubnav";
import {
  messageTemplatesApi,
  messagingApi,
  requestWorkflowSettingsApi,
  systemSettingsApi,
  type ConversationSummary,
  type DraftIntakeRecord,
  type UpdateDraftIntakeInput,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getSocket } from "../lib/socket";
import { useAuth } from "../lib/AuthContext";

export const Route = createFileRoute("/inbox")({
  validateSearch: z.object({
    conversationId: z.coerce.number().int().positive().optional(),
    accountId: z.coerce.number().int().positive().optional(),
  }),
  component: InboxPage,
});

type ConversationFilter = "all" | "unread" | "groups";

const QUICK_REPLIES = [
  { label: "Itinerary attached", text: "I attached the itinerary for your review." },
  { label: "Passport needed", text: "Please send a clear photo of the passport information page." },
  { label: "Ticket issued", text: "Your ticket has been issued. I will send the itinerary now." },
  { label: "Call you shortly", text: "I will call you shortly." },
] as const;

function initials(value: string): string {
  const clean = value.replace(/·.*/, "").trim();
  if (/^\+?\d/.test(clean)) return "#";
  return clean.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function formatTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function displayPhone(value: string | null): string {
  if (!value) return "";
  return value.startsWith("+") ? value : `+${value}`;
}

function VoiceNotePlayer({ messageId, available }: { messageId: number; available: boolean }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await messagingApi.getMessageAudio(messageId);
      setAudioUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this voice note");
    } finally {
      setLoading(false);
    }
  };

  if (!available) return <div className="text-[12px] italic opacity-80">Voice note unavailable</div>;
  return (
    <div className="min-w-[220px]">
      {audioUrl ? (
        <audio controls preload="metadata" src={audioUrl} className="h-[34px] w-full max-w-[300px]" />
      ) : (
        <button type="button" onClick={load} disabled={loading} className="border border-current px-[10px] py-[5px] text-[11.5px] font-bold opacity-90 hover:opacity-100 disabled:opacity-60">
          {loading ? "Loading voice note…" : "▶ Play voice note"}
        </button>
      )}
      {error && <div role="alert" className="mt-[4px] text-[10.5px] text-yb-red">{error}</div>}
    </div>
  );
}

function VoiceNoteComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (audio: Blob, durationSeconds: number | null) => Promise<void>;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const preparedUrlRef = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [prepared, setPrepared] = useState<{ blob: Blob; url: string; durationSeconds: number | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const releaseRecorder = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  };

  const clearPrepared = () => {
    if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
    preparedUrlRef.current = null;
    setPrepared(null);
  };

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseRecorder();
    if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
    preparedUrlRef.current = null;
  }, []);

  const prepareBlob = (blob: Blob, durationSeconds: number | null) => {
    clearPrepared();
    if (!blob.size) {
      setError("The recording is empty. Please try again.");
      return;
    }
    if (blob.size > 10 * 1024 * 1024) {
      setError("Voice notes must be 10 MB or smaller.");
      return;
    }
    const url = URL.createObjectURL(blob);
    preparedUrlRef.current = url;
    setPrepared({ blob, durationSeconds, url });
  };

  const startRecording = async () => {
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Microphone recording requires localhost or HTTPS. You can upload an audio recording instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]
        .find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const durationSeconds = recordingStartedAtRef.current === null
          ? null
          : Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
        recordingStartedAtRef.current = null;
        prepareBlob(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }), durationSeconds);
        releaseRecorder();
      };
      recorder.start(250);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => {
          if (current >= 119 && recorder.state === "recording") recorder.stop();
          return current + 1;
        });
      }, 1000);
    } catch (caught) {
      releaseRecorder();
      setError(caught instanceof Error && caught.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow it in the browser or upload an audio recording."
        : "The microphone could not be started.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const send = async () => {
    if (!prepared) return;
    setSending(true);
    setError(null);
    try {
      await onSend(prepared.blob, prepared.durationSeconds);
      clearPrepared();
      setRecordingSeconds(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the voice note");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-[7px] border border-yb-line-row bg-[#f7f8f5] px-[8px] py-[7px]">
      <div className="flex flex-wrap items-center gap-[7px]">
        <button type="button" disabled={disabled || sending} onClick={recording ? stopRecording : startRecording} className={`border px-[10px] py-[5px] text-[11.5px] font-bold ${recording ? "border-yb-red bg-[#fff3f1] text-yb-red" : "border-yb-line-btn bg-white text-yb-ink2 hover:bg-yb-row-hover"}`}>
          {recording ? `■ Stop · ${recordingSeconds}s` : "● Record voice note"}
        </button>
        <label className="cursor-pointer border border-yb-line-btn bg-white px-[10px] py-[5px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">
          Upload audio
          <input type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav" className="sr-only" disabled={disabled || recording || sending} onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) prepareBlob(file, null);
            event.currentTarget.value = "";
          }} />
        </label>
        {prepared && <audio controls preload="metadata" src={prepared.url} className="h-[32px] min-w-[190px] flex-1" />}
        {prepared && <button type="button" disabled={sending || disabled} onClick={send} className="border border-yb-green bg-yb-green px-[11px] py-[5px] text-[11.5px] font-bold text-white disabled:opacity-60">{sending ? "Sending…" : "Send voice note"}</button>}
        {prepared && <button type="button" disabled={sending} onClick={clearPrepared} className="px-[5px] py-[4px] text-[11px] text-yb-muted3 underline">Cancel</button>}
      </div>
      {error && <div role="alert" className="mt-[5px] text-[11px] text-yb-red">{error}</div>}
    </div>
  );
}

function InboxPage() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const { isAdmin } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(search.conversationId ?? null);
  const [reply, setReply] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");
  const [readConversationIds, setReadConversationIds] = useState<Set<number>>(() => new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const statusQuery = useQuery({
    queryKey: ["messaging", "status"],
    queryFn: messagingApi.getStatus,
    refetchInterval: 5000,
  });
  const accountsQuery = useQuery({
    queryKey: ["messaging", "accounts"],
    queryFn: messagingApi.listAccounts,
    refetchInterval: 5000,
  });
  const conversationsQuery = useQuery({
    queryKey: ["messaging", "conversations"],
    queryFn: messagingApi.listConversations,
    enabled: !statusQuery.isError,
  });
  const groupsQuery = useQuery({
    queryKey: ["messaging", "groups"],
    queryFn: messagingApi.listGroups,
  });
  const systemSettingsQuery = useQuery({
    queryKey: ["system-settings"],
    queryFn: systemSettingsApi.get,
    enabled: isAdmin,
  });
  const templatesQuery = useQuery({ queryKey: ["message-templates", "active"], queryFn: messageTemplatesApi.listActive });
  const reconnectMutation = useMutation({
    mutationFn: () => messagingApi.reconnectAccount(selectedAccountId as number),
    onSuccess: (nextStatus) => {
      queryClient.setQueryData(["messaging", "status"], nextStatus);
      queryClient.invalidateQueries({ queryKey: ["messaging", "accounts"] });
      queryClient.invalidateQueries({ queryKey: ["messaging", "status"] });
    },
  });
  const disconnectMutation = useMutation({
    mutationFn: () => messagingApi.disconnectAccount(selectedAccountId as number),
    onSuccess: (nextStatus) => {
      queryClient.setQueryData(["messaging", "status"], nextStatus);
      queryClient.invalidateQueries({ queryKey: ["messaging", "accounts"] });
      queryClient.invalidateQueries({ queryKey: ["messaging", "status"] });
    },
  });
  const resetTestDataMutation = useMutation({
    mutationFn: systemSettingsApi.resetTestData,
    onSuccess: async () => {
      queryClient.setQueryData(["messaging", "conversations"], []);
      queryClient.setQueryData(["messaging", "groups"], []);
      setSelectedId(null);
      setReadConversationIds(new Set());
      await queryClient.invalidateQueries();
    },
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

  const sendVoiceNoteMutation = useMutation({
    mutationFn: ({ audio, durationSeconds }: { audio: Blob; durationSeconds: number | null }) =>
      messagingApi.sendVoiceNote(selectedId as number, audio, durationSeconds),
    onSuccess: () => {
      if (selectedId !== null) {
        queryClient.invalidateQueries({
          queryKey: ["messaging", "conversations", selectedId, "messages"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
    },
  });
  const renderTemplateMutation = useMutation({
    mutationFn: () => messageTemplatesApi.render(Number(templateId), selectedId as number),
    onSuccess: (result) => {
      setReply(result.renderedText);
      setTemplateWarning(result.missingVariables.length
        ? `Complete these linked details before sending: ${result.missingVariables.join(", ").replaceAll("_", " ")}`
        : null);
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: (phoneNumber: string) => messagingApi.startConversation(phoneNumber, selectedAccountId ?? undefined),
    onSuccess: async ({ id }) => {
      setSelectedId(id);
      setConversationSearch("");
      await queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
    },
  });

  useEffect(() => {
    const socket = getSocket();
    const onStatus = () => {
      queryClient.invalidateQueries({ queryKey: ["messaging", "status"] });
      queryClient.invalidateQueries({ queryKey: ["messaging", "accounts"] });
    };
    const onNewMessage = (payload: { conversationId: number }) => {
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "conversations", payload.conversationId, "messages"],
      });
    };
    const onConversationUpdated = () =>
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
    const onDraftIntakeUpdated = (payload: { conversationId: number }) =>
      queryClient.invalidateQueries({
        queryKey: ["messaging", "conversations", payload.conversationId, "draft-intakes"],
      });

    socket.on("connection:status", onStatus);
    socket.on("message:new", onNewMessage);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("draft-intake:updated", onDraftIntakeUpdated);
    return () => {
      socket.off("connection:status", onStatus);
      socket.off("message:new", onNewMessage);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("draft-intake:updated", onDraftIntakeUpdated);
    };
  }, [queryClient]);

  useEffect(() => { setTemplateId(""); setTemplateWarning(null); }, [selectedId]);

  useEffect(() => {
    if (selectedAccountId !== null || !accountsQuery.data?.length) return;
    setSelectedAccountId((accountsQuery.data.find((account) => account.isPrimary) ?? accountsQuery.data[0]!).id);
  }, [accountsQuery.data, selectedAccountId]);

  useEffect(() => {
    if (search.conversationId !== undefined) setSelectedId(search.conversationId);
    if (search.accountId !== undefined) setSelectedAccountId(search.accountId);
  }, [search.accountId, search.conversationId]);

  useEffect(() => {
    if (search.conversationId === undefined || search.accountId !== undefined) return;
    const linkedConversation = conversationsQuery.data?.find((conversation) => conversation.id === search.conversationId);
    if (linkedConversation) setSelectedAccountId(linkedConversation.accountId);
  }, [conversationsQuery.data, search.accountId, search.conversationId]);

  useEffect(() => {
    if (selectedId !== null) {
      setReadConversationIds((current) => {
        if (current.has(selectedId)) return current;
        const next = new Set(current);
        next.add(selectedId);
        return next;
      });
    }
  }, [selectedId]);

  useEffect(() => {
    const first = conversationsQuery.data?.find((conversation) => selectedAccountId === null || conversation.accountId === selectedAccountId);
    if (selectedId === null && first) {
      setSelectedId(first.id);
    }
  }, [conversationsQuery.data, selectedAccountId, selectedId]);

  const status = accountsQuery.data?.find((account) => account.id === selectedAccountId) ?? statusQuery.data;
  const conversations = conversationsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const selectedGroup = groups.find((group) => group.conversationId === selectedId) ?? null;
  const normalizedSearch = conversationSearch.trim().toLowerCase();
  const accountConversations = selectedAccountId === null ? conversations : conversations.filter((conversation) => conversation.accountId === selectedAccountId);
  const searchedConversations = normalizedSearch
    ? accountConversations.filter((conversation) =>
        [conversation.displayName, conversation.phoneNumber]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedSearch)),
      )
    : accountConversations;
  const filteredConversations = searchedConversations.filter((conversation) => {
    if (conversationFilter === "groups") {
      return groups.some((group) => group.conversationId === conversation.id);
    }
    if (conversationFilter === "unread") {
      return Boolean(conversation.lastMessageBody) && !readConversationIds.has(conversation.id);
    }
    return true;
  });
  const unreadCount = accountConversations.filter(
    (conversation) => Boolean(conversation.lastMessageBody) && !readConversationIds.has(conversation.id),
  ).length;
  const phoneDigits = conversationSearch.replace(/[^0-9]/g, "").replace(/^00/, "");
  const canStartConversation =
    /^[+0-9\s().-]+$/.test(conversationSearch.trim()) && /^[1-9]\d{7,14}$/.test(phoneDigits);
  const selectedTitle = selectedConversation?.displayName ?? selectedConversation?.phoneNumber ?? "";
  const groupTravellers = selectedGroup?.participants.filter((participant) => participant.type === "traveller") ?? [];
  const groupStaff = selectedGroup?.participants.filter((participant) => participant.type === "staff") ?? [];

  const startConversation = () => {
    if (canStartConversation && !startConversationMutation.isPending) {
      startConversationMutation.mutate(conversationSearch);
    }
  };

  return (
    <div className="yb-reference-scale min-h-screen min-w-[1180px] bg-[#eef0ea] text-yb-ink" style={{ fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif' }}>
      <AppHeader tabs={NAV_TABS} compact />
      <WhatsAppSubnav active="inbox" conversationCount={conversations.length} groupCount={groups.length} showSecondaryTabs />

      <div className="flex items-end gap-[12px] px-[16px] pt-[12px] pb-[10px]">
        <div className="flex h-[22px] w-[22px] items-center justify-center border border-yb-line-btn bg-white">
          <div className="h-[10px] w-[10px] bg-yb-gold" />
        </div>
        <div>
          <div className="text-[10px] tracking-[1.4px] text-yb-muted4">INBOX</div>
          <div className="flex items-baseline gap-[9px]">
            <h1 className="text-[24px] font-bold tracking-[-0.2px]">WhatsApp</h1>
            <span className="flex items-center gap-[5px] text-[11.5px] text-yb-muted2">
              <span className={`h-[7px] w-[7px] rounded-full ${status?.status === "connected" ? "bg-[#2f8a4f]" : statusQuery.isError ? "bg-yb-gold" : "bg-yb-red"}`} />
              {statusQuery.isError
                ? "API unavailable"
                : status?.status === "connected"
                ? `Connected · ${displayPhone(status.phoneNumber)}`
                : status?.status === "qr_pending"
                  ? "Waiting for scan"
                  : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <label className="flex h-[29px] items-center gap-[7px] border border-yb-line-btn bg-white px-[9px] text-[11.5px] font-bold text-yb-ink2">
          <span>Account</span>
          <select
            aria-label="WhatsApp account"
            value={selectedAccountId ?? ""}
            onChange={(event) => { setSelectedAccountId(Number(event.target.value)); setSelectedId(null); }}
            className="bg-white text-[11.5px] font-normal outline-none"
          >
            {(accountsQuery.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>{account.label}{account.phoneNumber ? ` · ${displayPhone(account.phoneNumber)}` : ""}</option>
            ))}
          </select>
        </label>
        {isAdmin && systemSettingsQuery.data?.testDataDeletionEnabled && (
          <SecondaryButton
            className="h-[29px] rounded-none border-yb-red bg-yb-red px-[14px] py-[6px] text-[12px] text-white hover:bg-[#7f2117]"
            disabled={resetTestDataMutation.isPending}
            onClick={() => {
              const confirmation = window.prompt(
                "This permanently deletes all operational test data, including WhatsApp messages, conversations, groups, requests, clients, travellers, assignments, and notifications. Users, settings, audit history, and the WhatsApp connection are preserved.\n\nType DELETE ALL TEST DATA to continue.",
              );
              if (confirmation === "DELETE ALL TEST DATA") {
                resetTestDataMutation.mutate("DELETE ALL TEST DATA");
              }
            }}
          >
            {resetTestDataMutation.isPending ? "Deleting test data…" : "Delete all test data"}
          </SecondaryButton>
        )}
        {isAdmin && status?.status === "connected" && (
          <SecondaryButton
            className="h-[29px] rounded-none border-yb-red px-[14px] py-[6px] text-[12px] text-yb-red hover:bg-[#fff3f1]"
            disabled={disconnectMutation.isPending}
            onClick={() => {
              const confirmed = window.confirm(
                `Disconnect ${status.label}? Its messages stay in the database, but this number will be logged out and require a new QR code. Other WhatsApp accounts are not affected.`,
              );
              if (confirmed) disconnectMutation.mutate();
            }}
          >
            {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect WhatsApp"}
          </SecondaryButton>
        )}
        <Link to="/whatsapp-groups" className="border border-yb-line-btn bg-white px-[14px] py-[6px] text-[12px] text-yb-ink2 hover:bg-yb-hover-btn">
          Managed Groups
        </Link>
        <PrimaryButton className="rounded-none px-[14px] py-[6px] text-[12px]" onClick={() => searchInputRef.current?.focus()}>+ New Conversation</PrimaryButton>
      </div>

      <div className="px-[16px] pb-[24px]">
        {(disconnectMutation.isError || resetTestDataMutation.isError) && (
          <div role="alert" className="mb-[10px] border border-yb-red bg-[#fff3f1] px-[12px] py-[8px] text-[12px] text-yb-red">
            {resetTestDataMutation.error instanceof Error
              ? resetTestDataMutation.error.message
              : disconnectMutation.error instanceof Error
              ? disconnectMutation.error.message
              : "Could not complete the administrator action"}
          </div>
        )}
        {resetTestDataMutation.isSuccess && (
          <div role="status" className="mb-[10px] border border-yb-green bg-yb-row-hover px-[12px] py-[8px] text-[12px] font-bold text-yb-green">
            Test data deleted. The deletion control has been disabled automatically in Setup.
          </div>
        )}
        {statusQuery.isError ? (
          <Panel title="WHATSAPP SERVICE UNAVAILABLE" right="the saved WhatsApp session has not been changed" pad>
            <div className="flex flex-col items-center gap-[12px] py-6 text-center">
              <p className="max-w-[560px] text-[14px] text-yb-muted3">
                YB Travel cannot reach its local API, so it cannot determine the real WhatsApp connection state or request a QR code.
              </p>
              <PrimaryButton onClick={() => statusQuery.refetch()} disabled={statusQuery.isFetching}>
                {statusQuery.isFetching ? "Checking…" : "Retry API connection"}
              </PrimaryButton>
            </div>
          </Panel>
        ) : (
          <>
          {status?.status !== "connected" && (
          <div className="mb-[10px]">
          <Panel title="CONNECT WHATSAPP" right="message history and draft review remain available below" pad>
            {status?.status === "qr_pending" && status.qr ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="rounded-yb border border-yb-line bg-white p-4"><QRCode value={status.qr} size={220} /></div>
                <p className="max-w-[420px] text-center text-[13.5px] text-yb-muted3">
                  Open WhatsApp on the <strong>separate/test number</strong> → Linked Devices → Link a Device, and scan this code.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-[12px] py-6 text-center">
                <p className="max-w-[560px] text-[14px] text-yb-muted3">
                  Restoring the saved WhatsApp session first. If WhatsApp no longer accepts it, a new QR code will appear here automatically.
                </p>
                <PrimaryButton onClick={() => reconnectMutation.mutate()} disabled={reconnectMutation.isPending}>
                  {reconnectMutation.isPending ? "Restoring…" : "Try connection again"}
                </PrimaryButton>
                {reconnectMutation.isError && (
                  <p role="alert" className="text-[12px] text-yb-red">
                    {reconnectMutation.error instanceof Error ? reconnectMutation.error.message : "Could not restart the WhatsApp connection"}
                  </p>
                )}
              </div>
            )}
          </Panel>
          </div>
          )}
          <div className="grid h-[calc(100vh-190px)] min-h-[520px] max-h-[700px] grid-cols-[minmax(230px,280px)_minmax(340px,1fr)_minmax(390px,430px)] overflow-hidden border border-yb-line bg-white">
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-yb-line-soft">
              <div className="flex items-center border-b border-yb-line-soft bg-yb-panel-head px-[10px] py-[7px]">
                <div className="text-[10.5px] font-bold tracking-[1.2px] text-yb-panel-head-text">CONVERSATIONS</div>
                <div className="flex-1" />
                <div className="text-[11px] text-yb-muted3">{accountConversations.length} open</div>
              </div>
              <div className="border-b border-yb-line-row p-[10px]">
                <div className="flex gap-[7px]">
                  <input
                    ref={searchInputRef}
                    value={conversationSearch}
                    onChange={(event) => {
                      setConversationSearch(event.target.value);
                      startConversationMutation.reset();
                    }}
                    onKeyDown={(event) => { if (event.key === "Enter") startConversation(); }}
                    placeholder="Search name or +1 718 555 0123"
                    aria-label="Search conversations or enter a WhatsApp phone number"
                    className="h-[28px] min-w-0 flex-1 border border-[#8d968e] bg-white px-[7px] text-[12px] text-yb-ink outline-none focus:border-yb-green"
                  />
                  {canStartConversation && (
                    <PrimaryButton className="h-[28px] rounded-none px-[11px] text-[11px]" disabled={startConversationMutation.isPending} onClick={startConversation}>
                      {startConversationMutation.isPending ? "Checking…" : "Start"}
                    </PrimaryButton>
                  )}
                </div>
                <div className="mt-[7px] flex gap-[6px]">
                  {([
                    ["all", "All", accountConversations.length],
                    ["unread", "Unread", unreadCount],
                    ["groups", "Groups", groups.length],
                  ] as const).map(([value, label, count]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setConversationFilter(value)}
                      className={`border px-[9px] py-[3px] text-[11px] ${conversationFilter === value ? "border-yb-green bg-yb-green font-bold text-white" : "border-yb-line-btn bg-white text-yb-ink2 hover:bg-yb-row-hover"}`}
                    >
                      {label}{count > 0 && value !== "all" ? ` ${count}` : ""}
                    </button>
                  ))}
                </div>
                {startConversationMutation.isError && (
                  <p role="alert" className="mt-[5px] text-[11px] leading-[14px] text-yb-red">
                    {startConversationMutation.error instanceof Error ? startConversationMutation.error.message : "Could not start the conversation"}
                  </p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {filteredConversations.map((conversation) => {
                  const active = conversation.id === selectedId;
                  const managedGroup = groups.find((group) => group.conversationId === conversation.id);
                  const title = conversation.displayName ?? conversation.phoneNumber;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={`relative grid w-full grid-cols-[32px_minmax(0,1fr)] gap-[9px] border-b border-yb-line-row border-l-[3px] px-[10px] py-[10px] text-left ${active ? "border-l-yb-green bg-yb-row-hover" : "border-l-transparent bg-white hover:bg-yb-row-hover"}`}
                    >
                      <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11px] font-bold text-white ${managedGroup ? "bg-[#3d6b52]" : "bg-yb-green"}`}>
                        {initials(title)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-[6px]">
                          <span className="truncate text-[12.5px] font-bold text-yb-ink">{title}</span>
                          <span className="flex-1" />
                          <span className="whitespace-nowrap text-[10.5px] text-yb-muted4">{formatTime(conversation.lastMessageAt)}</span>
                        </span>
                        <span className="mt-[1px] block truncate text-[11px] text-yb-muted3">
                          {managedGroup ? `${managedGroup.clientName} · ${managedGroup.requestNumber}` : displayPhone(conversation.phoneNumber)}
                        </span>
                        <span className="mt-[4px] block truncate text-[11.5px] text-yb-ink2">{conversation.lastMessageBody ?? "No messages yet"}</span>
                        {Boolean(conversation.lastMessageBody) && !readConversationIds.has(conversation.id) && (
                          <span className="absolute right-[10px] bottom-[9px] rounded-full bg-yb-red px-[6px] py-px text-[10px] font-bold text-white">1</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {accountConversations.length === 0 && !normalizedSearch && (
                  <div className="px-[14px] py-6 text-center text-[13px] text-yb-muted3">No conversations yet. Enter a WhatsApp number above to start one, or wait for an incoming message.</div>
                )}
                {accountConversations.length > 0 && filteredConversations.length === 0 && (
                  <div className="px-[14px] py-6 text-center text-[13px] text-yb-muted3">No conversations match this search or filter.</div>
                )}
              </div>
            </section>

            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#f7f8f5]">
              {selectedConversation ? (
                <>
                  <div className="flex min-h-[46px] flex-wrap items-center gap-[10px] border-b border-yb-line-soft bg-white px-[14px] py-[8px]">
                    <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-yb-green text-[11px] font-bold text-white">{initials(selectedTitle)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{selectedTitle}</div>
                      <div className="truncate text-[11px] text-yb-muted3">
                        {selectedGroup
                          ? `${selectedConversation.accountLabel} · ${displayPhone(selectedConversation.phoneNumber)} · ${selectedGroup.clientName}`
                          : selectedConversation.clientName
                            ? `${selectedConversation.accountLabel} · ${displayPhone(selectedConversation.phoneNumber)} · ${selectedConversation.clientName}`
                            : `${selectedConversation.accountLabel} · ${displayPhone(selectedConversation.phoneNumber)}`}
                      </div>
                    </div>
                    <Link to="/requests" className="border border-yb-line-btn bg-white px-[11px] py-[5px] text-[11.5px] text-yb-ink2 hover:bg-yb-hover-btn">
                      Create Request
                    </Link>
                    <Link to="/whatsapp-groups" className="border border-yb-line-btn bg-white px-[11px] py-[5px] text-[11.5px] text-yb-ink2 hover:bg-yb-hover-btn">
                      {selectedGroup ? "Managed Group" : "Create Group"}
                    </Link>
                    <details className="relative">
                      <summary className="flex h-[28px] w-[32px] cursor-pointer list-none items-center justify-center border border-yb-line-btn bg-white text-[15px] text-yb-ink2 hover:bg-yb-hover-btn">…</summary>
                      <div className="absolute right-0 top-[32px] z-10 min-w-[145px] border border-yb-line-btn bg-white py-[4px] shadow-sm">
                        <Link to="/clients" className="block px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">View clients</Link>
                        <Link to="/whatsapp-groups" className="block px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">View groups</Link>
                      </div>
                    </details>
                  </div>
                  {!selectedGroup && !selectedConversation.clientId && (
                    <div className="flex items-center gap-[10px] border-b border-[#e6d9ab] bg-[#fdf7e6] px-[14px] py-[7px]">
                      <div className="text-[11.5px] text-[#8a6d10]">This number isn&apos;t linked to a client yet — link it so messages file to the right profile.</div>
                      <div className="flex-1" />
                      <Link
                        to="/clients"
                        search={{
                          newClient: true,
                          name: selectedConversation.displayName ?? "",
                          whatsappNumber: selectedConversation.phoneNumber,
                          conversationId: selectedConversation.id,
                        }}
                        className="border border-[#d1bd76] bg-white px-[10px] py-[4px] text-[11px] font-bold text-yb-ink2 hover:bg-[#fffaf0]"
                      >
                        Link to client
                      </Link>
                    </div>
                  )}
                  <div
                    aria-label="Message history"
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[16px] py-[14px] [scrollbar-gutter:stable]"
                  >
                    <div className="flex min-h-full flex-col gap-[8px]">
                      {messages.length > 0 && <div className="self-center rounded-[10px] bg-[#e9ece5] px-[10px] py-[2px] text-[10px] font-bold tracking-[1px] text-yb-muted4">TODAY</div>}
                      {messages.map((message) => (
                        <div key={message.id} className={`max-w-[62%] border px-[10px] pt-[7px] pb-[5px] ${message.direction === "outbound" ? "ml-auto rounded-[8px_2px_8px_8px] border-yb-green-darker bg-yb-green text-white" : "rounded-[2px_8px_8px_8px] border-yb-line-soft bg-white text-yb-ink"}`}>
                          {message.messageType === "audio" ? (
                            <VoiceNotePlayer messageId={message.id} available={message.hasAudio} />
                          ) : (
                            <div className="whitespace-pre-wrap text-[13px] leading-[1.45]">{message.body}</div>
                          )}
                          <div className={`mt-[3px] flex items-center justify-end gap-[5px] text-[10px] ${message.direction === "outbound" ? "text-[#bfd2c7]" : "text-yb-muted4"}`}>
                            <span>{formatTime(message.createdAt)}</span>
                            {message.direction === "outbound" && (
                              <span title="Accepted by WhatsApp; recipient delivery is not yet confirmed">✓</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {messages.length === 0 && <div className="flex flex-1 items-center justify-center text-[13px] text-yb-muted3">No messages yet. Send the first message below.</div>}
                    </div>
                  </div>
                  <div className="border-t border-yb-line-soft bg-white px-[12px] py-[8px]">
                    <VoiceNoteComposer
                      key={selectedConversation.id}
                      disabled={status?.status !== "connected"}
                      onSend={async (audio, durationSeconds) => {
                        await sendVoiceNoteMutation.mutateAsync({ audio, durationSeconds });
                      }}
                    />
                    <div className="mb-[7px] border border-[#ccd3cb] bg-[#f7f8f5] px-[8px] py-[7px]">
                      <div className="mb-[5px] text-[10px] font-bold uppercase tracking-[0.1em] text-yb-muted4">Approved WhatsApp template</div>
                      <div className="flex gap-[6px]">
                        <select aria-label="Approved WhatsApp template" value={templateId} onChange={(event) => { setTemplateId(event.target.value); setTemplateWarning(null); }} className="h-[29px] min-w-0 flex-1 border border-[#8d968e] bg-white px-[7px] text-[11px]">
                          <option value="">Select a template…</option>
                          {(templatesQuery.data ?? []).map((template) => <option key={template.id} value={template.id}>{template.purpose} · {template.name} ({template.languageName})</option>)}
                        </select>
                        <button type="button" disabled={!templateId || selectedId === null || renderTemplateMutation.isPending} onClick={() => renderTemplateMutation.mutate()} className="border border-yb-green bg-white px-[10px] text-[10.5px] font-bold text-yb-green disabled:opacity-50">{renderTemplateMutation.isPending ? "Preparing…" : "Use template"}</button>
                      </div>
                      {templateWarning && <div role="alert" className="mt-[5px] text-[10.5px] font-bold text-[#8a6d10]">{templateWarning}. Unresolved placeholders remain in the draft.</div>}
                      {renderTemplateMutation.isError && <div role="alert" className="mt-[5px] text-[10.5px] text-yb-red">{renderTemplateMutation.error instanceof Error ? renderTemplateMutation.error.message : "Template could not be prepared"}</div>}
                    </div>
                    <div className="mb-[7px] flex flex-wrap gap-[6px]">
                      {QUICK_REPLIES.map((quickReply) => (
                        <button key={quickReply.label} type="button" onClick={() => setReply(quickReply.text)} className="border border-[#ccd3cb] bg-[#f2f5f0] px-[9px] py-[3px] text-[11px] text-[#3c443d] hover:bg-[#e7ece5]">
                          {quickReply.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-[8px]">
                      <textarea
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey && reply.trim() && !sendMutation.isPending) {
                            event.preventDefault();
                            sendMutation.mutate(reply);
                          }
                        }}
                        rows={2}
                        placeholder="Type a reply…  (Shift+Enter for a new line)"
                        aria-label="Reply message"
                        className="w-full resize-none border border-[#8d968e] px-[8px] py-[6px] text-[13px] leading-[1.45] text-yb-ink outline-none focus:border-yb-green"
                      />
                      <div className="flex flex-col gap-[5px]">
                        <PrimaryButton className="rounded-none px-[20px] py-[7px] text-[12px]" disabled={!reply.trim() || sendMutation.isPending} onClick={() => sendMutation.mutate(reply)}>{sendMutation.isPending ? "Sending…" : "Send"}</PrimaryButton>
                        <div className="text-right text-[10.5px] text-yb-muted4">Logged to client file</div>
                      </div>
                    </div>
                    {sendMutation.isError && <div role="alert" className="mt-[5px] text-[11.5px] text-yb-red">{sendMutation.error instanceof Error ? sendMutation.error.message : "Could not send message"}</div>}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-[13px] text-yb-muted3">Pick a conversation on the left.</div>
              )}
            </section>

            <aside className="min-h-0 min-w-0 overflow-y-auto overscroll-contain border-l border-yb-line-soft bg-yb-toolbar [scrollbar-gutter:stable]">
              <div className="border-b border-yb-line-soft bg-yb-panel-head px-[10px] py-[7px] text-[10.5px] font-bold tracking-[1.2px] text-yb-panel-head-text">AI DRAFT INTAKE</div>
              {selectedConversation && (
                <DraftIntakePanel conversation={selectedConversation} onUseReply={setReply} />
              )}
              <div className="border-y border-yb-line-soft bg-yb-panel-head px-[10px] py-[7px] text-[10.5px] font-bold tracking-[1.2px] text-yb-panel-head-text">CONTEXT</div>
              {selectedConversation ? (
                selectedGroup ? (
                  <>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">CLIENT</div><Link to="/clients" className="text-[13px] font-bold text-yb-green underline">{selectedGroup.clientName}</Link><div className="mt-[3px] text-[11.5px] text-yb-muted3">Linked client record</div></div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">ACTIVE REQUEST</div><Link to="/requests" className="text-[12.5px] font-bold text-yb-green underline">{selectedGroup.requestNumber}</Link><div className="mt-[3px] text-[11.5px] leading-[17px] text-yb-muted2">{selectedGroup.tripSummary}</div><div className="mt-[6px] inline-block border border-[#e6d9ab] bg-[#fdf1cf] px-[7px] py-px text-[10.5px] font-bold text-[#8a6d10]">Linked request</div></div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]">
                      <div className="mb-[6px] text-[10px] tracking-[1px] text-yb-muted4">TRAVELLERS</div>
                      {[...groupTravellers, ...groupStaff].map((participant) => <div key={`${participant.type}-${participant.entityId}`} className="flex gap-[8px] py-[3px] text-[11.5px]"><span className="min-w-0 flex-1 truncate">{participant.displayName}</span><span className="text-[10.5px] text-yb-muted4">{participant.type === "traveller" ? "Traveller" : "Staff"}</span></div>)}
                      {selectedGroup.participants.length === 0 && <div className="text-[11.5px] text-yb-muted3">No participant records available.</div>}
                    </div>
                    <div className="px-[14px] py-[12px]"><div className="mb-[7px] text-[10px] tracking-[1px] text-yb-muted4">QUICK ACTIONS</div><div className="flex flex-col gap-[6px]"><button type="button" disabled title="Document upload is not available yet" className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-left text-[11.5px] text-yb-ink2">Attach itinerary PDF</button><button type="button" onClick={() => setReply("Please send a clear photo of the passport information page.")} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-left text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Request passport photo</button><Link to="/requests" className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Assign to another rep</Link></div></div>
                  </>
                ) : selectedConversation.clientId && selectedConversation.clientName ? (
                  <>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]">
                      <div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">CLIENT</div>
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: String(selectedConversation.clientId) }}
                        className="text-[13px] font-bold text-yb-green underline"
                      >
                        {selectedConversation.clientName}
                      </Link>
                      <div className="mt-[3px] text-[11.5px] text-yb-muted3">Linked client record</div>
                    </div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">WHATSAPP NUMBER</div><div className="text-[12px] text-yb-ink2">{displayPhone(selectedConversation.phoneNumber)}</div></div>
                    <div className="px-[14px] py-[12px]"><div className="mb-[7px] text-[10px] tracking-[1px] text-yb-muted4">QUICK ACTIONS</div><div className="flex flex-col gap-[6px]"><Link to="/clients/$clientId" params={{ clientId: String(selectedConversation.clientId) }} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">View client profile</Link><button type="button" onClick={() => setReply("Please send a clear photo of the passport information page.")} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-left text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Request passport photo</button></div></div>
                  </>
                ) : (
                  <>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">CLIENT</div><div className="text-[13px] font-bold text-yb-ink2">Not linked</div><div className="mt-[4px] text-[11.5px] leading-[17px] text-yb-muted3">This direct conversation is not yet connected to a client or travel request.</div></div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">WHATSAPP NUMBER</div><div className="text-[12px] text-yb-ink2">{displayPhone(selectedConversation.phoneNumber)}</div></div>
                    <div className="px-[14px] py-[12px]"><div className="mb-[7px] text-[10px] tracking-[1px] text-yb-muted4">QUICK ACTIONS</div><div className="flex flex-col gap-[6px]"><Link to="/clients" search={{ newClient: true, name: selectedConversation.displayName ?? "", whatsappNumber: selectedConversation.phoneNumber, conversationId: selectedConversation.id }} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Link to a client</Link><button type="button" onClick={() => setReply("Please send a clear photo of the passport information page.")} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-left text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Request passport photo</button></div></div>
                  </>
                )
              ) : (
                <div className="px-[14px] py-[18px] text-[12px] leading-[18px] text-yb-muted3">Select a conversation to view its available client and request context.</div>
              )}
            </aside>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

type DraftFormState = {
  requestTypeId: string;
  urgencyLevelId: string;
  summary: string;
  passengerCount: string;
  origin: string;
  destination: string;
  departureDateText: string;
  returnDateText: string;
  missingInformation: string;
  suggestedReply: string;
};

function draftToForm(draft: DraftIntakeRecord): DraftFormState {
  return {
    requestTypeId: draft.requestTypeId ? String(draft.requestTypeId) : "",
    urgencyLevelId: draft.urgencyLevelId ? String(draft.urgencyLevelId) : "",
    summary: draft.summary,
    passengerCount: draft.passengerCount ? String(draft.passengerCount) : "",
    origin: draft.origin ?? "",
    destination: draft.destination ?? "",
    departureDateText: draft.departureDateText ?? "",
    returnDateText: draft.returnDateText ?? "",
    missingInformation: draft.missingInformation.join("\n"),
    suggestedReply: draft.suggestedReply ?? "",
  };
}

function DraftIntakePanel({
  conversation,
  onUseReply,
}: {
  conversation: ConversationSummary;
  onUseReply: (value: string) => void;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["messaging", "conversations", conversation.id, "draft-intakes"] as const;
  const [form, setForm] = useState<DraftFormState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const draftsQuery = useQuery({
    queryKey,
    queryFn: () => messagingApi.listDraftIntakes(conversation.id),
  });
  const workflowQuery = useQuery({
    queryKey: ["request-workflow-settings", "active"],
    queryFn: requestWorkflowSettingsApi.listActive,
  });
  const latest = draftsQuery.data?.[0] ?? null;
  const conversationRequests = (draftsQuery.data ?? []).filter(
    (draft) =>
      draft.status === "approved" &&
      draft.travelRequestId !== null &&
      draft.travelRequestNumber !== null,
  );

  useEffect(() => {
    setForm(latest?.status === "pending" ? draftToForm(latest) : null);
    setNotice(null);
  }, [latest?.id, latest?.updatedAt, latest?.status]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ["requests"] });
  };
  const analyzeMutation = useMutation({
    mutationFn: () => messagingApi.analyzeLatestDraft(conversation.id),
    onSuccess: async (draft) => {
      setNotice(draft ? null : "No travel-service request was detected in the latest incoming message.");
      await refresh();
    },
  });
  const updateMutation = useMutation({
    mutationFn: (input: UpdateDraftIntakeInput) => messagingApi.updateDraftIntake(latest!.id, input),
    onSuccess: refresh,
  });
  const rejectMutation = useMutation({
    mutationFn: () => messagingApi.rejectDraftIntake(latest!.id),
    onSuccess: refresh,
  });
  const createMutation = useMutation({
    mutationFn: () => messagingApi.createRequestFromDraft(latest!.id),
    onSuccess: refresh,
  });
  const mutationError = analyzeMutation.error ?? updateMutation.error ?? rejectMutation.error ?? createMutation.error;
  const busy = analyzeMutation.isPending || updateMutation.isPending || rejectMutation.isPending || createMutation.isPending;

  const updateField = (field: keyof DraftFormState, value: string) =>
    setForm((current) => current ? { ...current, [field]: value } : current);

  const save = () => {
    if (!form) return;
    updateMutation.mutate({
      requestTypeId: Number(form.requestTypeId),
      urgencyLevelId: Number(form.urgencyLevelId),
      summary: form.summary,
      passengerCount: form.passengerCount ? Number(form.passengerCount) : null,
      origin: form.origin || null,
      destination: form.destination || null,
      departureDateText: form.departureDateText || null,
      returnDateText: form.returnDateText || null,
      missingInformation: form.missingInformation.split("\n").map((item) => item.trim()).filter(Boolean),
      suggestedReply: form.suggestedReply || null,
    });
  };

  if (draftsQuery.isLoading) {
    return <div className="px-[14px] py-[16px] text-[11.5px] text-yb-muted3">Checking for an AI draft…</div>;
  }

  if (!latest) {
    return (
      <div className="px-[14px] py-[13px]">
        <div className="text-[12px] font-bold text-yb-ink2">No draft intake yet</div>
        <p className="mt-[4px] text-[11.5px] leading-[17px] text-yb-muted3">
          New travel messages are analyzed automatically. You can also analyze the latest incoming message now.
        </p>
        <PrimaryButton
          className="mt-[9px] h-[29px] w-full rounded-none px-[10px] text-[11.5px]"
          disabled={analyzeMutation.isPending}
          onClick={() => analyzeMutation.mutate()}
        >
          {analyzeMutation.isPending ? "Analyzing…" : "Analyze latest message"}
        </PrimaryButton>
        {notice && <p className="mt-[7px] text-[11px] leading-[15px] text-yb-muted3">{notice}</p>}
        {mutationError && <DraftError error={mutationError} />}
      </div>
    );
  }

  if (latest.status === "failed") {
    return (
      <div className="px-[14px] py-[13px]">
        <div className="border border-[#e7c7c1] bg-[#fff4f1] px-[9px] py-[8px] text-[11.5px] text-yb-red">
          <strong>Analysis failed.</strong> {latest.analysisError ?? "The AI provider could not analyze this message."}
        </div>
        <PrimaryButton className="mt-[9px] h-[29px] w-full rounded-none text-[11.5px]" disabled={busy} onClick={() => analyzeMutation.mutate()}>
          {analyzeMutation.isPending ? "Retrying…" : "Retry analysis"}
        </PrimaryButton>
        {mutationError && <DraftError error={mutationError} />}
        <ConversationRequestHistory requests={conversationRequests} />
      </div>
    );
  }

  if (latest.status === "approved") {
    return (
      <div className="px-[14px] py-[13px]">
        <div className="border border-[#b9d2c1] bg-[#edf7f0] px-[9px] py-[8px] text-[11.5px] text-yb-green">
          <strong>Request created.</strong>
          {latest.travelRequestNumber && latest.travelRequestId && (
            <Link
              to="/requests/$requestId"
              params={{ requestId: String(latest.travelRequestId) }}
              className="ml-[4px] underline"
            >
              {latest.travelRequestNumber}
            </Link>
          )}
        </div>
        <div className="mt-[8px] text-[11.5px] leading-[16px] text-yb-ink2">{latest.summary}</div>
        <ConversationRequestHistory requests={conversationRequests} />
      </div>
    );
  }

  if (latest.status === "rejected") {
    return (
      <div className="px-[14px] py-[13px]">
        <div className="border border-yb-line-row bg-white px-[9px] py-[8px] text-[11.5px] text-yb-muted3">
          This AI draft was rejected{latest.reviewedByName ? ` by ${latest.reviewedByName}` : ""}. No request was created.
        </div>
        <PrimaryButton className="mt-[9px] h-[29px] w-full rounded-none text-[11.5px]" disabled={busy} onClick={() => analyzeMutation.mutate()}>
          Analyze latest message
        </PrimaryButton>
        <ConversationRequestHistory requests={conversationRequests} />
      </div>
    );
  }

  if (!form) return null;
  const inputClass = "mt-[3px] h-[27px] w-full border border-[#9aa29a] bg-white px-[6px] text-[11.5px] outline-none focus:border-yb-green";
  const labelClass = "block text-[9.5px] font-bold tracking-[.7px] text-yb-muted4";
  const valid = Boolean(form.requestTypeId && form.urgencyLevelId && form.summary.trim().length >= 3);

  return (
    <div className="px-[12px] py-[11px]">
      <div className="mb-[9px] flex items-center gap-[6px]">
        <span className="border border-[#dfc269] bg-[#fff3c9] px-[6px] py-[2px] text-[10px] font-bold text-[#765c08]">PENDING REVIEW</span>
        <span className="flex-1" />
        <span className="text-[10.5px] text-yb-muted3">{latest.confidence ?? 0}% confidence</span>
      </div>
      <div className="grid grid-cols-2 gap-[7px]">
        <label className={labelClass}>REQUEST TYPE
          <select className={inputClass} value={form.requestTypeId} onChange={(event) => updateField("requestTypeId", event.target.value)}>
            <option value="">Select…</option>
            {workflowQuery.data?.requestTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>URGENCY
          <select className={inputClass} value={form.urgencyLevelId} onChange={(event) => updateField("urgencyLevelId", event.target.value)}>
            <option value="">Select…</option>
            {workflowQuery.data?.urgencyLevels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <label className={`${labelClass} mt-[8px]`}>SUMMARY
        <textarea rows={2} className="mt-[3px] w-full resize-none border border-[#9aa29a] bg-white px-[6px] py-[5px] text-[11.5px] leading-[15px] outline-none focus:border-yb-green" value={form.summary} onChange={(event) => updateField("summary", event.target.value)} />
      </label>
      <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
        <label className={labelClass}>FROM<input className={inputClass} value={form.origin} onChange={(event) => updateField("origin", event.target.value)} /></label>
        <label className={labelClass}>TO<input className={inputClass} value={form.destination} onChange={(event) => updateField("destination", event.target.value)} /></label>
        <label className={labelClass}>DEPARTURE<input className={inputClass} value={form.departureDateText} onChange={(event) => updateField("departureDateText", event.target.value)} /></label>
        <label className={labelClass}>RETURN<input className={inputClass} value={form.returnDateText} onChange={(event) => updateField("returnDateText", event.target.value)} /></label>
      </div>
      <label className={`${labelClass} mt-[7px]`}>PASSENGERS
        <input type="number" min={1} max={100} className={inputClass} value={form.passengerCount} onChange={(event) => updateField("passengerCount", event.target.value)} />
      </label>
      <label className={`${labelClass} mt-[7px]`}>MISSING INFORMATION · ONE PER LINE
        <textarea rows={7} className="mt-[3px] min-h-[125px] w-full resize-y border border-[#9aa29a] bg-white px-[8px] py-[7px] text-[11.5px] leading-[17px] outline-none focus:border-yb-green" value={form.missingInformation} onChange={(event) => updateField("missingInformation", event.target.value)} />
      </label>
      <label className={`${labelClass} mt-[7px]`}>SUGGESTED REPLY · NOT SENT
        <textarea rows={7} className="mt-[3px] min-h-[125px] w-full resize-y border border-[#9aa29a] bg-white px-[8px] py-[7px] text-[11.5px] leading-[17px] outline-none focus:border-yb-green" value={form.suggestedReply} onChange={(event) => updateField("suggestedReply", event.target.value)} />
      </label>
      <div className="mt-[5px] text-[10.5px] leading-[14px] text-yb-muted3">AI prepares this draft. An employee must review it before anything is sent or created.</div>
      <div className="mt-[9px] grid grid-cols-2 gap-[6px]">
        <SecondaryButton className="h-[29px] rounded-none px-[8px] text-[11px]" disabled={busy || !valid} onClick={save}>{updateMutation.isPending ? "Saving…" : "Save edits"}</SecondaryButton>
        <SecondaryButton className="h-[29px] rounded-none px-[8px] text-[11px]" disabled={busy || !form.suggestedReply.trim()} onClick={() => onUseReply(form.suggestedReply)}>Use reply</SecondaryButton>
        <button type="button" className="h-[29px] border border-[#ba7770] bg-white px-[8px] text-[11px] font-bold text-yb-red hover:bg-[#fff4f1] disabled:opacity-50" disabled={busy} onClick={() => rejectMutation.mutate()}>{rejectMutation.isPending ? "Rejecting…" : "Reject draft"}</button>
        <PrimaryButton className="h-[29px] rounded-none px-[8px] text-[11px]" disabled={busy || !valid || !conversation.clientId} onClick={() => createMutation.mutate()}>{createMutation.isPending ? "Creating…" : "Create request"}</PrimaryButton>
      </div>
      {!conversation.clientId && <div className="mt-[6px] text-[10.5px] leading-[14px] text-[#8a6d10]">Link this conversation to a client before creating the request.</div>}
      {mutationError && <DraftError error={mutationError} />}
      <ConversationRequestHistory requests={conversationRequests} />
    </div>
  );
}

function ConversationRequestHistory({ requests }: { requests: DraftIntakeRecord[] }) {
  if (requests.length === 0) return null;

  return (
    <section className="mt-[12px] border-t border-yb-line-row pt-[10px]" aria-label="Requests in this conversation">
      <div className="flex items-center gap-[6px] text-[9.5px] font-bold tracking-[.7px] text-yb-muted4">
        <span>REQUESTS IN THIS CONVERSATION</span>
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e5ebe5] px-[5px] text-[10px] tracking-normal text-yb-green">
          {requests.length}
        </span>
      </div>
      <div className="mt-[7px] flex flex-col gap-[6px]">
        {requests.map((request) => (
          <Link
            key={request.id}
            to="/requests/$requestId"
            params={{ requestId: String(request.travelRequestId) }}
            className="block border border-yb-line-btn bg-white px-[9px] py-[8px] text-yb-ink2 hover:border-yb-green hover:bg-yb-row-hover"
          >
            <div className="flex items-start gap-[8px]">
              <strong className="text-[12px] text-yb-green underline">{request.travelRequestNumber}</strong>
              <span className="flex-1" />
              <span className="text-right text-[10px] text-yb-muted4">
                {new Date(request.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="mt-[3px] text-[11px] leading-[15px]">{request.summary}</div>
            <div className="mt-[5px] flex flex-wrap gap-x-[8px] gap-y-[2px] text-[10px] text-yb-muted3">
              {request.requestTypeName && <span>{request.requestTypeName}</span>}
              {request.urgencyName && <span>Urgency: {request.urgencyName}</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DraftError({ error }: { error: unknown }) {
  return (
    <div role="alert" className="mt-[7px] text-[11px] leading-[15px] text-yb-red">
      {error instanceof Error ? error.message : "The draft intake action could not be completed"}
    </div>
  );
}
