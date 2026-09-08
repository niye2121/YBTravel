import {
  PERMISSION_CATALOGUE,
  permissionsForRoles,
  type PhaseOneRole,
  type StaffPermission,
} from "@yb-travel/shared";

type PermissionMatrixProps = {
  permissions: StaffPermission[];
  onChange?: (permissions: StaffPermission[]) => void;
};

/**
 * Displays every permission in stable catalogue order. Implemented permissions
 * are editable; future capabilities stay visible but disabled so their status
 * cannot be confused with working Phase 1 access.
 */
export function PermissionMatrix({ permissions, onChange }: PermissionMatrixProps) {
  const categories = [...new Set(PERMISSION_CATALOGUE.map((item) => item.category))];
  const selected = new Set(permissions);

  return (
    <section className="yb-card border border-yb-line bg-white">
      <div className="border-b border-yb-line bg-yb-table-head px-[12px] py-[8px]">
        <div className="text-[11px] font-bold tracking-[1px] text-yb-panel-head-text">INDIVIDUAL PERMISSIONS</div>
        <div className="mt-[2px] text-[11px] text-yb-muted3">Roles set the defaults. Each available checkbox is saved for this employee and enforced by the API.</div>
      </div>
      <div className="grid grid-cols-3">
        {categories.map((category) => (
          <div key={category} className="border-r border-b border-yb-line-soft p-[11px] last:border-r-0">
            <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-yb-muted4">{category}</div>
            {PERMISSION_CATALOGUE.filter((item) => item.category === category).map((item) => (
              <label key={item.code} className={`mb-[7px] flex items-start gap-[7px] ${item.implemented ? "text-yb-ink" : "text-yb-muted3"}`}>
                <input
                  type="checkbox"
                  className="mt-[1px] h-[14px] w-[14px] shrink-0 accent-yb-green focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-yb-green"
                  checked={selected.has(item.code)}
                  disabled={!item.implemented || !onChange}
                  onChange={(event) => onChange?.(
                    event.target.checked
                      ? PERMISSION_CATALOGUE.map((entry) => entry.code).filter((code) => selected.has(code) || code === item.code)
                      : permissions.filter((permission) => permission !== item.code),
                  )}
                />
                <span>
                  <span className="block text-[12px] font-bold leading-[15px]">{item.label}{item.highRisk ? " · Sensitive" : ""}</span>
                  <span className="mt-[1px] block text-[10.5px] leading-[14px]">{item.description}</span>
                  {!item.implemented && <span className="block text-[10px] font-bold uppercase tracking-[0.06em] text-yb-red">Later phase — cannot be enabled</span>}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Resets the matrix to the understandable defaults supplied by selected roles.
 * Administrators can then add or remove individual permissions before saving.
 */
export function roleTemplatePermissions(roles: readonly PhaseOneRole[]): StaffPermission[] {
  return permissionsForRoles(roles);
}
