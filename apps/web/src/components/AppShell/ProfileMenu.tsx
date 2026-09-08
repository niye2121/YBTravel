import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "../../lib/AuthContext";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const name = user?.name ?? "Staff";
  const initials = name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    signOutRef.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative border-l border-white/15 pl-[14px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}>
      <button ref={triggerRef} type="button" aria-label={`Profile menu for ${name}`}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex items-center gap-[9px] rounded-[8px] px-[7px] py-[5px] text-[#eef2ef] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b64a]"
        title={name}>
        <span aria-hidden="true" className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#e0b64a] text-[11px] font-bold text-[#0d2f24]">{initials}</span>
        <span className="yb-header-name max-w-[200px] truncate text-[13px] font-medium">{name}</span>
        <ChevronDown size={13} aria-hidden="true" className="shrink-0 text-[#eef2ef]/60" />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label="Profile" className="absolute right-0 top-[46px] z-50 min-w-[220px] rounded-[11px] border border-yb-line bg-white p-[6px] text-yb-ink shadow-xl"
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              signOutRef.current?.focus();
            }
          }}>
          <div role="presentation" className="mb-[4px] border-b border-yb-line-row px-[11px] py-[9px]">
            <div className="text-[11px] text-yb-muted3">Signed in as</div>
            <div className="mt-[2px] max-w-[260px] truncate text-[13px] font-semibold" title={name}>{name}</div>
          </div>
          <button ref={signOutRef} type="button" role="menuitem"
            onClick={() => { setOpen(false); logout(); }}
            className="flex w-full items-center gap-[9px] rounded-[8px] px-[11px] py-[9px] text-left text-[13px] hover:bg-yb-row-hover focus:bg-yb-row-hover focus-visible:outline-2 focus-visible:outline-yb-green">
            <LogOut size={15} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
