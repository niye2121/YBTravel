import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { notificationsApi, type StaffNotificationRecord } from "./api";
import { useAuth } from "./AuthContext";
import { getSocket } from "./socket";

type ViewedConversation = { id: number; throughMessageId: number } | null;
const Context = createContext({ unreadCount: 0, unreadByConversation: {} as Record<string, number>,
  setViewedConversation: (_value: ViewedConversation) => {}, sound: false, toggleSound: () => {} });
export const useInboxAlerts = () => useContext(Context);

export function InboxAlerts({ children }: { children: ReactNode }) {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user && can("whatsapp.read") && can("notifications.read"));
  const [viewedConversation, setViewedConversation] = useState<ViewedConversation>(null);
  const [focused, setFocused] = useState(document.visibilityState === "visible" && document.hasFocus());
  const [alert, setAlert] = useState<StaffNotificationRecord | null>(null);
  const [sound, setSound] = useState(() => localStorage.getItem(`yb-inbox-sound-${user?.id}`) === "true");
  const audio = useRef<AudioContext | null>(null);
  const latest = useRef<number | null>(null);
  const activeRead = useRef(false);
  const query = useQuery({ queryKey: ["staff-notifications", user?.id], queryFn: notificationsApi.list,
    enabled, refetchInterval: 10000, refetchIntervalInBackground: true });

  function toggleSound() {
    const next = !sound;
    setSound(next);
    localStorage.setItem(`yb-inbox-sound-${user?.id}`, String(next));
    if (next) {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
    }
  }

  useEffect(() => {
    if (!sound || !enabled) return;
    const unlock = () => {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, [sound, enabled]);

  useEffect(() => {
    const focus = () => setFocused(document.visibilityState === "visible" && document.hasFocus());
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", focus);
    return () => {
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", focus);
      void audio.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["staff-notifications", user?.id] }); };
    socket.on("message:new", refresh);
    socket.on("connect", refresh);
    return () => { socket.off("message:new", refresh); socket.off("connect", refresh); };
  }, [enabled, queryClient, user?.id]);

  useEffect(() => {
    if (!enabled || !query.data) return;
    const notifications = query.data.notifications;
    const newestId = Math.max(0, ...notifications.map((item) => item.id));
    const previous = latest.current;
    latest.current = Math.max(previous ?? 0, newestId);
    if (previous === null) return; // Saved alerts remain in the bell; do not replay them on sign-in.
    if (notifications.some((item) => item.id > previous && item.type === "whatsapp_message")) {
      // Polling also repairs an Inbox whose socket missed an event during reconnect.
      void queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
    }
    const incoming = notifications.find((item) => item.id > previous && item.type === "whatsapp_message" && !item.readAt
      && !(focused && viewedConversation?.id === Number(item.entityId)));
    if (!incoming) return;
    setAlert(incoming);
    if (sound) {
      try {
        audio.current ??= new AudioContext();
        const context = audio.current;
        if (context.state !== "running") return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.frequency.value = 740;
        gain.gain.setValueAtTime(0.06, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
        oscillator.start(); oscillator.stop(context.currentTime + 0.2);
      } catch { /* Visual alerts remain available when the browser blocks audio. */ }
    }
  }, [enabled, query.data, focused, viewedConversation, sound, queryClient]);

  useEffect(() => {
    if (!enabled || !focused || !viewedConversation || !viewedConversation.throughMessageId || activeRead.current) return;
    if (!query.data?.inboxUnreadByConversation[viewedConversation.id]) return;
    activeRead.current = true;
    void notificationsApi.readConversation(viewedConversation.id, viewedConversation.throughMessageId)
      .then(({ updatedCount }) => { if (updatedCount) void queryClient.invalidateQueries({ queryKey: ["staff-notifications", user?.id] }); })
      .catch(() => { /* Retry on the next notification poll. */ })
      .finally(() => { activeRead.current = false; });
  }, [enabled, focused, viewedConversation, query.data, queryClient, user?.id]);

  useEffect(() => {
    if (alert && focused && viewedConversation?.id === Number(alert.entityId)) setAlert(null);
  }, [alert, focused, viewedConversation]);

  return <Context.Provider value={{ unreadCount: enabled ? query.data?.inboxUnreadCount ?? 0 : 0,
    unreadByConversation: enabled ? query.data?.inboxUnreadByConversation ?? {} : {}, setViewedConversation, sound, toggleSound }}>
    {children}
    {enabled && alert && <aside role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-48px)] rounded-xl border border-[#d8e3dc] bg-white p-4 text-[#1b1e1c] shadow-xl">
      <div className="flex items-start gap-3"><div className="flex-1 text-sm font-semibold">{alert.title}</div><button type="button" aria-label="Dismiss message alert" onClick={() => setAlert(null)}>×</button></div>
      <p className="mt-2 text-xs text-[#6b6f69]">{alert.message}</p>
      <Link to="/inbox" search={{ conversationId: Number(alert.entityId) }} onClick={() => setAlert(null)} className="mt-3 inline-block rounded-lg bg-[#0d2f24] px-3 py-2 text-xs font-semibold text-white">Open conversation</Link>
    </aside>}
  </Context.Provider>;
}
