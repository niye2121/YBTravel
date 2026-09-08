import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { NavTab } from "../../lib/navTabs";
import { useAuth } from "../../lib/AuthContext";
import { ImplementationStatusIcon } from "../ImplementationStatusIcon";

export function PrimaryNav({ tabs, compact = false }: { tabs: NavTab[]; compact?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { can } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    /** Closes the More panel when the user clicks outside its container. */
    function closeOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [moreOpen]);

  return (
    <div className={`flex items-end gap-[2px] ${compact ? "h-[30px] bg-[#0d3b26] px-[16px]" : "h-[44px] bg-yb-green-dark px-[22px]"}`}>
      {tabs.filter((tab) => !tab.permission || can(tab.permission)).map((tab) => {
        if (tab.to) {
          const active = tab.to === pathname;
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={`group/status-parent ${
                active
                  ? compact
                    ? "rounded-t-yb-tile bg-white px-[16px] py-[7px] text-[12px] font-bold text-yb-green"
                    : "rounded-t-yb-tile bg-white px-[22px] py-[9px] text-[15px] font-bold text-yb-green"
                  : compact
                    ? "px-[14px] py-[6px] text-[12px] text-yb-nav-text"
                    : "px-5 pt-[9px] pb-3 text-[15px] font-bold text-yb-nav-text"
              }`}
            >
              <span className="flex items-center gap-[6px]">
                {tab.label}
                {tab.implementation && <ImplementationStatusIcon {...tab.implementation} withinInteractiveControl />}
              </span>
            </Link>
          );
        }
        return (
          <button
            key={tab.label}
            type="button"
            className={compact ? "group/status-parent cursor-default px-[14px] py-[6px] text-[12px] text-yb-nav-text" : "group/status-parent cursor-default px-5 pt-[9px] pb-3 text-[15px] font-bold text-yb-nav-text"}
          >
            <span className="flex items-center gap-[6px]">
              {tab.label}
              {tab.implementation && <ImplementationStatusIcon {...tab.implementation} withinInteractiveControl />}
            </span>
          </button>
        );
      })}
      <div className="flex-1" />
      <div ref={moreRef} className="relative">
        <button type="button" onClick={() => setMoreOpen((open) => !open)} className={compact ? "flex items-center gap-[5px] px-1 py-[6px] text-[12px] text-yb-nav-more" : "flex items-center gap-[5px] px-1 pb-3 text-[14.5px] text-yb-nav-more"}>
          More ▾
        </button>
        {moreOpen && (
          <div className="absolute right-0 top-full z-20 min-w-[170px] border border-yb-line-btn bg-white py-[4px]">
            {(can("workloads.manage") || can("exceptions.approve")) && (
              <Link to="/agents/workload" onClick={() => setMoreOpen(false)} className="block px-[14px] py-[8px] text-[13px] text-yb-ink underline hover:bg-yb-row-hover">Agents &amp; Supervisor</Link>
            )}
            <div className="px-[14px] py-[8px] text-[12px] text-yb-muted4">Suppliers and commissions come in later phases.</div>
          </div>
        )}
      </div>
    </div>
  );
}
