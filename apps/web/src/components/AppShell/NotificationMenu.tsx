import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { notificationsApi, type StaffNotificationRecord } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useInboxAlerts } from "../../lib/InboxAlerts";

function notificationTime(value: string): string {
  const date = new Date(value);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationMenu({ compact = false }: { compact?: boolean }) {
  const { user, can } = useAuth();
  const { sound, toggleSound } = useInboxAlerts();
  const canReadNotifications = can("notifications.read");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationsQuery = useQuery({
    queryKey: ["staff-notifications", user?.id],
    queryFn: notificationsApi.list,
    enabled: Boolean(user && canReadNotifications),
    refetchInterval: 15_000,
  });
  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-notifications", user?.id] }),
  });
  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-notifications", user?.id] }),
  });

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function openNotification(notification: StaffNotificationRecord) {
    if (notification.readAt === null) await markReadMutation.mutateAsync(notification.id);
    setOpen(false);
    if (notification.entityType === "conversation") {
      await navigate({ to: "/inbox", search: { conversationId: Number(notification.entityId) } });
    } else if (notification.entityType === "travel_request") {
      await navigate({
        to: "/requests/$requestId",
        params: { requestId: notification.entityId },
      });
    } else if (notification.entityType === "reminder") {
      await navigate({ to: "/reminders" });
    }
  }

  const data = notificationsQuery.data;
  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  if (!canReadNotifications) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex items-center justify-center border border-transparent text-yb-nav-text hover:border-white/30 hover:text-white ${compact ? "h-[24px] w-[26px]" : "h-[30px] w-[32px]"}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`${compact ? "h-[15px] w-[15px]" : "h-[18px] w-[18px]"} fill-none stroke-current`}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-[4px] -top-[5px] flex min-w-[17px] items-center justify-center rounded-full bg-yb-gold px-[4px] py-[1px] text-[9px] font-black leading-[13px] text-yb-gold-text">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[34px] z-30 w-[390px] overflow-hidden rounded-yb border border-yb-line bg-white text-yb-ink">
          <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[12px] py-[9px]">
            <div>
              <div className="text-[13px] font-black">Notifications</div>
              <div className="text-[10.5px] text-yb-muted3">{unreadCount} unread</div>
            </div>
            <div className="flex-1" />
            {unreadCount > 0 && (
              <button type="button" disabled={markAllReadMutation.isPending}
                onClick={() => markAllReadMutation.mutate()}
                className="text-[11px] font-bold text-yb-green underline disabled:text-yb-muted4">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[430px] overflow-y-auto">
            {can("whatsapp.read") && <button type="button" aria-pressed={sound} onClick={toggleSound} className="block w-full border-b border-yb-line px-[14px] py-[10px] text-left text-[12px] text-yb-ink">Message sound: {sound ? "On — mute" : "Off — enable"}</button>}
            {notificationsQuery.isLoading && (
              <div className="px-[14px] py-[24px] text-center text-[12px] text-yb-muted3">Loading notifications…</div>
            )}
            {!notificationsQuery.isLoading && notifications.length === 0 && (
              <div className="px-[14px] py-[24px] text-center text-[12px] text-yb-muted3">No notifications yet.</div>
            )}
            {notifications.map((notification) => (
              <button key={notification.id} type="button"
                onClick={() => void openNotification(notification)}
                className={`block w-full border-b border-yb-line-row px-[13px] py-[10px] text-left hover:bg-yb-row-hover ${notification.readAt === null ? "bg-[#f1f7f2]" : "bg-white"}`}>
                <span className="flex items-start gap-[8px]">
                  <span className={`mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full ${notification.readAt === null ? "bg-yb-green" : "bg-yb-line-btn"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-black">{notification.title}</span>
                    <span className="mt-[2px] block line-clamp-2 text-[11px] leading-[16px] text-yb-muted2">{notification.message}</span>
                    <span className="mt-[3px] block text-[10px] text-yb-muted4">
                      {notificationTime(notification.createdAt)}{notification.createdByName ? ` · Assigned by ${notification.createdByName}` : ""}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); void navigate({ to: "/reminders" }); }}
            className="block w-full border-t border-yb-line bg-yb-toolbar px-[13px] py-[9px] text-left text-[11px] font-bold text-yb-green hover:bg-yb-row-hover"
          >
            Open reminder queue →
          </button>
        </div>
      )}
    </div>
  );
}
