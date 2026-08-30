import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  bookingFeesApi,
  type BookingFeeGroup,
  type BookingFeeGroupInput,
  type CalculationBasis,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/booking-fees")({
  beforeLoad: () => {
    if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" });
  },
  component: BookingFeesPage,
});

const inputClass =
  "mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink";

const EMPTY_FORM: BookingFeeGroupInput = {
  name: "",
  code: "",
  amount: "",
  currency: "USD",
  calculationBasis: "per_passenger",
  chargeAdults: true,
  chargeChildren: true,
  chargeInfants: false,
  active: true,
};

function formatMoney(amount: string | number, currency: string): string {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(2)}`;
  }
}

function chargedCategories(group: BookingFeeGroup): string {
  if (group.calculationBasis === "per_booking") return "One fee per booking";
  const categories = [
    group.chargeAdults && "Adults",
    group.chargeChildren && "Children",
    group.chargeInfants && "Infants",
  ].filter(Boolean);
  return categories.length > 0 ? categories.join(", ") : "No passenger categories";
}

function BookingFeesPage() {
  const queryClient = useQueryClient();
  const feeGroupsQuery = useQuery({
    queryKey: ["booking-fees", "admin"],
    queryFn: bookingFeesApi.listAll,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BookingFeeGroupInput>(EMPTY_FORM);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);
  const [infants, setInfants] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (input: BookingFeeGroupInput) =>
      editingId === null ? bookingFeesApi.create(input) : bookingFeesApi.update(editingId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking-fees"] });
      resetForm();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to save booking fee group");
    },
  });

  const preview = useMemo(() => {
    const amount = Number(form.amount || 0);
    if (!Number.isFinite(amount)) return { count: 0, total: 0 };
    if (form.calculationBasis === "per_booking") {
      return { count: adults + children + infants > 0 ? 1 : 0, total: adults + children + infants > 0 ? amount : 0 };
    }
    const count =
      (form.chargeAdults ? adults : 0) +
      (form.chargeChildren ? children : 0) +
      (form.chargeInfants ? infants : 0);
    return { count, total: amount * count };
  }, [adults, children, infants, form]);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(group: BookingFeeGroup) {
    setEditingId(group.id);
    setForm({
      name: group.name,
      code: group.code,
      amount: group.amount,
      currency: group.currency,
      calculationBasis: group.calculationBasis,
      chargeAdults: group.chargeAdults,
      chargeChildren: group.chargeChildren,
      chargeInfants: group.chargeInfants,
      active: group.active,
    });
    setShowForm(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setField<K extends keyof BookingFeeGroupInput>(key: K, value: BookingFeeGroupInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    saveMutation.mutate(form);
  }

  const feeGroups = feeGroupsQuery.data ?? [];

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">SETUP</div>
          <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">Booking Fees</h1>
          <p className="mt-[3px] text-[13px] text-yb-muted3">
            Configure fee groups and how each fee is calculated. Changes apply to future calculations.
          </p>
        </div>
        <div className="flex-1" />
        <PrimaryButton onClick={showForm ? resetForm : openNewForm}>
          {showForm ? "Cancel" : "+ New Fee Group"}
        </PrimaryButton>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mx-[22px] mb-[18px] border border-yb-line bg-yb-panel-head p-[16px]">
          <div className="mb-[12px] text-[15px] font-black">
            {editingId === null ? "New booking fee group" : "Edit booking fee group"}
          </div>
          <div className="grid grid-cols-5 gap-[14px]">
            <label className="text-[13px] text-yb-muted">
              Group name
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Standard"
                className={inputClass}
              />
            </label>
            <label className="text-[13px] text-yb-muted">
              Code
              <input
                required
                maxLength={40}
                pattern="[a-z0-9]+(?:_[a-z0-9]+)*"
                value={form.code}
                onChange={(event) => setField("code", event.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="standard"
                className={inputClass}
              />
            </label>
            <label className="text-[13px] text-yb-muted">
              Fee amount
              <input
                required
                type="number"
                min="0"
                max="9999999999.99"
                step="0.01"
                value={form.amount}
                onChange={(event) => setField("amount", event.target.value)}
                placeholder="50.00"
                className={inputClass}
              />
            </label>
            <label className="text-[13px] text-yb-muted">
              Currency
              <input
                required
                maxLength={3}
                minLength={3}
                value={form.currency}
                onChange={(event) => setField("currency", event.target.value.toUpperCase())}
                placeholder="USD"
                className={inputClass}
              />
            </label>
            <label className="text-[13px] text-yb-muted">
              Calculation
              <select
                value={form.calculationBasis}
                onChange={(event) => setField("calculationBasis", event.target.value as CalculationBasis)}
                className={inputClass}
              >
                <option value="per_passenger">Per passenger</option>
                <option value="per_booking">Flat fee per booking</option>
              </select>
            </label>
          </div>

          <div className="mt-[14px] grid grid-cols-[1fr_430px] gap-[18px]">
            <div>
              <div className="mb-[6px] text-[13px] text-yb-muted">Passenger calculation rule</div>
              <div className="flex flex-wrap gap-[10px]">
                {([
                  ["chargeAdults", "Charge adults"],
                  ["chargeChildren", "Charge children"],
                  ["chargeInfants", "Charge infants"],
                ] as const).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-[6px] border border-yb-line-btn bg-white px-[10px] py-[6px] text-[13px] ${
                      form.calculationBasis === "per_booking" ? "text-yb-muted4" : "text-yb-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={form.calculationBasis === "per_booking"}
                      checked={form[key]}
                      onChange={(event) => setField(key, event.target.checked)}
                    />
                    {label}
                  </label>
                ))}
                <label className="flex items-center gap-[6px] border border-yb-line-btn bg-white px-[10px] py-[6px] text-[13px] text-yb-ink">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => setField("active", event.target.checked)}
                  />
                  Active and available for new clients
                </label>
              </div>
              {form.calculationBasis === "per_booking" && (
                <p className="mt-[7px] text-[12.5px] text-yb-muted3">
                  Passenger categories do not affect a flat booking fee; the amount is charged once.
                </p>
              )}
            </div>

            <div className="border border-yb-line bg-white p-[12px]">
              <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">TEST CALCULATION</div>
              <div className="mt-[9px] grid grid-cols-3 gap-[8px]">
                {([
                  ["Adults", adults, setAdults],
                  ["Children", children, setChildren],
                  ["Infants", infants, setInfants],
                ] as const).map(([label, value, setter]) => (
                  <label key={label} className="text-[12px] text-yb-muted">
                    {label}
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={value}
                      onChange={(event) => setter(Math.max(0, Number(event.target.value) || 0))}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-[10px] flex items-baseline justify-between border-t border-yb-line-soft pt-[9px]">
                <span className="text-[13px] text-yb-muted">
                  {form.calculationBasis === "per_booking"
                    ? `${preview.count} booking fee${preview.count === 1 ? "" : "s"}`
                    : `${preview.count} charged passenger${preview.count === 1 ? "" : "s"}`}
                </span>
                <span className="text-[20px] font-black text-yb-green">
                  {formatMoney(preview.total, form.currency || "USD")}
                </span>
              </div>
            </div>
          </div>

          {error && <div className="mt-[10px] text-[13px] text-yb-red">{error}</div>}

          <div className="mt-[14px] flex gap-[10px]">
            <PrimaryButton type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editingId === null ? "Create Fee Group" : "Save Changes"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={resetForm}>Cancel</SecondaryButton>
          </div>
        </form>
      )}

      <div className="mx-[22px] mb-[26px] border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">BOOKING FEE GROUPS</div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{feeGroups.length} items</div>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[210px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">Group</th>
              <th className="w-[125px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Amount</th>
              <th className="w-[165px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Calculation</th>
              <th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Passenger rule</th>
              <th className="w-[105px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Status</th>
              <th className="w-[90px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold text-yb-muted">Action</th>
            </tr>
          </thead>
          <tbody>
            {feeGroups.map((group) => (
              <tr key={group.id} className="bg-white hover:bg-yb-row-hover">
                <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px]">
                  <div className="font-bold">{group.name}</div>
                  <div className="mt-[2px] font-mono text-[11.5px] text-yb-muted3">{group.code}</div>
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] font-bold">{formatMoney(group.amount, group.currency)}</td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  {group.calculationBasis === "per_passenger" ? "Per passenger" : "Per booking"}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{chargedCategories(group)}</td>
                <td className="border-b border-yb-line-row px-2 py-[11px]">
                  <span className={group.active ? "font-bold text-yb-green" : "text-yb-muted3"}>
                    {group.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right">
                  <button type="button" onClick={() => openEditForm(group)} className="text-[13px] text-yb-green underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {feeGroupsQuery.isLoading && <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">Loading booking fee groups…</div>}
        {feeGroupsQuery.isError && <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-red">Couldn&rsquo;t load booking fee groups.</div>}
        {!feeGroupsQuery.isLoading && !feeGroupsQuery.isError && feeGroups.length === 0 && (
          <div className="px-[14px] py-[28px] text-center">
            <div className="text-[14px] font-bold">No booking fee groups configured yet.</div>
            <div className="mt-[4px] text-[13px] text-yb-muted3">Create the first group before adding a new client.</div>
          </div>
        )}
      </div>
    </div>
  );
}
