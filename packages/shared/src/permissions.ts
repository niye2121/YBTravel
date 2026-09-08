import { z } from "zod";
import type { PhaseOneRole, StaffRole } from "./roles";

export const STAFF_PERMISSIONS = [
  "whatsapp.read",
  "whatsapp.send",
  "whatsapp.manage_accounts",
  "whatsapp.create_groups",
  "clients.read",
  "clients.create",
  "clients.update",
  "travellers.read",
  "travellers.create",
  "travellers.link",
  "onboarding.read",
  "onboarding.manage",
  "requests.read",
  "requests.create",
  "requests.update",
  "requests.assign_self",
  "requests.assign_any",
  "fees.read",
  "fees.calculate",
  "templates.read",
  "templates.use",
  "records.read",
  "records.write",
  "notifications.read",
  "users.manage",
  "settings.manage",
  "integrations.manage",
  "audit.read",
  "test_data.delete",
  "workloads.manage",
  "exceptions.approve",
  "ticketing.issue",
  "ticketing.reissue",
  "ticketing.void",
  "ticketing.exchange",
  "finance.invoices",
  "finance.payments",
  "finance.credits",
  "finance.refunds",
  "finance.reconciliation",
] as const;

export const staffPermissionSchema = z.enum(STAFF_PERMISSIONS);
export type StaffPermission = z.infer<typeof staffPermissionSchema>;

export type PermissionCategory = "WhatsApp" | "Clients & Travellers" | "Requests & Intake" | "Records & Alerts" | "Administration" | "Future Operations";

export type PermissionDefinition = {
  code: StaffPermission;
  label: string;
  description: string;
  category: PermissionCategory;
  implemented: boolean;
  highRisk: boolean;
};

