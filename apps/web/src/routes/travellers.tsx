import { Link, Outlet, createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { PassportStatus, TravellerRelationship } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { ImplementationStatusIcon } from "../components/ImplementationStatusIcon";
import { clientsApi, travellersApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { useAuth } from "../lib/AuthContext";
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/travellers")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "travellers.read")) throw redirect({ to: "/" });
  },
  component: TravellersPage,
});

type TravellerTab = "identity" | "documents" | "accounts" | "preferences";
type TravellerView = "all" | "missing" | "expiring" | "minors" | "mine";
type LinkDraft = { clientId: string; relationship: TravellerRelationship | "" };

const PASSPORT_STATUS_LABELS: Record<PassportStatus, string> = {
  on_file: "On file",
  missing: "Missing",
  expiring_soon: "Expiring soon",
};

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

const COUNTRIES = ["United States", "Israel", "Ethiopia", "Canada", "United Kingdom"];
const controlClass = "h-[28px] w-full border border-yb-line-btn bg-white px-[7px] text-[13px] text-yb-ink outline-none focus:border-[#1a6b46] focus:ring-1 focus:ring-[#1a6b46]";

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
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US");
}

function expiresWithinSixMonths(value: string | null) {
  if (!value) return false;
  const expiry = new Date(`${value.slice(0, 10)}T00:00:00`);
  const limit = new Date();
  limit.setMonth(limit.getMonth() + 6);
  return expiry <= limit;
}

function Field({ label, required, children, implementation }: { label: string; required?: boolean; children: ReactNode; implementation?: { label: string; description: string } }) {
  return (
    <div
      className="mb-[12px] grid items-start gap-x-[12px]"
      style={{ gridTemplateColumns: "112px minmax(0, 1fr)" }}
    >
      <label className="pt-[6px] text-right text-[12px] text-[#3c443d]">
        <span className="inline-flex items-center justify-end gap-[4px]">{required && <span className="font-bold text-[#a8341f]">*</span>}{label}{implementation && <ImplementationStatusIcon {...implementation} />}</span>
      </label>
      <div>{children}</div>
    </div>
  );
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="yb-traveller-section-title mb-[12px] flex items-center border-b pb-[5px]">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">{children}</div>
      <div className="flex-1" />{action}
    </div>
  );
}

