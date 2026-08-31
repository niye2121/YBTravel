import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext";

/**
 * Admin-only settings dropdown, per Joe's review feedback — Users (and
 * the rest of the Phase 1 business configuration lives here instead of as
 * top-level operational navigation. Only System Administrators see it.
 */
const SETUP_ITEMS = [
  { label: "Setup Overview", to: "/setup" as const },
  { label: "Users & Roles", to: "/users" as const },
  { label: "Booking Fees", to: "/booking-fees" as const },
  { label: "Onboarding & Required Info", to: "/onboarding-settings" as const },
  { label: "Request Workflow", to: "/request-workflow-settings" as const },
  { label: "AI Provider", to: "/ai-provider-settings" as const },
];

export function SetupMenu({ compact = false }: { compact?: boolean }) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!isAdmin) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${compact ? "text-[11px]" : "text-[13px]"} text-yb-nav-text underline hover:text-white`}
      >
        Setup
      </button>
      {open && (
        <div className="absolute right-0 top-[24px] z-10 min-w-[160px] rounded-yb border border-yb-line bg-white py-[6px] shadow-md">
          {SETUP_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block px-[14px] py-[8px] text-[13.5px] text-yb-ink hover:bg-yb-row-hover"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
