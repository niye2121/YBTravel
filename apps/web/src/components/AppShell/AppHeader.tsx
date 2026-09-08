import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { NavTab } from "../../lib/navTabs";
import { useAuth } from "../../lib/AuthContext";
import { useInboxAlerts } from "../../lib/InboxAlerts";
import { NotificationMenu } from "./NotificationMenu";
import { SetupMenu } from "./SetupMenu";
import { ProfileMenu } from "./ProfileMenu";
import { ImplementationStatusIcon } from "../ImplementationStatusIcon";

type AppHeaderProps = { tabs: NavTab[]; query?: string; onQueryChange?: (value: string) => void; compact?: boolean };

export function AppHeader({ tabs, query, onQueryChange }: AppHeaderProps) {
  const { can } = useAuth();
  const { unreadCount } = useInboxAlerts();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = tabs.filter((tab) => !tab.permission || can(tab.permission));
  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && onQueryChange) { event.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [onQueryChange]);
  const renderTab = (tab: NavTab, overflow = false) => tab.to ? <Link key={tab.label} to={tab.to}
    onClick={() => setMoreOpen(false)} aria-current={pathname === tab.to || pathname.startsWith(`${tab.to}/`) ? "page" : undefined}
    className={`group/status-parent flex items-center gap-[6px] whitespace-nowrap rounded-[8px] px-[11px] py-[7px] text-[13.5px] ${overflow ? "text-[#1b1e1c] hover:bg-[#f2f4f1]" : "text-[#eef2ef]/70 hover:bg-white/[0.07] hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:font-semibold aria-[current=page]:text-white"}`}>
    {tab.label}{tab.to === "/inbox" && unreadCount > 0 && <span aria-label={`${unreadCount} unread messages`} className="rounded-full bg-[#e0b64a] px-[6px] text-[11px] font-bold text-[#0d2f24]">{unreadCount}</span>}
    {tab.implementation && <ImplementationStatusIcon {...tab.implementation} withinInteractiveControl />}
  </Link> : null;

  return <header className="yb-app-header flex h-[60px] shrink-0 items-center gap-[20px] bg-[#0d2f24] px-[24px] text-[#eef2ef]">
    <Link to="/" className="flex shrink-0 items-center gap-[10px]" aria-label="YB Travel home">
      <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#e0b64a] text-[12px] font-bold text-[#0d2f24]">YB</span>
      <span className="text-[15px] font-semibold tracking-[0.01em]">YB Travel</span>
      <span className="yb-header-desk h-[18px] w-px bg-white/20" /><span className="yb-header-desk text-[13px] text-[#eef2ef]/60">Brooklyn Desk</span>
    </Link>
    <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-[2px]">
      <div className="yb-header-primary items-center gap-[2px]">{visible.slice(0, 5).map((tab) => renderTab(tab))}</div>
      <div ref={moreRef} className="relative">
        <button type="button" aria-expanded={moreOpen} aria-label="More navigation" onClick={() => setMoreOpen(!moreOpen)} className="rounded-[8px] px-[10px] py-[7px] text-[13px] text-[#eef2ef]/70 hover:bg-white/10">More ▾</button>
        {moreOpen && <div className="absolute left-0 top-[42px] z-40 min-w-[200px] rounded-[11px] border border-[#e6e3da] bg-white p-[6px] shadow-xl">
          <div className="yb-header-overflow-primary">{visible.slice(0, 5).map((tab) => renderTab(tab, true))}</div>
          {visible.slice(5).map((tab) => renderTab(tab, true))}
          {(can("workloads.manage") || can("exceptions.approve")) && <Link to="/agents/workload" onClick={() => setMoreOpen(false)} className="block rounded-lg px-[11px] py-[8px] text-[13px] text-[#1b1e1c] hover:bg-[#f2f4f1]">Agents &amp; Supervisor</Link>}
        </div>}
      </div>
    </nav>
    <div className="flex-1" />
    {onQueryChange && <div className="yb-header-search h-[36px] w-[300px] max-w-[22vw] items-center gap-[8px] rounded-[9px] border border-white/10 bg-white/[0.09] px-[12px]">
      <Search size={14} className="shrink-0 text-[#eef2ef]/60" />
      <input ref={searchRef} value={query ?? ""} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search this page" aria-label="Search this page" className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/45" />
      <span className="rounded border border-white/20 px-1 text-[10px] text-white/45">⌘K</span>
    </div>}
    <div className="flex shrink-0 items-center gap-[16px]">
      <NotificationMenu compact /><SetupMenu compact />
      <ProfileMenu />
    </div>
  </header>;
}