function TravellersPage() {
  const { can } = useAuth();
  const canReadClients = can("clients.read");
  const canCreateTraveller = can("travellers.create");
  const canLinkTraveller = can("travellers.link") && canReadClients;
  const params = useParams({ strict: false }) as { travellerId?: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const travellersQuery = useQuery({ queryKey: ["travellers"], queryFn: travellersApi.list });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: clientsApi.list, enabled: canLinkTraveller });
  const [query, setQuery] = useState("");
  const [view, setView] = useState<TravellerView>("all");
  const [showForm, setShowForm] = useState(canCreateTraveller);
  const [activeTab, setActiveTab] = useState<TravellerTab>("identity");
  const [keepOpenAfterCreate, setKeepOpenAfterCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [suffix, setSuffix] = useState("");
  const [givenName, setGivenName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [countryOfResidence, setCountryOfResidence] = useState("United States");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [passportStatus, setPassportStatus] = useState<PassportStatus>("missing");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportIssuingCountry, setPassportIssuingCountry] = useState("");
  const [passportExpiresOn, setPassportExpiresOn] = useState("");
  const [links, setLinks] = useState<LinkDraft[]>([{ clientId: "", relationship: "" }]);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle(""); setSuffix(""); setGivenName(""); setMiddleName(""); setFamilyName(""); setPreferredName("");
    setDob(""); setGender(""); setNationality(""); setCountryOfResidence("United States");
    setMobile(""); setEmail(""); setEmergencyContact(""); setEmergencyPhone("");
    setPassportStatus("missing"); setPassportNumber(""); setPassportIssuingCountry(""); setPassportExpiresOn("");
    setLinks([{ clientId: "", relationship: "" }]); setActiveTab("identity"); setError(null);
  };

  const createMutation = useMutation({
    mutationFn: travellersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travellers"] });
      const remainOpen = keepOpenAfterCreate;
      resetForm(); setShowForm(remainOpen); setKeepOpenAfterCreate(false);
    },
    onError: (err: unknown) => {
      setKeepOpenAfterCreate(false);
      setError(err instanceof Error ? err.message : "Failed to create traveller");
    },
  });

  const allTravellers = travellersQuery.data ?? [];
  const missingCount = allTravellers.filter((t) => t.passportStatus === "missing").length;
  const expiringCount = allTravellers.filter((t) => t.passportStatus === "expiring_soon" || expiresWithinSixMonths(t.passportExpiresOn)).length;
  const minorCount = allTravellers.filter((t) => { const age = ageFromDob(t.dob); return age !== null && age < 18; }).length;
  const filteredTravellers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTravellers.filter((t) => {
      const age = ageFromDob(t.dob);
      const matchesView = view === "all" || view === "mine" ||
        (view === "missing" && t.passportStatus === "missing") ||
        (view === "expiring" && (t.passportStatus === "expiring_soon" || expiresWithinSixMonths(t.passportExpiresOn))) ||
        (view === "minors" && age !== null && age < 18);
      const searchable = [t.name, t.nationality ?? "", ...t.clients.map((c) => c.clientName)].join(" ").toLowerCase();
      return matchesView && (!q || searchable.includes(q));
    });
  }, [allTravellers, query, view]);

  const legalNameReady = Boolean(givenName.trim() && familyName.trim());
  const canSubmit = legalNameReady && Boolean(dob);
  const linked = links.some((link) => Boolean(link.clientId));
  const passportReady = passportStatus === "on_file" && Boolean(passportNumber && passportIssuingCountry && passportExpiresOn);
  const completeness = Math.round(([legalNameReady, Boolean(dob), passportReady, linked, false].filter(Boolean).length / 5) * 100);
  const ticketName = `${familyName.trim() || "SURNAME"}/${givenName.trim() || "GIVENNAME"}${middleName.trim() ? ` ${middleName.trim()}` : ""}`.toUpperCase();

  function updateLink(index: number, patch: Partial<LinkDraft>) {
    setLinks((current) => current.map((link, i) => i === index ? { ...link, ...patch } : link));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) { setActiveTab("identity"); setError("Given name, family name and date of birth are required"); return; }
    if (links.some((link) => link.clientId && !link.relationship)) { setActiveTab("accounts"); setError("Select the traveller's relationship to every linked client account"); return; }
    setError(null);
    createMutation.mutate({
      name: [givenName.trim(), middleName.trim(), familyName.trim(), suffix].filter(Boolean).join(" "),
      dob,
      title: title ? (title as "mr" | "mrs" | "ms" | "miss" | "master" | "dr") : null,
      gender: gender ? (gender as "female" | "male" | "unspecified") : null,
      nationality: nationality || null,
      passportStatus,
      passportNumber: passportNumber || null,
      passportIssuingCountry: passportIssuingCountry || null,
      passportExpiresOn: passportExpiresOn || null,
      links: canLinkTraveller ? links.filter((link) => link.clientId).map((link) => ({ clientId: Number(link.clientId), relationship: link.relationship || null })) : [],
    });
  }

  const tabs: Array<{ id: TravellerTab; label: string; flagged: boolean; implementation?: { label: string; description: string } }> = [
    { id: "identity", label: "Identity", flagged: !canSubmit },
    { id: "documents", label: "Documents", flagged: !passportReady },
    ...(canLinkTraveller ? [{ id: "accounts" as const, label: "Client Accounts", flagged: !linked }] : []),
    { id: "preferences", label: "Preferences", flagged: false, implementation: { label: "Not implemented", description: "Preference and loyalty-program values are not saved yet." } },
  ];

  if (params.travellerId) return <Outlet />;

  return (
    <div className="min-h-screen min-w-[1180px] bg-yb-canvas font-sans leading-[1.2] text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} compact />
      <nav className="flex h-[31px] items-center gap-[22px] border-b border-[#d3d8d0] bg-white px-[16px] text-[12px]">
        {([[
          "all", "All Travellers", allTravellers.length,
        ], ["missing", "Missing Documents", missingCount], ["expiring", "Expiring < 6 Months", expiringCount], ["minors", "Minors", minorCount], ["mine", "My Travellers", null]] as Array<[TravellerView, string, number | null]>).map(([id, label, count]) => (
          <button key={id} type="button" onClick={() => setView(id)} className={`group/status-parent flex h-[31px] items-center gap-[6px] border-b-2 bg-transparent ${view === id ? "border-[#0d3b26] font-bold text-[#0d3b26]" : "border-transparent text-[#0b5c3b]"}`}>
            {label}{id === "mine" && <ImplementationStatusIcon label="Not implemented" description="The personal traveller assignment filter is not connected yet." withinInteractiveControl />}{count !== null && <span className={id === "missing" ? "font-bold text-[#a8341f]" : "font-normal text-[#7a8580]"}>{count}</span>}
          </button>
        ))}
      </nav>

      <main className="px-[16px] pt-[14px] pb-[40px]">
        <header className="mb-[12px] flex items-end gap-[12px]">
          <div className="h-[22px] w-[22px] border border-[#b0b8ae] bg-white p-[5px]" aria-hidden="true"><div className="h-full w-full bg-[#d9a01e]" /></div>
          <div><div className="text-[10px] uppercase tracking-[0.14em] text-[#6c766f]">Travellers</div><div className="flex items-baseline gap-[8px]"><h1 className="yb-page-title">All Travellers</h1><span className="text-[12px] text-[#6c766f]">{allTravellers.length} total · {missingCount} missing passport info</span></div></div>
          <div className="flex-1" />
          {canCreateTraveller && !showForm && <button type="button" onClick={() => setShowForm(true)} className="border border-[#0a4a2e] bg-yb-green px-[14px] py-[6px] text-[12px] font-bold text-white">+ New Traveller</button>}
          <button type="button" aria-disabled="true" className="group/status-parent flex items-center gap-[6px] border border-[#b0b8ae] bg-white px-[14px] py-[6px] text-[12px]">Import from CSV <ImplementationStatusIcon label="Not implemented" description="CSV traveller import is not available yet." withinInteractiveControl /></button>
          <button type="button" aria-disabled="true" className="group/status-parent flex items-center gap-[6px] border border-[#b0b8ae] bg-white px-[14px] py-[6px] text-[12px]">Export ▾ <ImplementationStatusIcon label="Not implemented" description="Traveller export is not available yet." withinInteractiveControl /></button>
        </header>

        {canCreateTraveller && showForm && <form onSubmit={submit} className="yb-card yb-traveller-card mb-[14px] border border-t-[3px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="yb-traveller-card-header flex items-center gap-[10px] border-b px-[16px] py-[10px]"><div className="text-[14px] font-bold">New traveller</div><div className="text-[11px] text-[#6c766f]">Legal name and date of birth are required — documents and preferences can follow.</div><div className="flex-1" /><button type="button" aria-label="Close new traveller form" onClick={() => setShowForm(false)} className="bg-transparent px-[2px] text-[18px] text-[#6c766f]">×</button></div>
          <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(230px, 310px)" }}>
            <div className="min-w-0 px-[20px] pt-[14px] pb-[18px]">
              <div className="yb-traveller-tabs mb-[14px] flex border-b">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`group/status-parent flex items-center gap-[6px] border-b-2 px-[14px] py-[7px] text-[12px] ${activeTab === tab.id ? "font-bold text-[#0d5c39]" : "border-transparent text-[#0b5c3b]"}`} style={activeTab === tab.id ? { borderBottomColor: "#0d5c39" } : undefined}>{tab.label}{tab.implementation && <ImplementationStatusIcon {...tab.implementation} withinInteractiveControl />}{tab.flagged && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#d9a01e", display: "inline-block", flex: "0 0 auto" }} aria-label="Missing information" />}</button>)}</div>

              {activeTab === "identity" && <div>
                <SectionTitle>Name as shown on passport</SectionTitle>
                <div className="grid grid-cols-3 gap-x-[30px]">
                  <Field label="Title"><select value={title} onChange={(e) => setTitle(e.target.value)} className={controlClass}><option value="">Select…</option><option value="mr">Mr</option><option value="mrs">Mrs</option><option value="ms">Ms</option><option value="miss">Miss</option><option value="master">Master</option><option value="dr">Dr</option></select></Field>
                  <Field label="Suffix"><select value={suffix} onChange={(e) => setSuffix(e.target.value)} className={controlClass}><option value="">None</option><option>Jr</option><option>Sr</option><option>II</option><option>III</option></select></Field>
                  <Field label="Given name" required><input value={givenName} onChange={(e) => setGivenName(e.target.value)} placeholder="Ariel" className={controlClass} /><div className="mt-[3px] text-[11px] text-[#7a8580]">Exactly as printed — no nicknames.</div></Field>
                  <Field label="Middle name"><input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Optional" className={controlClass} /><div className="mt-[3px] text-[11px] text-[#7a8580]">Required by some carriers on US routes.</div></Field>
                  <Field label="Family name" required><input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Rothstein" className={controlClass} /></Field>
                  <Field label="Preferred name" implementation={{ label: "Not implemented", description: "Preferred names are not saved yet." }}><input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="What the desk calls them" className={controlClass} /><div className="mt-[3px] text-[11px] text-[#7a8580]">Used in messages, never on tickets.</div></Field>
                </div>
                <SectionTitle>Identity</SectionTitle>
                <div className="grid grid-cols-3 gap-x-[30px]">
                  <Field label="Date of birth" required><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={controlClass} /><div className="mt-[3px] text-[11px] text-[#7a8580]">Drives infant, child and adult fare rules.</div></Field>
                  <Field label="Gender"><select value={gender} onChange={(e) => setGender(e.target.value)} className={controlClass}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option><option value="unspecified">Unspecified (X)</option></select><div className="mt-[3px] text-[11px] text-[#7a8580]">As it appears on the travel document.</div></Field>
                  <Field label="Nationality"><select value={nationality} onChange={(e) => setNationality(e.target.value)} className={controlClass}><option value="">Select…</option>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select></Field>
                  <Field label="Country of residence" implementation={{ label: "Not implemented", description: "Country of residence is not saved yet." }}><select value={countryOfResidence} onChange={(e) => setCountryOfResidence(e.target.value)} className={controlClass}>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}<option>Other…</option></select></Field>
                </div>
                <SectionTitle>Contact</SectionTitle>
                <div className="grid grid-cols-3 gap-x-[30px]">
                  <Field label="Mobile" implementation={{ label: "Not implemented", description: "Traveller contact details are not saved yet." }}><input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+1 718 555 0123" className={controlClass} /><div className="mt-[3px] text-[11px] text-[#7a8580]">Matches this person to WhatsApp threads.</div></Field>
                  <Field label="Email" implementation={{ label: "Not implemented", description: "Traveller contact details are not saved yet." }}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={controlClass} /><div className="mt-[3px] text-[11px] text-[#7a8580]">Where airline confirmations are sent.</div></Field>
                  <Field label="Emergency contact" implementation={{ label: "Not implemented", description: "Emergency contact details are not saved yet." }}><input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Name" className={controlClass} /></Field>
                  <Field label="Emergency phone" implementation={{ label: "Not implemented", description: "Emergency contact details are not saved yet." }}><input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+1 718 555 0199" className={controlClass} /></Field>
                </div>
              </div>}

              {activeTab === "documents" && <div>
                <SectionTitle action={<button type="button" aria-disabled="true" className="group/status-parent flex items-center gap-[5px] border border-[#b0b8ae] bg-white px-[10px] py-[3px] text-[11px]">Upload scan <ImplementationStatusIcon label="Not implemented" description="Passport scan upload is not available yet." withinInteractiveControl /></button>}>Primary passport</SectionTitle>
                <Field label="Status"><select value={passportStatus} onChange={(e) => setPassportStatus(e.target.value as PassportStatus)} className={`${controlClass} max-w-[340px]`}>{(Object.keys(PASSPORT_STATUS_LABELS) as PassportStatus[]).map((status) => <option key={status} value={status}>{PASSPORT_STATUS_LABELS[status]}</option>)}</select><div className="mt-[3px] text-[11px] text-[#7a8580]">Traveller appears in Missing Documents until a passport is added.</div></Field>
                <div className="grid grid-cols-2 gap-x-[30px]"><Field label="Passport number"><input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="A12345678" className={controlClass} /></Field><Field label="Issuing country"><select value={passportIssuingCountry} onChange={(e) => setPassportIssuingCountry(e.target.value)} className={controlClass}><option value="">Select…</option>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select></Field><Field label="Expiration date"><input type="date" value={passportExpiresOn} onChange={(e) => setPassportExpiresOn(e.target.value)} className={controlClass} /><div className="mt-[3px] text-[11px] text-[#8a6d10]">Many destinations need 6 months&apos; validity.</div></Field></div>
                <SectionTitle action={<ImplementationStatusIcon label="Not implemented" description="Known Traveler and redress numbers are not saved yet." />}>Secure traveller programs</SectionTitle><div className="grid grid-cols-2 gap-x-[30px]"><Field label="Known Traveler No."><input placeholder="TSA PreCheck / Global Entry" className={controlClass} /></Field><Field label="Redress number"><input placeholder="Optional" className={controlClass} /></Field></div>
              </div>}

              {activeTab === "accounts" && <div>
                <SectionTitle action={<button type="button" onClick={() => setLinks((current) => [...current, { clientId: "", relationship: "" }])} className="text-[11px] text-[#0b5c3b] underline">+ Add client account</button>}>Client accounts</SectionTitle>
                <div className="border border-[#ccd3cb]"><div className="grid gap-[8px] border-b border-[#dfe4dc] bg-yb-panel-head px-[10px] py-[5px] text-[10px] font-bold tracking-[0.1em] text-[#5c665e]" style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) 34px" }}><div>CLIENT</div><div>RELATIONSHIP</div><div /></div>{links.map((link, index) => <div key={index} className="grid items-center gap-[8px] border-b border-yb-line-row px-[10px] py-[8px]" style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) 34px" }}><select value={link.clientId} onChange={(e) => updateLink(index, { clientId: e.target.value })} className={controlClass}><option value="">Select client…</option>{(clientsQuery.data ?? []).filter((client) => !client.isDemo).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><select value={link.relationship} onChange={(e) => updateLink(index, { relationship: e.target.value as TravellerRelationship | "" })} className={controlClass}><option value="">Relationship…</option>{(Object.keys(RELATIONSHIP_LABELS) as TravellerRelationship[]).map((relationship) => <option key={relationship} value={relationship}>{RELATIONSHIP_LABELS[relationship]}</option>)}</select><button type="button" aria-label="Remove client account" onClick={() => setLinks((current) => current.length === 1 ? [{ clientId: "", relationship: "" }] : current.filter((_, i) => i !== index))} className="h-[28px] border border-[#b0b8ae] bg-white text-[#6c766f]">×</button></div>)}</div>
                <div className="mt-[6px] text-[11px] text-[#7a8580]">One person can belong to several client accounts.</div>
              </div>}

              {activeTab === "preferences" && <div>
                <SectionTitle>Travel preferences</SectionTitle><div className="grid grid-cols-2 gap-x-[30px]"><Field label="Seat"><select className={controlClass}><option>No preference</option><option>Aisle</option><option>Window</option></select></Field><Field label="Meal"><select className={controlClass}><option>No special meal</option><option>Kosher (KSML)</option><option>Vegetarian (VGML)</option></select></Field><Field label="Special assistance"><select className={controlClass}><option>None</option><option>Wheelchair to gate (WCHR)</option><option>Unaccompanied minor</option></select></Field><Field label="Language"><select className={controlClass}><option>English</option><option>Hebrew</option><option>Yiddish</option></select></Field></div>
                <SectionTitle action={<span className="flex items-center gap-[5px] text-[11px] text-[#7a8580]">+ Add program <ImplementationStatusIcon label="Not implemented" description="Loyalty program entry is not available yet." /></span>}>Loyalty programs</SectionTitle><div className="border border-dashed border-[#b8c0b6] bg-[#f7f9f6] p-[12px] text-[12px] text-[#7a8580]">No frequent flyer numbers on file. Add them so miles credit automatically on every booking.</div>
              </div>}
              {error && <div role="alert" className="mt-[10px] text-[12px] font-bold text-[#a8341f]">{error}</div>}
            </div>

            <aside className="yb-traveller-aside border-l bg-yb-panel-head px-[16px] py-[14px]">
              <div className="mb-[8px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Ticket name preview</div><div className="border border-[#dfe4dc] bg-white p-[10px]"><div className="text-[13px] font-bold uppercase tracking-[0.03em]">{ticketName}</div><div className="mt-[3px] text-[11px] text-[#7a8580]">How the name prints on the e-ticket.</div></div>
              <div className="my-[12px] border-t border-yb-line-row" /><div className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c665e]">Profile completeness</div><div className="mb-[6px] h-[6px] bg-[#e4e8e2]"><div className="h-[6px] bg-yb-green" style={{ width: `${completeness}%` }} /></div><div className="mb-[9px] text-[11.5px] text-[#59635b]">{completeness}% complete — a traveller can be saved at any stage.</div>
              {([['Legal name', legalNameReady], ['Date of birth', Boolean(dob)], ['Passport on file', passportReady], ['Linked to a client', linked], ['Loyalty numbers', false]] as Array<[string, boolean]>).map(([label, ready]) => <div key={label} className={`mb-[5px] flex gap-[7px] text-[11.5px] ${ready ? "text-[#0d5c39]" : "text-[#9aa39b]"}`}><span className="font-bold">{ready ? "✓" : "○"}</span><span>{label}</span></div>)}
              <div className="my-[12px] border-t border-yb-line-row" /><div className="text-[11.5px] leading-[1.6] text-[#7a8580]">Duplicate names with the same date of birth are flagged after saving, never blocked.</div>
            </aside>
          </div>
          <div className="yb-traveller-card-footer flex items-center gap-[10px] border-t bg-yb-panel-head px-[16px] py-[10px]"><div className="text-[11px] text-[#7a8580]">Given name, family name and date of birth are required.</div><div className="flex-1" /><button type="button" onClick={() => setShowForm(false)} className="border border-yb-line-btn bg-white px-[16px] py-[6px] text-[12px]">Cancel</button><button type="submit" onClick={() => setKeepOpenAfterCreate(true)} disabled={!canSubmit || createMutation.isPending} className="border border-yb-line-btn bg-white px-[16px] py-[6px] text-[12px] disabled:text-[#9aa39b]">Create &amp; New</button><button type="submit" onClick={() => setKeepOpenAfterCreate(false)} disabled={!canSubmit || createMutation.isPending} className="border border-[#0a4a2e] bg-yb-green px-[20px] py-[6px] text-[12px] font-bold text-white disabled:border-[#c8cec6] disabled:bg-[#dfe3dd] disabled:text-[#9aa39b]">{createMutation.isPending ? "Creating…" : "Create Traveller"}</button></div>
        </form>}

        <section className="yb-card yb-traveller-table border bg-white">
          <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[12px] py-[6px]"><div className="text-[10px] font-bold tracking-[0.12em] text-[#5c665e]">TRAVELLERS — {view === "all" ? "ALL TRAVELLERS" : view.toUpperCase()}</div><div className="flex-1" /><div className="text-[11px] text-[#6c766f]">{filteredTravellers.length} items</div></div>
          <div className="flex items-center gap-[10px] border-b border-yb-line-row px-[12px] py-[8px] text-[12px]"><span>View:</span><select value={view} onChange={(e) => setView(e.target.value as TravellerView)} className="h-[24px] border border-yb-line-btn text-[12px]"><option value="all">All Travellers</option><option value="missing">Missing Documents</option><option value="expiring">Expiring soon</option><option value="minors">Minors</option></select><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name or passport" className="h-[24px] w-[210px] border border-yb-line-btn px-[6px] text-[12px]" /><span className="flex items-center gap-[5px] text-[#7a8580]">Edit <ImplementationStatusIcon label="Not implemented" description="Custom view editing is not available yet." /></span><span className="flex items-center gap-[5px] text-[#7a8580]">Create New View <ImplementationStatusIcon label="Not implemented" description="Creating custom traveller views is not available yet." /></span></div>
          <div className="overflow-auto"><table className="w-full min-w-[900px] border-collapse text-[12.5px]"><thead><tr className="bg-[#f7f9f6]">{["Traveller", "Date of Birth", "Age", "Passport", "Expires", "Nationality", "Client Accounts", "Last Trip"].map((heading) => <th key={heading} className={`border-b border-[#cfd6ce] px-[12px] py-[7px] text-left text-[11px] font-bold text-[#3c443d] ${heading === "Last Trip" ? "text-right" : ""}`}>{heading}</th>)}</tr></thead><tbody>{filteredTravellers.map((traveller) => { const age = ageFromDob(traveller.dob); const openTraveller = () => navigate({ to: "/travellers/$travellerId", params: { travellerId: String(traveller.id) } }); return <tr key={traveller.id} role="link" tabIndex={0} onClick={openTraveller} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTraveller(); } }} className="cursor-pointer hover:bg-[#f7f9f6] focus:bg-[#f7f9f6] focus:outline-none"><td className="border-b border-yb-line-row px-[12px] py-[9px]"><Link to="/travellers/$travellerId" params={{ travellerId: String(traveller.id) }} onClick={(event) => event.stopPropagation()} className="font-bold text-[#0b5c3b] underline">{traveller.name}</Link>{traveller.isDemo && <span className="ml-[7px] border border-[#d3b35a] bg-[#fff7d8] px-[5px] py-[1px] text-[9px] font-bold text-[#7b5b00]">DEMO</span>}{age !== null && age < 18 && <span className="ml-[7px] border border-yb-line bg-[#eef2ea] px-[6px] py-[1px] text-[10px] font-bold">MINOR</span>}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]">{traveller.dob ? dateLabel(traveller.dob) : "Missing"}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]">{age ?? "—"}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]"><span className={`font-bold ${traveller.passportStatus === "missing" ? "text-[#a8341f]" : traveller.passportStatus === "expiring_soon" ? "text-[#8a6d10]" : "text-[#0d5c39]"}`}>● {PASSPORT_STATUS_LABELS[traveller.passportStatus]}</span></td><td className="border-b border-yb-line-row px-[12px] py-[9px] text-[#6c766f]">{dateLabel(traveller.passportExpiresOn)}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]">{traveller.nationality ?? "—"}</td><td className="border-b border-yb-line-row px-[12px] py-[9px]">{traveller.clients.length ? traveller.clients.map((client, index) => <span key={client.clientId}>{index > 0 && ", "}{canReadClients ? <Link to="/clients/$clientId" params={{ clientId: String(client.clientId) }} onClick={(event) => event.stopPropagation()} className="text-[#0b5c3b] underline">{client.clientName}</Link> : client.clientName}{client.relationship && ` (${RELATIONSHIP_LABELS[client.relationship as TravellerRelationship] ?? client.relationship})`}</span>) : "—"}</td><td className="border-b border-yb-line-row px-[12px] py-[9px] text-right text-[#6c766f]">—</td></tr>; })}</tbody></table>{travellersQuery.isLoading && <div className="p-[24px] text-center text-[12px] text-[#6c766f]">Loading travellers…</div>}{!travellersQuery.isLoading && filteredTravellers.length === 0 && <div className="p-[24px] text-center text-[12px] text-[#6c766f]">No travellers match this view.</div>}</div>
        </section>
      </main>
    </div>
  );
}
