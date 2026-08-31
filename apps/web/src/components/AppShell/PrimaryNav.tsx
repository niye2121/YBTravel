import { Link, useRouterState } from "@tanstack/react-router";
import type { NavTab } from "../../lib/navTabs";

export function PrimaryNav({ tabs, compact = false }: { tabs: NavTab[]; compact?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={`flex items-end gap-[2px] ${compact ? "h-[30px] bg-[#0d3b26] px-[16px]" : "h-[44px] bg-yb-green-dark px-[22px]"}`}>
      {tabs.map((tab) => {
        if (tab.to) {
          const active = tab.to === pathname;
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={
                active
                  ? compact
                    ? "rounded-t-yb-tile bg-white px-[16px] py-[7px] text-[12px] font-bold text-yb-green"
                    : "rounded-t-yb-tile bg-white px-[22px] py-[9px] text-[15px] font-bold text-yb-green"
                  : compact
                    ? "px-[14px] py-[6px] text-[12px] text-yb-nav-text"
                    : "px-5 pt-[9px] pb-3 text-[15px] font-bold text-yb-nav-text"
              }
            >
              {tab.label}
            </Link>
          );
        }
        return (
          <button
            key={tab.label}
            type="button"
            className={compact ? "cursor-default px-[14px] py-[6px] text-[12px] text-yb-nav-text" : "cursor-default px-5 pt-[9px] pb-3 text-[15px] font-bold text-yb-nav-text"}
          >
            {tab.label}
          </button>
        );
      })}
      <div className="flex-1" />
      <button type="button" className={compact ? "cursor-default px-1 py-[6px] text-[12px] text-yb-nav-more" : "cursor-default px-1 pb-3 text-[14.5px] text-yb-nav-more"}>
        More ▾
      </button>
    </div>
  );
}
