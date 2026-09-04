import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useAuth } from "../../lib/AuthContext";
import { SetupMenu } from "./SetupMenu";
import { NotificationMenu } from "./NotificationMenu";

type TopUtilityBarProps = {
  query?: string;
  onQueryChange?: (value: string) => void;
  compact?: boolean;
};

export function TopUtilityBar({ query, onQueryChange, compact = false }: TopUtilityBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut(e: MouseEvent) {
    e.preventDefault();
    logout();
    void navigate({ to: "/login" });
  }

  return (
    <div className={`flex items-center ${compact ? "h-[34px] gap-[14px] bg-[#0d3b26] px-[16px]" : "h-[60px] gap-[18px] bg-linear-to-b from-yb-green-light to-yb-green-dark px-[22px]"}`}>
      <div className={`flex items-center ${compact ? "gap-[8px]" : "gap-[10px]"}`}>
        <div className={`flex items-center justify-center rounded-yb-tile bg-yb-gold font-black text-yb-green ${compact ? "h-[18px] w-[18px] text-[10px]" : "h-[26px] w-[26px] text-[12px] tracking-[0.5px]"}`}>
          YB
        </div>
        <div className={`font-black text-white ${compact ? "text-[15px] tracking-[0.3px]" : "text-[19px] tracking-[0.4px]"}`}>YB TRAVEL</div>
      </div>
      <div className={`${compact ? "text-[12px]" : "ml-[6px] text-[13.5px]"} text-yb-desk-text`}>Brooklyn Desk</div>

      <div className="flex-1" />

      <div className={`flex items-center ${compact ? "gap-[8px]" : "gap-2"}`}>
        <input
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder="Search name, request number, or PNR"
          className={`border border-yb-green-darker bg-white text-yb-ink outline-none ${compact ? "h-[22px] w-[290px] rounded-none px-[6px] text-[11px]" : "h-[28px] w-[360px] rounded-yb px-[9px] text-[13.5px]"}`}
        />
        <button
          type="button"
          className={`border border-yb-gold-border bg-yb-gold font-bold text-yb-gold-text hover:bg-yb-gold-hover ${compact ? "h-[22px] px-[12px] text-[11px]" : "h-[30px] rounded-yb px-5 text-[13.5px]"}`}
        >
          Go
        </button>
      </div>

      <div className={`flex items-center ${compact ? "gap-[14px] text-[11px]" : "ml-[22px] gap-5"}`}>
        <NotificationMenu compact={compact} />
        <SetupMenu compact={compact} />
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className={`${compact ? "text-[11px]" : "text-[13px]"} text-yb-nav-text underline hover:text-white`}
        >
          Help
        </a>
        <a
          href="#"
          onClick={handleSignOut}
          className={`${compact ? "text-[11px]" : "text-[13px]"} text-yb-nav-text underline hover:text-white`}
        >
          Sign Out
        </a>
        <div className={`${compact ? "text-[11px]" : "text-[14px]"} font-bold text-white`}>{user?.name ?? ""}</div>
      </div>
    </div>
  );
}
