import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Inbox,
  MessageCircleMore,
  Plane,
  TicketCheck,
  UserRoundPlus,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  ALERTS,
  DEPARTURES,
  QUEUE,
  TILES,
  URGENT,
  type Departure,
  type Tile,
} from "../data/homeData";
import { useAuth } from "../lib/AuthContext";
import { NAV_TABS } from "../lib/navTabs";
import { countdown } from "../lib/time";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type Level = Departure["level"] | "info";

const levelColour = (level: Level) =>
  level === "urgent"
    ? "text-yb-red"
    : level === "warn"
      ? "text-yb-amber"
      : level === "done"
        ? "text-yb-muted5"
        : "text-yb-ink2";

const tileIcons: Record<Tile["key"], ReactNode> = {
  needsAction: <Clock3 size={16} strokeWidth={1.8} />,
  holds: <AlertTriangle size={16} strokeWidth={1.8} />,
  ready: <TicketCheck size={16} strokeWidth={1.8} />,
  waiting: <MessageCircleMore size={16} strokeWidth={1.8} />,
  intake: <Inbox size={16} strokeWidth={1.8} />,
  unassigned: <UserRoundPlus size={16} strokeWidth={1.8} />,
};

function DashboardPanel({ title, detail, action, children }: {
  title: string;
  detail: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="yb-card mb-[14px] overflow-hidden border border-yb-line bg-white">
      <header className="flex min-h-[42px] items-center border-b border-yb-line-soft px-[14px]">
        <div>
          <h2 className="text-[11px] font-bold tracking-[1.15px] text-yb-panel-head-text">{title}</h2>
          <p className="mt-[1px] text-[11px] text-yb-muted3">{detail}</p>
        </div>
        <div className="flex-1" />
        {action}
      </header>
      {children}
    </section>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [mountedAt] = useState(() => Date.now());
  const [activeTile, setActiveTile] = useState<string | null>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = now.getTime() - mountedAt;
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now),
    [now],
  );
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const brooklynHour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hourCycle: "h23",
  }).format(now));
  const greeting = brooklynHour < 12 ? "Good morning" : brooklynHour < 17 ? "Good afternoon" : "Good evening";

  if (!can("requests.read")) {
    const availableAreas = [
      can("whatsapp.read") ? { label: "WhatsApp Inbox", to: "/inbox" as const } : null,
      can("notifications.read") ? { label: "Reminders", to: "/reminders" as const } : null,
      can("clients.read") ? { label: "Clients", to: "/clients" as const } : null,
      can("travellers.read") ? { label: "Travellers", to: "/travellers" as const } : null,
      can("workloads.manage") ? { label: "Reports", to: "/reports" as const } : null,
    ].filter((area): area is NonNullable<typeof area> => area !== null);
    return (
      <div className="min-h-screen min-w-[1180px] bg-yb-canvas text-yb-ink">
        <AppHeader tabs={NAV_TABS} compact />
        <main className="px-[16px] pt-[14px] pb-[32px]">
          <section className="yb-card border border-yb-line border-t-[3px] border-t-yb-green bg-white px-[22px] py-[22px]">
            <div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">Brooklyn desk</div>
            <h1 className="mt-[3px] yb-page-title">{greeting}{user?.name ? `, ${user.name}` : ""}</h1>
            <p className="mt-[7px] max-w-[680px] text-[13px] leading-[19px] text-yb-muted3">
              Your home page shows only the operational areas assigned to you. Request workload and travel-watch data require request read permission.
            </p>
            <div className="mt-[16px] flex flex-wrap gap-[8px]">
              {availableAreas.map((area) => <SecondaryButton key={area.to} className="h-[32px] px-[14px] text-[12px]" onClick={() => void navigate({ to: area.to })}>{area.label}</SecondaryButton>)}
              {availableAreas.length === 0 && <div className="border border-yb-line bg-yb-toolbar px-[12px] py-[8px] text-[12px] text-yb-muted3">No operational areas have been assigned. Ask an administrator to review your permissions.</div>}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-[1180px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} compact />

      <main className="px-[16px] pt-[14px] pb-[32px]">
        <header className="mb-[14px] flex items-end gap-[12px]">
          <div className="flex h-[22px] w-[22px] items-center justify-center border border-yb-line-btn bg-white" aria-hidden="true">
            <div className="h-[10px] w-[10px] bg-yb-gold" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">Home · Brooklyn desk</div>
            <div className="flex items-baseline gap-[9px]">
              <h1 className="yb-page-title">
                {greeting}{user?.name ? `, ${user.name}` : ""}
              </h1>
              <span className="text-[12px] text-yb-muted3">{dateLabel} · {timeLabel}</span>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-[8px]">
            {can("whatsapp.read") && can("requests.create") && <PrimaryButton className="h-[30px] px-[14px] text-[12px]" onClick={() => void navigate({ to: "/inbox" })}>
              + New Request
            </PrimaryButton>}
            {can("clients.read") && can("clients.create") && can("fees.read") && <SecondaryButton
              className="h-[30px] px-[14px] text-[12px]"
              onClick={() => void navigate({ to: "/clients", search: { newClient: true } })}
            >
              + New Client
            </SecondaryButton>}
          </div>
        </header>

        <section aria-label="Work summary" className="mb-[14px] grid grid-cols-6 gap-[10px]">
          {TILES.map((tile) => {
            const selected = activeTile === tile.key;
            return (
              <button
                key={tile.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveTile(selected ? null : tile.key)}
                className={`group min-h-[92px] border bg-white px-[13px] py-[11px] text-left transition-colors ${
                  selected
                    ? "border-yb-green shadow-[inset_0_-3px_0_#0f4430]"
                    : "border-yb-line hover:border-yb-line-btn hover:bg-yb-row-hover"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-[25px] leading-none font-black tabular-nums ${tile.urgent ? "text-yb-red" : "text-yb-green"}`}>
                    {tile.n}
                  </span>
                  <span className={tile.urgent ? "text-yb-red" : "text-yb-muted3"}>{tileIcons[tile.key]}</span>
                </div>
                <div className="mt-[8px] text-[10px] font-bold tracking-[0.85px] text-yb-ink2">{tile.label}</div>
                <div className="mt-[2px] text-[11px] text-yb-muted3">{tile.sub}</div>
              </button>
            );
          })}
        </section>

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(400px,2fr)] items-start gap-[14px]">
          <div className="min-w-0">
            <DashboardPanel
              title="REQUIRES YOUR ATTENTION"
              detail={activeTile ? `Filtered by ${TILES.find((tile) => tile.key === activeTile)?.label.toLowerCase()}` : "Priority work, ordered by the nearest deadline"}
              action={can("requests.read") ? (
                <button type="button" onClick={() => void navigate({ to: "/requests" })} className="flex items-center gap-[5px] text-[11px] font-bold text-yb-green hover:underline">
                  Open requests <ArrowRight size={13} />
                </button>
              ) : undefined}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] table-fixed border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-yb-table-head text-yb-muted">
                      <th className="w-[88px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold">Request</th>
                      <th className="w-[112px] border-b border-yb-line px-2 py-[7px] text-left font-bold">Client</th>
                      <th className="w-[105px] border-b border-yb-line px-2 py-[7px] text-left font-bold">Trip</th>
                      <th className="w-[130px] border-b border-yb-line px-2 py-[7px] text-left font-bold">Stage</th>
                      <th className="border-b border-yb-line px-2 py-[7px] text-right font-bold">Next action</th>
                      <th className="w-[54px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold">Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {URGENT.map((request) => {
                      const deadline = request.liveIn
                        ? `${request.prefix} ${countdown(request.liveIn - elapsed)}`
                        : request.deadline;
                      return (
                        <tr
                          key={request.id}
                          onMouseEnter={() => setHoverRow(request.id)}
                          onMouseLeave={() => setHoverRow(null)}
                          className={`cursor-pointer ${hoverRow === request.id ? "bg-yb-row-hover" : "bg-white"}`}
                        >
                          <td className="border-b border-yb-line-row py-[9px] pr-2 pl-[14px] font-bold text-yb-green underline">{request.id}</td>
                          <td className="border-b border-yb-line-row px-2 py-[9px] font-bold">{request.client}</td>
                          <td className="border-b border-yb-line-row px-2 py-[9px] text-yb-ink2">{request.trip}</td>
                          <td className="border-b border-yb-line-row px-2 py-[9px] text-yb-ink2">{request.stage}</td>
                          <td className={`border-b border-yb-line-row px-2 py-[9px] text-right ${request.alert ? "font-bold text-yb-red" : "text-yb-muted"}`}>{deadline}</td>
                          <td className="border-b border-yb-line-row py-[9px] pr-[14px] pl-2 text-right text-yb-muted3">{request.agent}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>

            <DashboardPanel title="ALERTS" detail={`${ALERTS.filter((alert) => alert.level === "urgent").length} urgent operational alerts`}>
              {ALERTS.map((alert, index) => (
                <div key={alert.text} className={`flex items-center gap-[10px] px-[14px] py-[9px] text-[12px] ${index < ALERTS.length - 1 ? "border-b border-yb-line-row" : ""}`}>
                  <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${alert.level === "urgent" ? "bg-yb-red" : alert.level === "warn" ? "bg-yb-amber" : "bg-yb-muted5"}`} />
                  <span className="text-yb-ink2">{alert.text}</span>
                </div>
              ))}
            </DashboardPanel>
          </div>

          <div className="min-w-0">
            <DashboardPanel
              title="TRAVELLING SOON"
              detail="Check-in and departure watch"
              action={<Plane size={16} className="text-yb-green" strokeWidth={1.7} />}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[490px] table-fixed border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-yb-table-head text-yb-muted">
                      <th className="w-[125px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold">Client</th>
                      <th className="w-[92px] border-b border-yb-line px-2 py-[7px] text-left font-bold">Trip</th>
                      <th className="w-[65px] border-b border-yb-line px-2 py-[7px] text-left font-bold">Flight</th>
                      <th className="w-[108px] border-b border-yb-line px-2 py-[7px] text-left font-bold">Departs</th>
                      <th className="border-b border-yb-line py-[7px] pr-[14px] pl-2 text-left font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEPARTURES.map((departure) => (
                      <tr key={`${departure.client}-${departure.flight}`} className="hover:bg-yb-row-hover">
                        <td className="border-b border-yb-line-row py-[9px] pr-2 pl-[14px] font-bold">
                          {departure.client}<span className="font-normal text-yb-muted5"> · {departure.pax}</span>
                        </td>
                        <td className="border-b border-yb-line-row px-2 py-[9px] text-yb-ink2">{departure.trip}</td>
                        <td className="border-b border-yb-line-row px-2 py-[9px] text-yb-ink2">{departure.flight}</td>
                        <td className="border-b border-yb-line-row px-2 py-[9px] tabular-nums text-yb-ink2">{departure.local}</td>
                        <td className={`border-b border-yb-line-row py-[9px] pr-[14px] pl-2 ${levelColour(departure.level)} ${departure.level === "urgent" || departure.level === "warn" ? "font-bold" : ""}`}>{departure.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>

            <DashboardPanel title="YOUR QUEUE" detail={`${QUEUE.reduce((sum, item) => sum + item.n, 0)} assigned across ${QUEUE.length} stages`}>
              <div className="px-[14px] py-[7px]">
                {QUEUE.map((item) => (
                  <div key={item.stage} className="grid grid-cols-[118px_1fr_22px] items-center gap-[9px] py-[5px] text-[12px]">
                    <span className="text-yb-ink2">{item.stage}</span>
                    <span className="h-[6px] overflow-hidden bg-yb-line-row">
                      <span className="block h-full bg-yb-green" style={{ width: `${(item.n / 7) * 100}%` }} />
                    </span>
                    <span className="text-right font-bold tabular-nums">{item.n}</span>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>
        </div>
      </main>
    </div>
  );
}
