import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MoreHorizontal, Paperclip, Search, Square } from "lucide-react";
import QRCode from "react-qr-code";
import { z } from "zod";
import { AppHeader } from "../components/AppShell/AppHeader";
import { WhatsAppSubnav } from "../components/AppShell/WhatsAppSubnav";
import { useInboxAlerts } from "../lib/InboxAlerts";
import { Panel } from "../components/AppShell/Panel";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
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
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/inbox")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "whatsapp.read")) throw redirect({ to: "/" });
  },
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
    <div className="flex flex-wrap items-center justify-end gap-[6px]">
      <div className="flex items-center gap-[6px]">
        <label title="Attach audio" className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border border-[#e6e3da] bg-white text-[#6b6f69] hover:border-[#c3bfb2] hover:text-[#1b1e1c]">
          <Paperclip size={16} strokeWidth={1.8} />
          <input type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav" className="sr-only" disabled={disabled || recording || sending} onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) prepareBlob(file, null);
            event.currentTarget.value = "";
          }} />
        </label>
        <button title={recording ? "Stop recording" : "Record voice note"} type="button" disabled={disabled || sending} onClick={recording ? stopRecording : startRecording} className={`flex h-[34px] items-center justify-center gap-[5px] rounded-[9px] border px-[9px] text-[11px] font-semibold ${recording ? "border-yb-red bg-[#fff3f1] text-yb-red" : "w-[34px] border-[#e6e3da] bg-white text-[#6b6f69] hover:border-[#c3bfb2] hover:text-[#1b1e1c]"}`}>
          {recording ? <><Square size={12} fill="currentColor" />{recordingSeconds}s</> : <Mic size={16} strokeWidth={1.8} />}
        </button>
      </div>
      {prepared && <audio controls preload="metadata" src={prepared.url} className="h-[34px] min-w-[180px] flex-1" />}
      {prepared && <button type="button" disabled={sending || disabled} onClick={send} className="h-[34px] rounded-[9px] bg-[#0d2f24] px-[11px] text-[11.5px] font-semibold text-white disabled:opacity-60">{sending ? "Sending…" : "Send voice note"}</button>}
      {prepared && <button type="button" disabled={sending} onClick={clearPrepared} className="px-[5px] py-[4px] text-[11px] text-[#6b6f69] underline">Cancel</button>}
      {error && <div role="alert" className="w-full text-right text-[11px] text-yb-red">{error}</div>}
    </div>
  );
}

