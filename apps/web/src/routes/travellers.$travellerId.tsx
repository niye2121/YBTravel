import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type { TravellerRelationship } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { travellersApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/travellers/$travellerId")({ component: TravellerDetailPage });

type TravellerTab = "identity" | "documents" | "accounts" | "preferences";

const RELATIONSHIP_LABELS: Record<TravellerRelationship, string> = {
  self: "Self / account holder",
  spouse_partner: "Spouse or partner",
  child: "Child",
  parent_guardian: "Parent or guardian",
  sibling: "Sibling",
  other_relative: "Other relative",
  employee: "Employee",
  employer: "Employer",
  colleague: "Colleague",
  friend: "Friend",
  guest: "Guest",
  group_member: "Group member",
  other: "Other",
};

const controlClass =
  "h-[30px] w-full border border-[#aab3aa] bg-[#f7f9f6] px-[8px] text-[13px] text-[#2c332d] outline-none";

function ageFromDob(dob: string | null) {
  if (!dob) return null;
  const birth = new Date(`${dob.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function dateLabel(value: string | null) {
  if (!value) return "Not provided";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US");
}

function titleLabel(value: string | null) {
  if (!value) return "Not provided";
  return value === "mr" ? "Mr" : value === "mrs" ? "Mrs" : value === "ms" ? "Ms" : value === "miss" ? "Miss" : value === "master" ? "Master" : value === "dr" ? "Dr" : value;
}

function genderLabel(value: string | null) {
  if (!value) return "Not provided";
  return value === "female" ? "Female" : value === "male" ? "Male" : value === "unspecified" ? "Unspecified (X)" : value;
}

function passportLabel(value: string) {
  if (value === "on_file") return "On file";
  if (value === "expiring_soon") return "Expiring soon";
  return "Missing";
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <label className={wide ? "col-span-2 block" : "block"}>
      <span className="mb-[5px] block text-[11px] font-bold text-[#3c443d]">{label}</span>
      <input readOnly value={value} className={controlClass} />
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[12px] border-b border-[#d7dcd5] pb-[5px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">
      {children}
    </div>
  );
}

function TravellerDetailPage() {
  const { travellerId: travellerIdParam } = Route.useParams();
  const travellerId = Number(travellerIdParam);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TravellerTab>("identity");
  const travellerQuery = useQuery({
    queryKey: ["travellers", travellerId],
    queryFn: () => travellersApi.getById(travellerId),
    enabled: Number.isInteger(travellerId) && travellerId > 0,
    retry: false,
  });
  const traveller = travellerQuery.data;
  const age = ageFromDob(traveller?.dob ?? null);
  const passportReady = Boolean(
    traveller?.passportStatus === "on_file" &&
    traveller.passportNumber &&
    traveller.passportIssuingCountry &&
    traveller.passportExpiresOn,
  );
  const identityReady = Boolean(traveller?.name && traveller.dob);
  const linked = Boolean(traveller?.clients.length);
  const completeness = Math.round(([identityReady, passportReady, linked].filter(Boolean).length / 3) * 100);
  const tabs: Array<{ id: TravellerTab; label: string; flagged: boolean }> = [
    { id: "identity", label: "Identity", flagged: !identityReady },
    { id: "documents", label: "Documents", flagged: !passportReady },
    { id: "accounts", label: "Client Accounts", flagged: !linked },
    { id: "preferences", label: "Preferences", flagged: false },
  ];

  return (
    <div className="yb-reference-scale min-h-screen min-w-[1180px] bg-[#eef0ea] font-[Helvetica,Arial,sans-serif] leading-[1.2] text-[#1c1f1b]">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} compact />

      <main className="px-[16px] pt-[14px] pb-[40px]">
        <div className="mb-[10px] flex items-center gap-[7px] text-[12px]">
          <Link to="/travellers" search={{}} className="text-[#0b5c3b] underline">Travellers</Link>
          <span className="text-[#8a938b]">/</span>
          <span className="text-[#59635b]">{traveller?.name ?? "Traveller details"}</span>
        </div>

        {travellerQuery.isLoading && (
          <div className="border border-[#c3cbc2] bg-white p-[24px] text-[13px] text-[#6c766f]">Loading traveller…</div>
        )}

        {!travellerQuery.isLoading && (!Number.isInteger(travellerId) || travellerQuery.isError || !traveller) && (
          <div className="border border-[#c3cbc2] bg-white p-[24px]">
            <h1 className="mb-[6px] text-[22px] font-bold">Traveller not found</h1>
            <p className="mb-[14px] text-[13px] text-[#6c766f]">This traveller may no longer exist or may be hidden by the current demo-data setting.</p>
            <Link to="/travellers" search={{}} className="text-[13px] font-bold text-[#0b5c3b] underline">Return to Travellers</Link>
          </div>
        )}

        {traveller && (
          <>
            <header className="mb-[12px] flex items-end gap-[12px]">
              <div className="h-[22px] w-[22px] border border-[#b0b8ae] bg-white p-[5px]" aria-hidden="true"><div className="h-full w-full bg-[#d9a01e]" /></div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#6c766f]">Traveller</div>
                <div className="flex items-baseline gap-[8px]">
                  <h1 className="text-[24px] font-bold tracking-[-0.01em]">{traveller.name}</h1>
                  {age !== null && <span className="text-[12px] text-[#6c766f]">Age {age}</span>}
                  {traveller.isDemo && <span className="border border-[#d3b35a] bg-[#fff7d8] px-[6px] py-[2px] text-[9px] font-bold text-[#7b5b00]">DEMO · READ ONLY</span>}
                </div>
              </div>
              <div className="flex-1" />
              <Link to="/travellers" search={{}} className="border border-[#8d968e] bg-white px-[14px] py-[6px] text-[12px]">Back to Travellers</Link>
            </header>

            <section className="border border-[#c3cbc2] border-t-[3px] border-t-[#0d5c39] bg-white">
              <div className="flex items-center gap-[10px] border-b border-[#d7dcd5] px-[16px] py-[10px]">
                <div className="text-[14px] font-bold">Traveller profile</div>
                <div className="text-[11px] text-[#6c766f]">Existing details are shown in read-only form view.</div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 px-[20px] pt-[14px] pb-[18px]">
                  <div className="mb-[16px] flex border-b border-[#d7dcd5]">
                    {tabs.map((tab) => (
                      <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-[6px] border-b-2 px-[14px] py-[7px] text-[12px] ${activeTab === tab.id ? "border-[#0d5c39] font-bold text-[#0d5c39]" : "border-transparent text-[#0b5c3b]"}`}>
                        {tab.label}
                        {tab.flagged && <span className="h-[6px] w-[6px] rounded-full bg-[#d9a01e]" aria-label="Missing information" />}
                      </button>
                    ))}
                  </div>

                  {activeTab === "identity" && (
                    <div>
                      <SectionTitle>Identity</SectionTitle>
                      <div className="grid grid-cols-3 gap-x-[22px] gap-y-[14px]">
                        <Field label="Title" value={titleLabel(traveller.title)} />
                        <Field label="Legal name" value={traveller.name} wide />
                        <Field label="Date of birth" value={dateLabel(traveller.dob)} />
                        <Field label="Age" value={age === null ? "Not available" : String(age)} />
                        <Field label="Gender" value={genderLabel(traveller.gender)} />
                        <Field label="Nationality" value={traveller.nationality ?? "Not provided"} />
                      </div>
                    </div>
                  )}

                  {activeTab === "documents" && (
                    <div>
                      <SectionTitle>Primary passport</SectionTitle>
                      <div className="grid grid-cols-2 gap-x-[22px] gap-y-[14px]">
                        <Field label="Status" value={passportLabel(traveller.passportStatus)} />
                        <Field label="Passport number" value={traveller.passportNumber ?? "Not provided"} />
                        <Field label="Issuing country" value={traveller.passportIssuingCountry ?? "Not provided"} />
                        <Field label="Expiration date" value={dateLabel(traveller.passportExpiresOn)} />
                      </div>
                      {!passportReady && <div className="mt-[14px] border border-[#e1c875] bg-[#fffaf0] px-[12px] py-[9px] text-[11.5px] text-[#765b16]">Passport information is incomplete. This traveller remains visible in the Missing Documents view.</div>}
                    </div>
                  )}

                  {activeTab === "accounts" && (
                    <div>
                      <SectionTitle>Linked client accounts</SectionTitle>
                      <div className="border border-[#ccd3cb]">
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b border-[#dfe4dc] bg-[#f2f5f0] px-[10px] py-[6px] text-[10px] font-bold tracking-[0.1em] text-[#5c665e]"><div>CLIENT</div><div>RELATIONSHIP</div></div>
                        {traveller.clients.map((client) => (
                          <div key={client.clientId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b border-[#edf0ea] px-[10px] py-[9px] text-[12.5px] last:border-b-0">
                            <Link to="/clients/$clientId" params={{ clientId: String(client.clientId) }} className="font-bold text-[#0b5c3b] underline">{client.clientName}</Link>
                            <div>{client.relationship ? RELATIONSHIP_LABELS[client.relationship as TravellerRelationship] ?? client.relationship : "Not specified"}</div>
                          </div>
                        ))}
                        {traveller.clients.length === 0 && <div className="px-[12px] py-[24px] text-center text-[12px] text-[#6c766f]">This traveller is not linked to a client account.</div>}
                      </div>
                    </div>
                  )}

                  {activeTab === "preferences" && (
                    <div>
                      <SectionTitle>Travel preferences</SectionTitle>
                      <div className="border border-dashed border-[#b8c0b6] bg-[#f7f9f6] p-[16px] text-[12px] leading-[1.5] text-[#6c766f]">Travel preferences and loyalty programs are not stored on traveller records yet. This tab is ready for those approved fields when they are implemented.</div>
                    </div>
                  )}
                </div>

                <aside className="border-l border-[#d7dcd5] bg-[#f9faf8] px-[16px] py-[14px]">
                  <div className="mb-[8px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Profile completeness</div>
                  <div className="mb-[6px] h-[6px] bg-[#e4e8e2]"><div className="h-[6px] bg-[#0d5c39]" style={{ width: `${completeness}%` }} /></div>
                  <div className="mb-[10px] text-[11.5px] text-[#59635b]">{completeness}% complete across the stored profile sections.</div>
                  {([["Identity", identityReady], ["Passport", passportReady], ["Client account", linked]] as Array<[string, boolean]>).map(([label, ready]) => (
                    <div key={label} className={`mb-[6px] flex gap-[7px] text-[11.5px] ${ready ? "text-[#0d5c39]" : "text-[#9aa39b]"}`}><span className="font-bold">{ready ? "✓" : "○"}</span><span>{label}</span></div>
                  ))}
                  <div className="my-[14px] border-t border-[#e4e8e2]" />
                  <div className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Record details</div>
                  <div className="mb-[5px] text-[11.5px] text-[#59635b]">Created {new Date(traveller.createdAt).toLocaleDateString("en-US")}</div>
                  <div className="text-[11.5px] text-[#59635b]">{traveller.clients.length} linked client account{traveller.clients.length === 1 ? "" : "s"}</div>
                  {traveller.isDemo && <div className="mt-[14px] border border-[#d3b35a] bg-[#fffaf0] px-[10px] py-[8px] text-[11px] text-[#765b16]">This sample profile is controlled from System Administrator Setup and cannot be changed here.</div>}
                </aside>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
