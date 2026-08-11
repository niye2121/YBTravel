import { Link, useRouterState } from "@tanstack/react-router";
import type { NavTab } from "../../lib/navTabs";

export function PrimaryNav({ tabs }: { tabs: NavTab[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-[44px] items-end gap-[2px] bg-yb-green-dark px-[22px]">
      {tabs.map((tab) => {
        if (tab.to) {
          const active = tab.to === pathname;
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={
                active
                  ? "rounded-t-yb-tile bg-white px-[22px] py-[9px] text-[15px] font-bold text-yb-green"
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
            className="cursor-default px-5 pt-[9px] pb-3 text-[15px] font-bold text-yb-nav-text"
          >
            {tab.label}
          </button>
        );
      })}
      <div className="flex-1" />
      <button type="button" className="cursor-default px-1 pb-3 text-[14.5px] text-yb-nav-more">
        More ▾
      </button>
    </div>
  );
}