function InboxPage() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const { can } = useAuth();
  const canSend = can("whatsapp.send");
  const canUseTemplates = canSend && can("templates.read") && can("templates.use");
  const canCreateClient = can("clients.read") && can("clients.create") && can("fees.read");
  const canReadClients = can("clients.read");
  const canCreateRequest = can("requests.read") && can("requests.create");
  const canCreateGroup = can("whatsapp.create_groups");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageHistoryRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(search.conversationId ?? null);
  const [reply, setReply] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");
  const { unreadByConversation, setViewedConversation } = useInboxAlerts();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
  const draftReplySelectedRef = useRef(false);

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
    enabled: can("settings.manage"),
  });
  const templatesQuery = useQuery({ queryKey: ["message-templates", "active"], queryFn: messageTemplatesApi.listActive, enabled: canUseTemplates });
  const reconnectMutation = useMutation({
    mutationFn: (accountId: number) => messagingApi.reconnectAccount(accountId),
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
      if (draftReplySelectedRef.current) {
        setDetailsPanelOpen(false);
        draftReplySelectedRef.current = false;
      }
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
    setDetailsPanelOpen(true);
    draftReplySelectedRef.current = false;
  }, [selectedId]);

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
    const first = conversationsQuery.data?.find((conversation) => selectedAccountId === null || conversation.accountId === selectedAccountId);
    if (selectedId === null && first) {
      setSelectedId(first.id);
    }
  }, [conversationsQuery.data, selectedAccountId, selectedId]);

  const status = accountsQuery.data?.find((account) => account.id === selectedAccountId) ?? statusQuery.data;
  const conversations = conversationsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const lastViewedMessageId = Math.max(0, ...messages.map((message) => message.id));
  useEffect(() => {
    setViewedConversation(selectedId === null ? null : { id: selectedId, throughMessageId: lastViewedMessageId });
    return () => setViewedConversation(null);
  }, [selectedId, lastViewedMessageId, setViewedConversation]);
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
      return (unreadByConversation[conversation.id] ?? 0) > 0;
    }
    return true;
  });
  const unreadCount = accountConversations.filter(
    (conversation) => (unreadByConversation[conversation.id] ?? 0) > 0,
  ).length;
  const phoneDigits = conversationSearch.replace(/[^0-9]/g, "").replace(/^00/, "");
  const canStartConversation =
    canSend && /^[+0-9\s().-]+$/.test(conversationSearch.trim()) && /^[1-9]\d{7,14}$/.test(phoneDigits);
  const selectedTitle = selectedConversation?.displayName ?? selectedConversation?.phoneNumber ?? "";
  const groupTravellers = selectedGroup?.participants.filter((participant) => participant.type === "traveller") ?? [];
  const groupStaff = selectedGroup?.participants.filter((participant) => participant.type === "staff") ?? [];

  useEffect(() => {
    const history = messageHistoryRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages.length, selectedId]);

  const startConversation = () => {
    if (canStartConversation && !startConversationMutation.isPending) {
      startConversationMutation.mutate(conversationSearch);
    }
  };

  return (
    <div className="yb-inbox-redesign flex h-screen min-h-[780px] flex-col overflow-auto bg-[#f6f5f1] text-[#1b1e1c]">
      <AppHeader tabs={NAV_TABS} query={conversationSearch} onQueryChange={setConversationSearch} />

      <WhatsAppSubnav active="inbox" conversationCount={conversations.length} groupCount={groups.length} showSecondaryTabs />

      <div className="flex shrink-0 flex-wrap items-center gap-[20px] px-[24px] pt-[18px] pb-[14px]">
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#8e918a]">Inbox</div>
          <div className="mt-[2px] flex flex-wrap items-center gap-[10px]">
            <h1 className="m-0 yb-page-title">WhatsApp</h1>
            <span className="flex items-center gap-[6px] rounded-full border border-[#cfe0d2] bg-[#e8f0e9] px-[10px] py-[3px] text-[11.5px] font-semibold text-[#1f5f43]">
              <span className={`h-[6px] w-[6px] rounded-full ${status?.status === "connected" ? "bg-[#2e8a5c]" : statusQuery.isError ? "bg-yb-gold" : "bg-yb-red"}`} />
              {statusQuery.isError
                ? "API unavailable"
                : status?.status === "connected"
                ? <>Connected <span className="font-mono font-normal text-[#4a7a63]">{displayPhone(status.phoneNumber)}</span></>
                : status?.status === "qr_pending"
                  ? "Waiting for scan"
                  : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <label className="flex h-[36px] items-center gap-[8px] rounded-[9px] border border-[#ddd9cf] bg-white px-[12px] text-[11px] text-[#8e918a]">
          <span>Account</span>
          <select
            aria-label="WhatsApp account"
            value={selectedAccountId ?? ""}
            onChange={(event) => { setSelectedAccountId(Number(event.target.value)); setSelectedId(null); }}
            className="max-w-[220px] bg-white text-[13px] font-medium text-[#1b1e1c] outline-none"
          >
            {(accountsQuery.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>{account.label}{account.phoneNumber ? ` · ${displayPhone(account.phoneNumber)}` : ""}</option>
            ))}
          </select>
        </label>
        <Link to="/whatsapp-groups" className="flex h-[36px] items-center rounded-[9px] border border-[#ddd9cf] bg-white px-[14px] text-[13px] font-medium text-[#1b1e1c] hover:border-[#c3bfb2]">
          Managed Groups
        </Link>
        <details className="relative">
          <summary title="More actions" className="flex h-[36px] w-[36px] cursor-pointer list-none items-center justify-center rounded-[9px] border border-[#ddd9cf] bg-white text-[#6b6f69] hover:border-[#c3bfb2] hover:text-[#1b1e1c]"><MoreHorizontal size={17} /></summary>
          <div className="absolute right-0 top-[42px] z-30 min-w-[210px] rounded-[11px] border border-[#e6e3da] bg-white p-[6px] shadow-[0_8px_24px_rgba(15,25,20,0.16)]">
            {can("whatsapp.manage_accounts") && status?.status === "connected" && <button type="button" disabled={disconnectMutation.isPending} onClick={() => { const confirmed = window.confirm(`Disconnect ${status.label}? Its messages stay in the database, but this number will be logged out and require a new QR code. Other WhatsApp accounts are not affected.`); if (confirmed) disconnectMutation.mutate(); }} className="block w-full rounded-[7px] px-[10px] py-[8px] text-left text-[12.5px] text-yb-red hover:bg-[#fff4f1]">{disconnectMutation.isPending ? "Disconnecting…" : "Disconnect WhatsApp"}</button>}
            {can("test_data.delete") && systemSettingsQuery.data?.testDataDeletionEnabled && <button type="button" disabled={resetTestDataMutation.isPending} onClick={() => { const confirmation = window.prompt("This permanently deletes all operational test data, including WhatsApp messages, conversations, groups, requests, clients, travellers, assignments, and notifications. Users, settings, audit history, and the WhatsApp connection are preserved.\n\nType DELETE ALL TEST DATA to continue."); if (confirmation === "DELETE ALL TEST DATA") resetTestDataMutation.mutate("DELETE ALL TEST DATA"); }} className="block w-full rounded-[7px] px-[10px] py-[8px] text-left text-[12.5px] text-yb-red hover:bg-[#fff4f1]">{resetTestDataMutation.isPending ? "Deleting test data…" : "Delete all test data"}</button>}
          </div>
        </details>
        {canSend && <PrimaryButton className="h-[36px] rounded-[9px] border-[#0d2f24] bg-[#0d2f24] px-[16px] text-[13px] font-semibold shadow-[0_1px_2px_rgba(13,47,36,0.24)]" onClick={() => searchInputRef.current?.focus()}>New Conversation</PrimaryButton>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-[24px] pb-[24px] max-md:px-[12px] max-md:pb-[12px]">
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
          {can("whatsapp.manage_accounts") && status?.status !== "connected" && (
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
                <PrimaryButton
                  onClick={() => { if (status) reconnectMutation.mutate(status.id); }}
                  disabled={!status || reconnectMutation.isPending}
                >
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
          <div className={`grid min-h-[560px] flex-1 gap-[12px] overflow-hidden ${detailsPanelOpen ? "grid-cols-1 md:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,300px)_minmax(420px,1fr)_minmax(300px,340px)]" : "grid-cols-1 md:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]"}`}>
            <section className="yb-card yb-inbox-list min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#e6e3da] bg-white">
              <div className="flex items-center px-[14px] pt-[14px] pb-[10px]">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#8e918a]">Conversations</div>
                <div className="flex-1" />
                <div className="text-[11.5px] text-[#8e918a]">{accountConversations.length} open</div>
              </div>
              <div className="border-b border-[#eeece5] px-[14px] pb-[10px]">
                <div className="flex gap-[7px]">
                  <div className="flex h-[34px] min-w-0 flex-1 items-center gap-[8px] rounded-[9px] border border-[#e6e3da] bg-[#f6f5f1] px-[11px]">
                    <Search size={13} strokeWidth={1.7} className="shrink-0 text-[#a5a89f]" />
                    <input
                    ref={searchInputRef}
                    value={conversationSearch}
                    onChange={(event) => {
                      setConversationSearch(event.target.value);
                      startConversationMutation.reset();
                    }}
                    onKeyDown={(event) => { if (event.key === "Enter") startConversation(); }}
                    placeholder="Search name or number"
                    aria-label="Search conversations or enter a WhatsApp phone number"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1b1e1c] outline-none"
                  />
                  </div>
                  {canStartConversation && (
                    <PrimaryButton className="h-[34px] rounded-[8px] px-[11px] text-[11px]" disabled={startConversationMutation.isPending} onClick={startConversation}>
                      {startConversationMutation.isPending ? "Checking…" : "Start"}
                    </PrimaryButton>
                  )}
                </div>
                <div className="mt-[10px] flex gap-[6px]">
                  {([
                    ["all", "All", accountConversations.length],
                    ["unread", "Unread", unreadCount],
                    ["groups", "Groups", groups.length],
                  ] as const).map(([value, label, count]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setConversationFilter(value)}
                      className={`flex-1 rounded-[7px] border px-[8px] py-[5px] text-[12px] font-medium ${conversationFilter === value ? "border-[#0d2f24] bg-[#0d2f24] font-semibold text-white" : "border-[#e6e3da] bg-white text-[#5d615b] hover:border-[#c3bfb2]"}`}
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

              <div className="min-h-0 flex-1 overflow-y-auto p-[6px] overscroll-contain [scrollbar-gutter:stable]">
                {filteredConversations.map((conversation) => {
                  const active = conversation.id === selectedId;
                  const managedGroup = groups.find((group) => group.conversationId === conversation.id);
                  const title = conversation.displayName ?? conversation.phoneNumber;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={`relative mb-[2px] grid w-full grid-cols-[34px_minmax(0,1fr)] gap-[11px] rounded-[11px] px-[10px] py-[11px] text-left shadow-[inset_3px_0_0_transparent] ${active ? "bg-[#f1f5f1] shadow-[inset_3px_0_0_#0d2f24]" : "bg-transparent hover:bg-[#f6f5f1]"}`}
                    >
                      <span className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-semibold ${active ? "bg-[#0d2f24] text-[#e0b64a]" : managedGroup ? "bg-[#e6eee8] text-[#3d6b52]" : "bg-[#eef0ec] text-[#5d615b]"}`}>
                        {initials(title)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-[6px]">
                          <span className="truncate text-[13.5px] font-semibold text-[#1b1e1c]">{title}</span>
                          <span className="flex-1" />
                          <span className="whitespace-nowrap text-[11px] text-[#9a9d96]">{formatTime(conversation.lastMessageAt)}</span>
                        </span>
                        <span className="mt-[2px] block truncate font-mono text-[11px] text-[#9a9d96]">
                          {managedGroup ? `${managedGroup.clientName} · ${managedGroup.requestNumber}` : displayPhone(conversation.phoneNumber)}
                        </span>
                        <span className="mt-[5px] block truncate text-[12.5px] text-[#8e918a]">{conversation.lastMessageBody ?? "No messages yet"}</span>
                        {(unreadByConversation[conversation.id] ?? 0) > 0 && (
                          <span className="absolute right-[10px] bottom-[9px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0d2f24] px-[5px] text-[11px] font-semibold text-white">{unreadByConversation[conversation.id]}</span>
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

            <section className="yb-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#e6e3da] bg-white">
              {selectedConversation ? (
                <>
                  <div className="flex min-h-[60px] flex-wrap items-center gap-[12px] border-b border-[#eeece5] bg-white px-[16px] py-[12px]">
                    <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#0d2f24] text-[14px] font-semibold text-[#e0b64a]">{initials(selectedTitle)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{selectedTitle}</div>
                      <div className="truncate font-mono text-[11.5px] text-[#8e918a]">
                        {selectedGroup
                          ? `${selectedConversation.accountLabel} · ${displayPhone(selectedConversation.phoneNumber)} · ${selectedGroup.clientName}`
                          : selectedConversation.clientName
                            ? `${selectedConversation.accountLabel} · ${displayPhone(selectedConversation.phoneNumber)} · ${selectedConversation.clientName}`
                            : `${selectedConversation.accountLabel} · ${displayPhone(selectedConversation.phoneNumber)}`}
                      </div>
                    </div>
                    {canCreateRequest && <Link to="/requests" className="flex h-[32px] items-center rounded-[8px] bg-[#0d2f24] px-[13px] text-[12.5px] font-semibold text-white hover:bg-[#134a37]">
                      Create Request
                    </Link>}
                    {canCreateGroup && <Link to="/whatsapp-groups" className="flex h-[32px] items-center rounded-[8px] border border-[#ddd9cf] bg-white px-[13px] text-[12.5px] font-medium text-[#1b1e1c] hover:border-[#c3bfb2]">
                      {selectedGroup ? "Managed Group" : "Create Group"}
                    </Link>}
                    <button
                      type="button"
                      aria-expanded={detailsPanelOpen}
                      aria-controls="inbox-details-panel"
                      onClick={() => setDetailsPanelOpen((open) => !open)}
                      className="flex h-[32px] items-center rounded-[8px] border border-[#ddd9cf] bg-white px-[13px] text-[12.5px] font-medium text-[#1b1e1c] hover:border-[#c3bfb2]"
                    >
                      {detailsPanelOpen ? "Hide AI panel" : "Show AI panel"}
                    </button>
                    <details className="relative">
                      <summary className="flex h-[32px] w-[32px] cursor-pointer list-none items-center justify-center rounded-[8px] border border-[#ddd9cf] bg-white text-[#6b6f69] hover:border-[#c3bfb2]"><MoreHorizontal size={16} /></summary>
                      <div className="absolute right-0 top-[36px] z-10 min-w-[145px] rounded-[9px] border border-[#ddd9cf] bg-white p-[4px] shadow-sm">
                        {canReadClients && <Link to="/clients" className="block px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">View clients</Link>}
                        <Link to="/whatsapp-groups" className="block px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">View groups</Link>
                      </div>
                    </details>
                  </div>
                  {!selectedGroup && !selectedConversation.clientId && (
                    <div className="flex items-center gap-[10px] border-b border-[#e6d9ab] bg-[#fdf7e6] px-[14px] py-[7px]">
                      <div className="text-[11.5px] text-[#8a6d10]">This number isn&apos;t linked to a client yet — link it so messages file to the right profile.</div>
                      <div className="flex-1" />
                      {canCreateClient && <Link
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
                      </Link>}
                    </div>
                  )}
                  <div
                    ref={messageHistoryRef}
                    aria-label="Message history"
                    className="min-h-0 flex-1 overflow-y-auto bg-[#fbfaf7] px-[22px] py-[20px] overscroll-contain [scrollbar-gutter:stable]"
                  >
                    <div className="flex min-h-full flex-col gap-[14px]">
                      {messages.length > 0 && <div className="self-center rounded-full bg-[#efece4] px-[12px] py-[4px] text-[11px] font-medium text-[#7d807a]">Today</div>}
                      {messages.map((message) => (
                        <div key={message.id} className={`max-w-[min(620px,78%)] px-[14px] pt-[11px] pb-[8px] shadow-[0_1px_2px_rgba(20,25,20,0.05)] ${message.direction === "outbound" ? "ml-auto rounded-[14px_14px_4px_14px] bg-[#0d2f24] text-[#f2f5f2]" : "rounded-[14px_14px_14px_4px] border border-[#e9e6de] bg-white text-[#1b1e1c]"}`}>
                          {message.messageType === "audio" ? (
                            <VoiceNotePlayer messageId={message.id} available={message.hasAudio} />
                          ) : (
                            <div className="whitespace-pre-wrap text-[14px] leading-[1.5]">{message.body}</div>
                          )}
                          <div className={`mt-[5px] flex items-center justify-end gap-[5px] text-[10.5px] ${message.direction === "outbound" ? "text-[#f2f5f2]/60" : "text-[#a5a89f]"}`}>
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
                  {canSend ? <div className="flex flex-col gap-[10px] border-t border-[#eeece5] bg-white px-[16px] pt-[12px] pb-[14px]">
                    <div className="flex items-center gap-[8px]">
                      <div className="flex min-w-0 flex-1 items-center gap-[7px] overflow-x-auto pb-[2px]">
                        {QUICK_REPLIES.map((quickReply) => (
                          <button key={quickReply.label} type="button" onClick={() => setReply(quickReply.text)} className="shrink-0 whitespace-nowrap rounded-full border border-[#e6e3da] bg-[#faf9f5] px-[12px] py-[4px] text-[12.5px] text-[#3d423c] hover:border-[#c3bfb2] hover:bg-white">
                            {quickReply.label}
                          </button>
                        ))}
                      </div>
                      {canUseTemplates && <div className="flex h-[30px] shrink-0 items-center gap-[6px] rounded-[9px] border border-[#e6e3da] bg-[#faf9f5] px-[10px]">
                        <select aria-label="Approved WhatsApp template" value={templateId} onChange={(event) => { setTemplateId(event.target.value); setTemplateWarning(null); }} className="max-w-[105px] bg-transparent text-[12px] text-[#6b6f69] outline-none">
                          <option value="">Template</option>
                          {(templatesQuery.data ?? []).map((template) => <option key={template.id} value={template.id}>{template.purpose} · {template.name} ({template.languageName})</option>)}
                        </select>
                        {templateId && <button type="button" disabled={selectedId === null || renderTemplateMutation.isPending} onClick={() => renderTemplateMutation.mutate()} className="text-[11px] font-semibold text-[#0d4030] disabled:opacity-50">{renderTemplateMutation.isPending ? "Preparing…" : "Use"}</button>}
                      </div>}
                    </div>
                    {templateWarning && <div role="alert" className="text-[10.5px] font-semibold text-[#8a6d10]">{templateWarning}. Unresolved placeholders remain in the draft.</div>}
                    {renderTemplateMutation.isError && <div role="alert" className="text-[10.5px] text-yb-red">{renderTemplateMutation.error instanceof Error ? renderTemplateMutation.error.message : "Template could not be prepared"}</div>}
                    <div className="flex items-end gap-[10px] rounded-[12px] border border-[#ddd9cf] bg-white p-[10px] pl-[14px] focus-within:border-[#0d2f24]">
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
                        className="min-w-0 flex-1 resize-none bg-transparent py-[2px] text-[14px] leading-[1.5] text-[#1b1e1c] outline-none"
                      />
                      <VoiceNoteComposer key={selectedConversation.id} disabled={status?.status !== "connected"} onSend={async (audio, durationSeconds) => { await sendVoiceNoteMutation.mutateAsync({ audio, durationSeconds }); }} />
                      <PrimaryButton className="h-[34px] rounded-[9px] border-[#0d2f24] bg-[#0d2f24] px-[18px] text-[13px] font-semibold" disabled={!reply.trim() || sendMutation.isPending} onClick={() => sendMutation.mutate(reply)}>{sendMutation.isPending ? "Sending…" : "Send"}</PrimaryButton>
                    </div>
                    <div className="text-[11px] text-[#9a9d96]">Replies are logged to the client file automatically.</div>
                    {sendMutation.isError && <div role="alert" className="mt-[5px] text-[11.5px] text-yb-red">{sendMutation.error instanceof Error ? sendMutation.error.message : "Could not send message"}</div>}
                  </div> : <div className="border-t border-[#eeece5] bg-[#faf9f5] px-[16px] py-[13px] text-[12px] text-[#6b6f69]">You have read-only access to WhatsApp conversations.</div>}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-[13px] text-yb-muted3">Pick a conversation on the left.</div>
              )}
            </section>

            {detailsPanelOpen && <aside id="inbox-details-panel" className="yb-inbox-details min-h-0 min-w-0 overflow-y-auto rounded-[14px] border border-[#e6e3da] bg-white overscroll-contain [scrollbar-gutter:stable]">
              <div className="border-b border-[#eeece5] px-[14px] py-[14px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#8e918a]">AI draft intake</div>
              {selectedConversation && (
                <DraftIntakePanel
                  conversation={selectedConversation}
                  onUseReply={(value) => {
                    setReply(value);
                    draftReplySelectedRef.current = true;
                  }}
                />
              )}
              <div className="border-y border-[#eeece5] px-[14px] py-[12px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#8e918a]">Context</div>
              {selectedConversation ? (
                selectedGroup ? (
                  <>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">CLIENT</div>{canReadClients ? <Link to="/clients" className="text-[13px] font-bold text-yb-green underline">{selectedGroup.clientName}</Link> : <div className="text-[13px] font-bold">{selectedGroup.clientName}</div>}<div className="mt-[3px] text-[11.5px] text-yb-muted3">Linked client record</div></div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">ACTIVE REQUEST</div>{can("requests.read") ? <Link to="/requests" className="text-[12.5px] font-bold text-yb-green underline">{selectedGroup.requestNumber}</Link> : <div className="text-[12.5px] font-bold">{selectedGroup.requestNumber}</div>}<div className="mt-[3px] text-[11.5px] leading-[17px] text-yb-muted2">{selectedGroup.tripSummary}</div><div className="mt-[6px] inline-block border border-[#e6d9ab] bg-[#fdf1cf] px-[7px] py-px text-[10.5px] font-bold text-[#8a6d10]">Linked request</div></div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]">
                      <div className="mb-[6px] text-[10px] tracking-[1px] text-yb-muted4">TRAVELLERS</div>
                      {[...groupTravellers, ...groupStaff].map((participant) => <div key={`${participant.type}-${participant.entityId}`} className="flex gap-[8px] py-[3px] text-[11.5px]"><span className="min-w-0 flex-1 truncate">{participant.displayName}</span><span className="text-[10.5px] text-yb-muted4">{participant.type === "traveller" ? "Traveller" : "Staff"}</span></div>)}
                      {selectedGroup.participants.length === 0 && <div className="text-[11.5px] text-yb-muted3">No participant records available.</div>}
                    </div>
                    {(canSend || can("requests.assign_any")) && <div className="px-[14px] py-[12px]"><div className="mb-[7px] text-[10px] tracking-[1px] text-yb-muted4">QUICK ACTIONS</div><div className="flex flex-col gap-[6px]">{canSend && <button type="button" onClick={() => setReply("Please send a clear photo of the passport information page.")} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-left text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Request passport photo</button>}{can("requests.assign_any") && <Link to="/requests" className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Assign to another rep</Link>}</div></div>}
                  </>
                ) : selectedConversation.clientId && selectedConversation.clientName ? (
                  <>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]">
                      <div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">CLIENT</div>
                      {canReadClients ? <Link
                        to="/clients/$clientId"
                        params={{ clientId: String(selectedConversation.clientId) }}
                        className="text-[13px] font-bold text-yb-green underline"
                      >
                        {selectedConversation.clientName}
                      </Link> : <div className="text-[13px] font-bold">{selectedConversation.clientName}</div>}
                      <div className="mt-[3px] text-[11.5px] text-yb-muted3">Linked client record</div>
                    </div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">WHATSAPP NUMBER</div><div className="text-[12px] text-yb-ink2">{displayPhone(selectedConversation.phoneNumber)}</div></div>
                    {(canReadClients || canSend) && <div className="px-[14px] py-[12px]"><div className="mb-[7px] text-[10px] tracking-[1px] text-yb-muted4">QUICK ACTIONS</div><div className="flex flex-col gap-[6px]">{canReadClients && <Link to="/clients/$clientId" params={{ clientId: String(selectedConversation.clientId) }} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">View client profile</Link>}{canSend && <button type="button" onClick={() => setReply("Please send a clear photo of the passport information page.")} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-left text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Request passport photo</button>}</div></div>}
                  </>
                ) : (
                  <>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">CLIENT</div><div className="text-[13px] font-bold text-yb-ink2">Not linked</div><div className="mt-[4px] text-[11.5px] leading-[17px] text-yb-muted3">This direct conversation is not yet connected to a client or travel request.</div></div>
                    <div className="border-b border-yb-line-row px-[14px] py-[12px]"><div className="mb-[4px] text-[10px] tracking-[1px] text-yb-muted4">WHATSAPP NUMBER</div><div className="text-[12px] text-yb-ink2">{displayPhone(selectedConversation.phoneNumber)}</div></div>
                    {(canCreateClient || canSend) && <div className="px-[14px] py-[12px]"><div className="mb-[7px] text-[10px] tracking-[1px] text-yb-muted4">QUICK ACTIONS</div><div className="flex flex-col gap-[6px]">{canCreateClient && <Link to="/clients" search={{ newClient: true, name: selectedConversation.displayName ?? "", whatsappNumber: selectedConversation.phoneNumber, conversationId: selectedConversation.id }} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Link to a client</Link>}{canSend && <button type="button" onClick={() => setReply("Please send a clear photo of the passport information page.")} className="border border-yb-line-btn bg-white px-[10px] py-[6px] text-left text-[11.5px] text-yb-ink2 hover:bg-yb-row-hover">Request passport photo</button>}</div></div>}
                  </>
                )
              ) : (
                <div className="px-[14px] py-[18px] text-[12px] leading-[18px] text-yb-muted3">Select a conversation to view its available client and request context.</div>
              )}
            </aside>}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

type DraftFormState = {
  bookingChoice: string;
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
    bookingChoice: draft.bookingResolution === "matched" && draft.matchedTravelRequestId
      ? `booking:${draft.matchedTravelRequestId}`
      : draft.bookingResolution === "new_booking" ? "new" : "",
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

/**
 * Converts the employee's reviewed fields and booking choice into the API
 * payload. A blank choice remains ambiguous and therefore cannot be applied
 * until the employee chooses an open booking or a separate booking.
 */
function draftFormToInput(form: DraftFormState): UpdateDraftIntakeInput {
  const matchedId = form.bookingChoice.startsWith("booking:")
    ? Number(form.bookingChoice.slice("booking:".length))
    : null;
  return {
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
    bookingResolution: matchedId ? "matched" : form.bookingChoice === "new" ? "new_booking" : "ambiguous",
    matchedTravelRequestId: matchedId,
  };
}

/**
 * Shows each booking only once even when several approved customer messages
 * were applied to the same booking over time.
 */
function uniqueConversationRequests(drafts: DraftIntakeRecord[]): DraftIntakeRecord[] {
  const seenRequestIds = new Set<number>();
  return drafts.filter((draft) => {
    if (draft.status !== "approved" || draft.travelRequestId === null || draft.travelRequestNumber === null) {
      return false;
    }
    if (seenRequestIds.has(draft.travelRequestId)) return false;
    seenRequestIds.add(draft.travelRequestId);
    return true;
  });
}

function DraftIntakePanel({
  conversation,
  onUseReply,
}: {
  conversation: ConversationSummary;
  onUseReply: (value: string) => void;
}) {
  const { can } = useAuth();
  const canUpdateRequests = can("requests.update");
  const canCreateRequests = can("requests.create");
  const canReadRequests = can("requests.read");
  const canSendReply = can("whatsapp.send");
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
    enabled: canUpdateRequests,
  });
  const latest = draftsQuery.data?.[0] ?? null;
  const conversationRequests = uniqueConversationRequests(draftsQuery.data ?? []);

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
    mutationFn: async (input: UpdateDraftIntakeInput) => {
      await messagingApi.updateDraftIntake(latest!.id, input);
      return messagingApi.createRequestFromDraft(latest!.id);
    },
    onSuccess: refresh,
  });
  const applyMutation = useMutation({
    mutationFn: async (input: UpdateDraftIntakeInput) => {
      await messagingApi.updateDraftIntake(latest!.id, input);
      return messagingApi.applyDraftToBooking(latest!.id);
    },
    onSuccess: refresh,
  });
  const mutationError = analyzeMutation.error ?? updateMutation.error ?? rejectMutation.error ?? createMutation.error ?? applyMutation.error;
  const busy = analyzeMutation.isPending || updateMutation.isPending || rejectMutation.isPending || createMutation.isPending || applyMutation.isPending;

  const updateField = (field: keyof DraftFormState, value: string) =>
    setForm((current) => current ? { ...current, [field]: value } : current);

  const save = () => {
    if (!form) return;
    updateMutation.mutate(draftFormToInput(form));
  };

  if (draftsQuery.isLoading) {
    return <div className="px-[14px] py-[16px] text-[12.5px] text-[#8e918a]">Checking for an AI draft…</div>;
  }

  if (!latest) {
    return (
      <div className="px-[14px] py-[14px]">
        <div className="text-[12.5px] font-semibold text-[#1b1e1c]">No draft intake yet</div>
        <p className="mt-[5px] text-[12.5px] leading-[1.55] text-[#5d615b]">
          New travel messages are analyzed automatically. You can also analyze the latest incoming message now.
        </p>
        {canUpdateRequests && <PrimaryButton
          className="mt-[12px] h-[34px] w-full rounded-[9px] border-[#0d2f24] bg-[#0d2f24] px-[10px] text-[12.5px] font-semibold"
          disabled={analyzeMutation.isPending}
          onClick={() => analyzeMutation.mutate()}
        >
          {analyzeMutation.isPending ? "Analyzing…" : "Analyze latest message"}
        </PrimaryButton>}
        {notice && <p className="mt-[7px] text-[11px] leading-[15px] text-yb-muted3">{notice}</p>}
        {mutationError && <DraftError error={mutationError} />}
      </div>
    );
  }

  if (latest.status === "failed") {
    return (
      <div className="px-[14px] py-[14px]">
        <div className="rounded-[9px] border border-[#e7c7c1] bg-[#fff4f1] px-[11px] py-[10px] text-[12.5px] leading-[1.5] text-yb-red">
          <strong>Analysis failed.</strong> {latest.analysisError ?? "The AI provider could not analyze this message."}
        </div>
        {canUpdateRequests && <PrimaryButton className="mt-[12px] h-[34px] w-full rounded-[9px] text-[12.5px]" disabled={busy} onClick={() => analyzeMutation.mutate()}>
          {analyzeMutation.isPending ? "Retrying…" : "Retry analysis"}
        </PrimaryButton>}
        {mutationError && <DraftError error={mutationError} />}
        <ConversationRequestHistory requests={conversationRequests} />
      </div>
    );
  }

  if (latest.status === "approved") {
    return (
      <div className="px-[14px] py-[14px]">
        <div className="rounded-[9px] border border-[#b9d2c1] bg-[#edf7f0] px-[11px] py-[10px] text-[12.5px] leading-[1.5] text-yb-green">
          <strong>{latest.bookingResolution === "matched" ? "Information added to booking." : "Separate booking created."}</strong>
          {canReadRequests && latest.travelRequestNumber && latest.travelRequestId && (
            <Link
              to="/requests/$requestId"
              params={{ requestId: String(latest.travelRequestId) }}
              className="ml-[4px] underline"
            >
              {latest.travelRequestNumber}
            </Link>
          )}
        </div>
        <div className="mt-[10px] text-[12.5px] leading-[1.55] text-[#3d423c]">{latest.summary}</div>
        {canUpdateRequests && <SecondaryButton className="mt-[12px] h-[34px] w-full rounded-[9px] border-[#ddd9cf] px-[8px] text-[12px] font-semibold" disabled={busy} onClick={() => analyzeMutation.mutate()}>
          {analyzeMutation.isPending ? "Regenerating…" : "Regenerate draft from latest message"}
        </SecondaryButton>}
        <div className="mt-[6px] text-[11px] leading-[15px] text-[#8e918a]">
          Use this when the latest message was attached to the wrong booking. The existing booking record is not deleted.
        </div>
        <ConversationRequestHistory requests={conversationRequests} />
      </div>
    );
  }

  if (latest.status === "rejected") {
    return (
      <div className="px-[14px] py-[14px]">
        <div className="rounded-[9px] border border-[#e6e3da] bg-white px-[11px] py-[10px] text-[12.5px] leading-[1.55] text-[#5d615b]">
          This AI draft was rejected{latest.reviewedByName ? ` by ${latest.reviewedByName}` : ""}. No request was created.
        </div>
        {canUpdateRequests && <PrimaryButton className="mt-[12px] h-[34px] w-full rounded-[9px] border-[#0d2f24] bg-[#0d2f24] text-[12.5px] font-semibold" disabled={busy} onClick={() => analyzeMutation.mutate()}>
          Analyze latest message
        </PrimaryButton>}
        <ConversationRequestHistory requests={conversationRequests} />
      </div>
    );
  }

  if (!canUpdateRequests) {
    return <div className="px-[14px] py-[14px]"><div className="text-[12.5px] font-semibold">Draft awaiting review</div><p className="mt-[5px] text-[12px] leading-[18px] text-yb-muted3">You can read this conversation, but reviewing or changing its intake draft requires request update permission.</p><ConversationRequestHistory requests={conversationRequests} /></div>;
  }
  if (!form) return null;
  const inputClass = "mt-[3px] h-[27px] w-full border border-[#9aa29a] bg-white px-[6px] text-[11.5px] outline-none focus:border-yb-green";
  const labelClass = "block text-[9.5px] font-bold tracking-[.7px] text-yb-muted4";
  const valid = Boolean(form.requestTypeId && form.urgencyLevelId && form.summary.trim().length >= 3);
  const bookingSelected = Boolean(form.bookingChoice);
  const selectedExistingBooking = form.bookingChoice.startsWith("booking:");
  const hasLinkedClientContext = Boolean(conversation.clientId || latest.openBookings.length > 0);

  return (
    <div className="px-[12px] py-[11px]">
      <div className="mb-[9px] flex items-center gap-[6px]">
        <span className="border border-[#dfc269] bg-[#fff3c9] px-[6px] py-[2px] text-[10px] font-bold text-[#765c08]">PENDING REVIEW</span>
        <span className="flex-1" />
        <span className="text-[10.5px] text-yb-muted3">{latest.confidence ?? 0}% confidence</span>
      </div>
      <div className="mb-[9px] border border-yb-line-row bg-white px-[8px] py-[7px]">
        <label className={labelClass}>WHICH BOOKING DOES THIS INFORMATION RELATE TO?
          <select
            className={inputClass}
            value={form.bookingChoice}
            onChange={(event) => updateField("bookingChoice", event.target.value)}
          >
            <option value="">Choose an open booking…</option>
            {latest.openBookings.map((booking) => (
              <option key={booking.id} value={`booking:${booking.id}`}>
                {booking.requestNumber} · {booking.summary}
              </option>
            ))}
            <option value="new">Create a separate booking</option>
          </select>
        </label>
        {latest.bookingResolution === "new_booking" && (
          <div className="mt-[6px] text-[10.5px] font-bold leading-[14px] text-[#8a6d10]">
            This looks like a new booking. Confirm the separate-booking option before creating it.
          </div>
        )}
        {latest.bookingResolution === "ambiguous" && (
          <div className="mt-[6px] text-[10.5px] font-bold leading-[14px] text-[#8a6d10]">
            The system could not identify one booking confidently. Please choose the correct open booking.
          </div>
        )}
        {latest.bookingMatchReason && <div className="mt-[5px] text-[10.5px] leading-[14px] text-yb-muted3">{latest.bookingMatchReason}</div>}
        {latest.dateInferenceNote && <div className="mt-[5px] text-[10.5px] leading-[14px] text-yb-muted3">{latest.dateInferenceNote}</div>}
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
      <SecondaryButton className="mt-[9px] h-[29px] w-full rounded-none px-[8px] text-[11px]" disabled={busy} onClick={() => analyzeMutation.mutate()}>
        {analyzeMutation.isPending ? "Regenerating…" : "Regenerate draft from latest message"}
      </SecondaryButton>
      <div className="mt-[9px] grid grid-cols-2 gap-[6px]">
        <SecondaryButton className="h-[29px] rounded-none px-[8px] text-[11px]" disabled={busy || !valid} onClick={save}>{updateMutation.isPending ? "Saving…" : "Save edits"}</SecondaryButton>
        {canSendReply && <SecondaryButton className="h-[29px] rounded-none px-[8px] text-[11px]" disabled={busy || !form.suggestedReply.trim()} onClick={() => onUseReply(form.suggestedReply)}>Use reply</SecondaryButton>}
        <button type="button" className="h-[29px] border border-[#ba7770] bg-white px-[8px] text-[11px] font-bold text-yb-red hover:bg-[#fff4f1] disabled:opacity-50" disabled={busy} onClick={() => rejectMutation.mutate()}>{rejectMutation.isPending ? "Rejecting…" : "Reject draft"}</button>
        {selectedExistingBooking ? (
          <PrimaryButton className="h-[29px] rounded-none px-[8px] text-[11px]" disabled={busy || !valid || !bookingSelected || !hasLinkedClientContext} onClick={() => applyMutation.mutate(draftFormToInput(form))}>{applyMutation.isPending ? "Applying…" : "Apply to booking"}</PrimaryButton>
        ) : canCreateRequests ? (
          <PrimaryButton className="h-[29px] rounded-none px-[8px] text-[11px]" disabled={busy || !valid || form.bookingChoice !== "new" || !hasLinkedClientContext} onClick={() => createMutation.mutate(draftFormToInput(form))}>{createMutation.isPending ? "Creating…" : "Create separate booking"}</PrimaryButton>
        ) : <div className="px-[5px] text-[10.5px] leading-[14px] text-[#8a6d10]">Creating a separate booking requires request create permission.</div>}
      </div>
      {!hasLinkedClientContext && <div className="mt-[6px] text-[10.5px] leading-[14px] text-[#8a6d10]">Link this conversation to a client before creating or updating a booking.</div>}
      {mutationError && <DraftError error={mutationError} />}
      <ConversationRequestHistory requests={conversationRequests} />
    </div>
  );
}

function ConversationRequestHistory({ requests }: { requests: DraftIntakeRecord[] }) {
  const { can } = useAuth();
  if (requests.length === 0) return null;

  return (
    <section className="mt-[14px] border-t border-[#eeece5] pt-[14px]" aria-label="Requests in this conversation">
      <div className="flex items-center gap-[6px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#8e918a]">
        <span>Requests</span>
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e5ebe5] px-[5px] text-[10px] tracking-normal text-yb-green">
          {requests.length}
        </span>
      </div>
      <div className="mt-[10px] flex flex-col gap-[8px]">
        {requests.map((request) => (
          can("requests.read") ? <Link
            key={request.id}
            to="/requests/$requestId"
            params={{ requestId: String(request.travelRequestId) }}
            className="block rounded-[11px] border border-[#e6e3da] bg-white px-[12px] py-[11px] text-[#3d423c] hover:border-[#c3bfb2] hover:shadow-[0_1px_3px_rgba(20,25,20,0.06)]"
          >
            <div className="flex items-start gap-[8px]">
              <strong className="font-mono text-[12.5px] font-medium text-[#0d4030] underline">{request.travelRequestNumber}</strong>
              <span className="flex-1" />
              <span className="text-right text-[11px] text-[#9a9d96]">
                {new Date(request.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="mt-[6px] text-[12.5px] leading-[1.5]">{request.summary}</div>
            <div className="mt-[9px] flex flex-wrap gap-[6px] text-[10.5px] font-medium">
              {request.requestTypeName && <span className="rounded-[5px] bg-[#eef3ef] px-[7px] py-[2px] text-[#3d5c4d]">{request.requestTypeName}</span>}
              {request.urgencyName && <span className="rounded-[5px] bg-[#f4f2ec] px-[7px] py-[2px] text-[#6b6f69]">{request.urgencyName} urgency</span>}
            </div>
          </Link> : <div key={request.id} className="block rounded-[11px] border border-[#e6e3da] bg-white px-[12px] py-[11px] text-[#3d423c]"><strong className="font-mono text-[12.5px] font-medium">{request.travelRequestNumber}</strong><div className="mt-[6px] text-[12.5px] leading-[1.5]">{request.summary}</div></div>
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
