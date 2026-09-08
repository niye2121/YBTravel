import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext";

/**
 * Admin-only settings dropdown, per Joe's review feedback — Users (and
 * the rest of the Phase 1 business configuration lives here instead of as
 * top-level operational navigation. Only System Administrators see it.
 */
const SETUP_ITEMS = [
  { label: "Setup Overview", to: "/setup" as const, permission: "settings.manage" as const },
  { label: "Users & Roles", to: "/users" as const, permission: "users.manage" as const },
  { label: "Audit History", to: "/audit-history" as const, permission: "audit.read" as const },
  { label: "Booking Fees", to: "/booking-fees" as const, permission: "settings.manage" as const },
  { label: "Onboarding & Required Info", to: "/onboarding-settings" as const, permission: "settings.manage" as const },
  { label: "Request Workflow", to: "/request-workflow-settings" as const, permission: "settings.manage" as const },
  { label: "WhatsApp Accounts", to: "/whatsapp-accounts" as const, permission: "whatsapp.manage_accounts" as const },
  { label: "AI Provider", to: "/ai-provider-settings" as const, permission: "integrations.manage" as const },
];

export function SetupMenu({ compact = false }: { compact?: boolean }) {
  const { can } = useAuth();
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

  const visibleItems = SETUP_ITEMS.filter((item) => can(item.permission));
  if (visibleItems.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`text-[13px] ${compact ? "text-[#eef2ef]/70" : "text-yb-nav-text"} hover:text-white`}
      >
        Setup
      </button>
      {open && (
        <div className="absolute right-0 top-[24px] z-10 min-w-[160px] rounded-yb border border-yb-line bg-white py-[6px] shadow-md">
          {visibleItems.map((item) => (
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