export const PERMISSION_CATALOGUE: readonly PermissionDefinition[] = [
  { code: "whatsapp.read", label: "View WhatsApp inbox", description: "View accounts, conversations, messages, audio, and managed groups.", category: "WhatsApp", implemented: true, highRisk: false },
  { code: "whatsapp.send", label: "Send WhatsApp messages", description: "Send text and voice notes, retry failed messages, and work with AI intake drafts.", category: "WhatsApp", implemented: true, highRisk: false },
  { code: "whatsapp.manage_accounts", label: "Manage WhatsApp accounts", description: "Add, reconnect, and disconnect WhatsApp accounts.", category: "WhatsApp", implemented: true, highRisk: true },
  { code: "whatsapp.create_groups", label: "Create WhatsApp groups", description: "Create managed WhatsApp groups for clients, travellers, and staff.", category: "WhatsApp", implemented: true, highRisk: false },
  { code: "clients.read", label: "View clients", description: "Search and open client profiles.", category: "Clients & Travellers", implemented: true, highRisk: false },
  { code: "clients.create", label: "Create clients", description: "Create and link new client profiles.", category: "Clients & Travellers", implemented: true, highRisk: false },
  { code: "clients.update", label: "Update clients", description: "Edit client information and representatives.", category: "Clients & Travellers", implemented: true, highRisk: false },
  { code: "travellers.read", label: "View travellers", description: "Search and open traveller profiles.", category: "Clients & Travellers", implemented: true, highRisk: false },
  { code: "travellers.create", label: "Create travellers", description: "Create traveller profiles.", category: "Clients & Travellers", implemented: true, highRisk: false },
  { code: "travellers.link", label: "Link travellers to clients", description: "Add a traveller to a client account with a relationship.", category: "Clients & Travellers", implemented: true, highRisk: false },
  { code: "onboarding.read", label: "View onboarding", description: "View onboarding progress and missing information.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "onboarding.manage", label: "Manage onboarding", description: "Review information and complete onboarding tasks.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "requests.read", label: "View requests", description: "View requests, information status, and assignment history.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "requests.create", label: "Create requests", description: "Create a request directly or from a WhatsApp intake draft.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "requests.update", label: "Update requests", description: "Edit request details and review missing information.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "requests.assign_self", label: "Claim requests", description: "Claim an unassigned request for yourself.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "requests.assign_any", label: "Assign requests to staff", description: "Assign or reassign requests to another qualified employee.", category: "Requests & Intake", implemented: true, highRisk: true },
  { code: "fees.read", label: "View booking fees", description: "View active fee groups and request fee calculations.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "fees.calculate", label: "Calculate request fees", description: "Save per-passenger categories and calculate request booking fees.", category: "Requests & Intake", implemented: true, highRisk: false },
  { code: "templates.read", label: "View message templates", description: "View approved active message templates.", category: "Records & Alerts", implemented: true, highRisk: false },
  { code: "templates.use", label: "Use message templates", description: "Render approved templates with conversation context.", category: "Records & Alerts", implemented: true, highRisk: false },
  { code: "records.read", label: "View notes, documents, and history", description: "View entity notes, documents, activity, and download authorized files.", category: "Records & Alerts", implemented: true, highRisk: false },
  { code: "records.write", label: "Add notes and documents", description: "Add permanent notes and upload documents to client and request records.", category: "Records & Alerts", implemented: true, highRisk: false },
  { code: "notifications.read", label: "Use notifications", description: "View and acknowledge your own staff notifications.", category: "Records & Alerts", implemented: true, highRisk: false },
  { code: "users.manage", label: "Manage users and permissions", description: "Create employees and change roles, permissions, availability, and capacity.", category: "Administration", implemented: true, highRisk: true },
  { code: "settings.manage", label: "Manage business settings", description: "Manage workflow, assignment, booking-fee, template, and system settings.", category: "Administration", implemented: true, highRisk: true },
  { code: "integrations.manage", label: "Manage integrations", description: "Manage AI and WhatsApp integration configuration.", category: "Administration", implemented: true, highRisk: true },
  { code: "audit.read", label: "View sensitive access and audit history", description: "Review protected access and configuration history.", category: "Administration", implemented: true, highRisk: true },
  { code: "test_data.delete", label: "Delete all test data", description: "Run the administrator-only test-data reset operation.", category: "Administration", implemented: true, highRisk: true },
  { code: "workloads.manage", label: "Manage staff workloads", description: "Review team workload and reassign operational work.", category: "Requests & Intake", implemented: true, highRisk: true },
  { code: "exceptions.approve", label: "Review operational exceptions", description: "Review completed markup changes and operational exceptions after the fact.", category: "Records & Alerts", implemented: true, highRisk: true },
  { code: "ticketing.issue", label: "Issue tickets", description: "Future ticket issuance authority.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "ticketing.reissue", label: "Reissue tickets", description: "Future ticket reissue authority.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "ticketing.void", label: "Void tickets", description: "Future ticket void authority.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "ticketing.exchange", label: "Exchange tickets", description: "Future ticket exchange authority.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "finance.invoices", label: "Manage invoices", description: "Future invoice authority folded into an approved role by permission.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "finance.payments", label: "Record payments", description: "Future payment-recording authority.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "finance.credits", label: "Manage credits", description: "Future credit authority.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "finance.refunds", label: "Manage refunds", description: "Future refund authority.", category: "Future Operations", implemented: false, highRisk: true },
  { code: "finance.reconciliation", label: "Perform reconciliation", description: "Future financial reconciliation authority.", category: "Future Operations", implemented: false, highRisk: true },
] as const;

export const ROLE_DEFAULT_PERMISSIONS: Record<PhaseOneRole, readonly StaffPermission[]> = {
  offshore_intake_employee: ["whatsapp.read", "whatsapp.send", "clients.read", "clients.create", "clients.update", "travellers.read", "travellers.create", "travellers.link", "onboarding.read", "onboarding.manage", "requests.read", "requests.create", "requests.update", "requests.assign_any", "fees.read", "fees.calculate", "templates.read", "templates.use", "records.read", "records.write", "notifications.read"],
  travel_agent: ["whatsapp.read", "whatsapp.send", "whatsapp.create_groups", "clients.read", "clients.create", "clients.update", "travellers.read", "travellers.create", "travellers.link", "onboarding.read", "onboarding.manage", "requests.read", "requests.create", "requests.update", "requests.assign_self", "fees.read", "fees.calculate", "templates.read", "templates.use", "records.read", "records.write", "notifications.read"],
  supervisor_manager: ["whatsapp.read", "whatsapp.send", "whatsapp.create_groups", "clients.read", "clients.create", "clients.update", "travellers.read", "travellers.create", "travellers.link", "onboarding.read", "onboarding.manage", "requests.read", "requests.create", "requests.update", "requests.assign_self", "requests.assign_any", "fees.read", "fees.calculate", "templates.read", "templates.use", "records.read", "records.write", "notifications.read", "workloads.manage", "exceptions.approve"],
  system_administrator: ["users.manage", "settings.manage", "integrations.manage", "audit.read", "test_data.delete", "notifications.read"],
};

/**
 * Builds the union of the approved role templates. Historical roles remain
 * readable but intentionally contribute no new authority.
 */
export function permissionsForRoles(roles: readonly StaffRole[]): StaffPermission[] {
  const result = new Set<StaffPermission>();
  for (const role of roles) {
    if (role in ROLE_DEFAULT_PERMISSIONS) {
      for (const permission of ROLE_DEFAULT_PERMISSIONS[role as PhaseOneRole]) result.add(permission);
    }
  }
  return STAFF_PERMISSIONS.filter((permission) => result.has(permission));
}

/**
 * Applies stored grants and revocations to role defaults and returns permissions
 * in catalogue order so API responses and audit records are deterministic.
 */
export function effectivePermissions(
  roles: readonly StaffRole[],
  overrides: ReadonlyArray<{ permission: StaffPermission; granted: boolean }>,
): StaffPermission[] {
  const result = new Set(permissionsForRoles(roles));
  for (const override of overrides) {
    if (override.granted) result.add(override.permission);
    else result.delete(override.permission);
  }
  return STAFF_PERMISSIONS.filter((permission) => result.has(permission));
}
