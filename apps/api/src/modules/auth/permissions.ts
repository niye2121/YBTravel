import type { PhaseOneRole, StaffPermission, StaffRole } from "@yb-travel/shared";

export const IMPLEMENTED_PERMISSIONS: readonly StaffPermission[] = [
  "whatsapp.read", "whatsapp.send", "whatsapp.manage_accounts", "whatsapp.create_groups",
  "clients.read", "clients.create", "clients.update", "travellers.read", "travellers.create", "travellers.link",
  "onboarding.read", "onboarding.manage", "requests.read", "requests.create", "requests.update",
  "requests.assign_self", "requests.assign_any", "fees.read", "fees.calculate", "templates.read", "templates.use",
  "records.read", "records.write", "notifications.read", "users.manage", "settings.manage", "integrations.manage",
  "audit.read", "test_data.delete", "workloads.manage", "exceptions.approve",
] as const;

const ROLE_DEFAULTS: Record<PhaseOneRole, readonly StaffPermission[]> = {
  offshore_intake_employee: ["whatsapp.read", "whatsapp.send", "clients.read", "clients.create", "clients.update", "travellers.read", "travellers.create", "travellers.link", "onboarding.read", "onboarding.manage", "requests.read", "requests.create", "requests.update", "requests.assign_any", "fees.read", "fees.calculate", "templates.read", "templates.use", "records.read", "records.write", "notifications.read"],
  travel_agent: ["whatsapp.read", "whatsapp.send", "whatsapp.create_groups", "clients.read", "clients.create", "clients.update", "travellers.read", "travellers.create", "travellers.link", "onboarding.read", "onboarding.manage", "requests.read", "requests.create", "requests.update", "requests.assign_self", "fees.read", "fees.calculate", "templates.read", "templates.use", "records.read", "records.write", "notifications.read"],
  supervisor_manager: ["whatsapp.read", "whatsapp.send", "whatsapp.create_groups", "clients.read", "clients.create", "clients.update", "travellers.read", "travellers.create", "travellers.link", "onboarding.read", "onboarding.manage", "requests.read", "requests.create", "requests.update", "requests.assign_self", "requests.assign_any", "fees.read", "fees.calculate", "templates.read", "templates.use", "records.read", "records.write", "notifications.read", "workloads.manage", "exceptions.approve"],
  system_administrator: ["users.manage", "settings.manage", "integrations.manage", "audit.read", "test_data.delete", "notifications.read"],
};

/**
 * Calculates the backend role template without trusting a browser-supplied
 * permission list. Historical roles remain readable and add no defaults.
 */
export function backendPermissionsForRoles(roles: readonly StaffRole[]): StaffPermission[] {
  const result = new Set<StaffPermission>();
  for (const role of roles) {
    if (role in ROLE_DEFAULTS) {
      for (const permission of ROLE_DEFAULTS[role as PhaseOneRole]) result.add(permission);
    }
  }
  return IMPLEMENTED_PERMISSIONS.filter((permission) => result.has(permission));
}

/**
 * Applies validated database overrides to backend role defaults and emits only
 * currently implemented permission codes in deterministic order.
 */
export function backendEffectivePermissions(
  roles: readonly StaffRole[],
  overrides: ReadonlyArray<{ permission: StaffPermission; granted: boolean }>,
): StaffPermission[] {
  const result = new Set(backendPermissionsForRoles(roles));
  for (const override of overrides) {
    if (override.granted) result.add(override.permission);
    else result.delete(override.permission);
  }
  return IMPLEMENTED_PERMISSIONS.filter((permission) => result.has(permission));
}

/**
 * Narrows untrusted database text to a permission understood by this API.
 */
export function isImplementedPermission(value: string): value is StaffPermission {
  return (IMPLEMENTED_PERMISSIONS as readonly string[]).includes(value);
}
