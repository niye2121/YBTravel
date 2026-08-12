import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useAuth } from "../../lib/AuthContext";
import { SetupMenu } from "./SetupMenu";

type TopUtilityBarProps = {
  query?: string;
  onQueryChange?: (value: string) => void;
};

export function TopUtilityBar({ query, onQueryChange }: TopUtilityBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut(e: MouseEvent) {
    e.preventDefault();
    logout();
    void navigate({ to: "/login" });
  }

  return (
    <div className="flex h-[60px] items-center gap-[18px] bg-linear-to-b from-yb-green-light to-yb-green-dark px-[22px]">
      <div className="flex items-center gap-[10px]">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-yb-tile bg-yb-gold text-[12px] font-black tracking-[0.5px] text-yb-green">
          YB
        </div>
        <div className="text-[19px] font-black tracking-[0.4px] text-white">YB TRAVEL</div>
      </div>
      <div className="ml-[6px] text-[13.5px] text-yb-desk-text">Brooklyn Desk</div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder="Search name, request number, or PNR"
          className="h-[28px] w-[360px] rounded-yb border border-yb-green-darker bg-white px-[9px] text-[13.5px] text-yb-ink outline-none"
        />
        <button
          type="button"
          className="h-[30px] rounded-yb border border-yb-gold-border bg-yb-gold px-5 text-[13.5px] font-bold text-yb-gold-text hover:bg-yb-gold-hover"
        >
          Go
        </button>
      </div>

      <div className="ml-[22px] flex items-center gap-5">
        <SetupMenu />
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-[13px] text-yb-nav-text underline hover:text-white"
        >
          Help
        </a>
        <a
          href="#"
          onClick={handleSignOut}
          className="text-[13px] text-yb-nav-text underline hover:text-white"
        >
          Sign Out
        </a>
        <div className="text-[14px] font-bold text-white">{user?.name ?? ""}</div>
      </div>
    </div>
  );
}
