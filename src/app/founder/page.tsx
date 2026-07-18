"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "@/components/ui/external-link";
import { STARTUP_STAGES, stageHelp, isLinkedinUrl } from "@/lib/startup";
import { FOUNDER_DOCS, ID_TYPES } from "@/lib/kyc";

type FounderProfile = {
  fullName: string; phone: string; linkedin: string; residentialAddress: string | null;
  idType: string | null; idNumber: string | null;
  verificationStatus: string; rejectionReason: string | null;
};
type Startup = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  stage: string | null;
  status: string;
  rejectionReason: string | null;
};
type Doc = { id: string; kind: string; filename: string; uploadedAt: string };
type Update = { id: string; title: string; body: string; status: string; rejectionReason: string | null; createdAt: string };

// Founder-facing labels for an update's moderation status.
const UPDATE_STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  pending: { tone: "pitch", label: "Pending review" },
  approved: { tone: "venture", label: "Published" },
  rejected: { tone: "ignition", label: "Needs changes" },
};
type TeamMember = { id: string; name: string; role: string; linkedin: string | null; phone: string | null; email: string | null };

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  submitted: { tone: "pitch", label: "Submitted" },
  under_review: { tone: "pitch", label: "Under review" },
  approved: { tone: "venture", label: "Approved" },
  queried: { tone: "ignition", label: "Changes requested" },
  rejected: { tone: "ignition", label: "Action needed" },
};
const KIND_LABEL: Record<string, string> = { pitch: "Pitch deck", dd: "Due diligence", kyc: "Founder ID/KYC", other: "Other" };

const inputCls = "w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30";

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function FounderPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [startup, setStartup] = useState<Startup | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Team member form (add / edit)
  const [mId, setMId] = useState<string | null>(null);
  const [mName, setMName] = useState("");
  const [mRole, setMRole] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mLinkedin, setMLinkedin] = useState("");
  const [mErr, setMErr] = useState<Record<string, string>>({});

  // Founder profile (B-065) — completed before the startup profile.
  const [fpExists, setFpExists] = useState(false);
  const [fpName, setFpName] = useState("");
  const [fpPhone, setFpPhone] = useState("");
  const [fpLinkedin, setFpLinkedin] = useState("");
  const [fpAddress, setFpAddress] = useState("");
  const [fpErr, setFpErr] = useState<Record<string, string>>({});
  const [fpSaved, setFpSaved] = useState(false);

  // Identity verification (B-074) — photograph + government ID, reviewed by
  // the team like investor KYC.
  const [vStatus, setVStatus] = useState("incomplete");
  const [vReason, setVReason] = useState<string | null>(null);
  const [vIdType, setVIdType] = useState("");
  const [vIdNumber, setVIdNumber] = useState("");
  const [vErr, setVErr] = useState<Record<string, string>>({});
  const [vBusy, setVBusy] = useState(false);
  const vFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Startup profile form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [stage, setStage] = useState("");
  const [pErr, setPErr] = useState<Record<string, string>>({});
  const [docKind, setDocKind] = useState("pitch");
  // Update form
  const [updTitle, setUpdTitle] = useState("");
  const [updBody, setUpdBody] = useState("");

  async function load() {
    const headers = await authHeaders();
    const [res, fpRes] = await Promise.all([
      fetch("/api/founder/startup", { headers }),
      fetch("/api/founder/profile", { headers }),
    ]);
    const data = await res.json().catch(() => ({}));
    const s: Startup | null = data.startup ?? null;
    setStartup(s);
    setDocs(data.documents ?? []);
    setUpdates(data.updates ?? []);
    setTeam(data.team ?? []);
    if (s) {
      setName(s.name);
      setDescription(s.description ?? "");
      setWebsite(s.website ?? "");
      setStage(s.stage ?? "");
    }
    const fp: FounderProfile | null = (await fpRes.json().catch(() => ({}))).profile ?? null;
    setFpExists(!!fp);
    if (fp) {
      setFpName(fp.fullName);
      setFpPhone(fp.phone);
      setFpLinkedin(fp.linkedin);
      setFpAddress(fp.residentialAddress ?? "");
      setVStatus(fp.verificationStatus ?? "incomplete");
      setVReason(fp.rejectionReason ?? null);
      setVIdType(fp.idType ?? "");
      setVIdNumber(fp.idNumber ?? "");
    }
    setLoaded(true);
  }

  // Submit identity verification: upload the two documents, then submit the
  // set + ID details for review (B-074). Inline field errors throughout.
  async function submitVerification(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!vIdType) errs.idType = "Choose your ID type.";
    if (!vIdNumber.trim()) errs.idNumber = "Your ID number is required.";
    for (const d of FOUNDER_DOCS) {
      if (!vFileRefs.current[d.kind]?.files?.[0]) errs[d.kind] = `${d.label} is required.`;
    }
    setVErr(errs);
    if (Object.keys(errs).length) return;

    setVBusy(true);
    setError(null);
    try {
      for (const d of FOUNDER_DOCS) {
        const file = vFileRefs.current[d.kind]?.files?.[0];
        if (!file) continue;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", d.kind);
        const up = await fetch("/api/kyc/document", { method: "POST", headers: await authHeaders(), body: fd });
        if (!up.ok) {
          const err = await up.json().catch(() => ({}));
          setVErr({ [d.kind]: err.error ?? "Upload failed." });
          return;
        }
      }
      const res = await fetch("/api/founder/verification", {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ idType: vIdType, idNumber: vIdNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setVErr(data.fields);
        else setError(data.error ?? "Couldn't submit your verification.");
        return;
      }
      setVStatus("submitted");
      setVReason(null);
    } finally {
      setVBusy(false);
    }
  }

  // Save the founder profile (B-065/B-066) — inline field errors, LinkedIn
  // must be a valid linkedin.com URL.
  async function saveFounderProfile(e: React.FormEvent) {
    e.preventDefault();
    setFpSaved(false);
    const errs: Record<string, string> = {};
    if (!fpName.trim()) errs.fullName = "Your full name is required.";
    if (!fpPhone.trim()) errs.phone = "Your phone number is required.";
    if (!fpLinkedin.trim()) errs.linkedin = "Your LinkedIn profile is required.";
    else if (!isLinkedinUrl(fpLinkedin)) errs.linkedin = "Enter a valid LinkedIn URL (e.g. https://linkedin.com/in/your-name).";
    if (!fpAddress.trim()) errs.residentialAddress = "Your residential address is required.";
    setFpErr(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError(null);
    const res = await fetch("/api/founder/profile", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ fullName: fpName, phone: fpPhone, linkedin: fpLinkedin, residentialAddress: fpAddress }),
    });
    setBusy(false);
    if (res.ok) {
      setFpExists(true);
      setFpSaved(true);
    } else {
      const d = await res.json().catch(() => ({}));
      if (d.fields) setFpErr(d.fields);
      else setError(d.error ?? "Couldn't save your founder profile.");
    }
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    // Inline validation first — same pattern as the team form (B-048).
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Startup name is required.";
    setPErr(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError(null);
    const method = startup ? "PATCH" : "POST";
    const res = await fetch("/api/founder/startup", {
      method,
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, description, website, stage }),
    });
    setBusy(false);
    if (res.ok) await load();
    else {
      const d = await res.json().catch(() => ({}));
      if (d.fields) setPErr(d.fields); // server backstop → same inline errors
      setError(d.error ?? "Couldn't save.");
    }
  }

  async function uploadDoc(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("kind", docKind);
    const res = await fetch("/api/founder/startup/documents", { method: "POST", headers: await authHeaders(), body });
    setBusy(false);
    if (res.ok) { if (fileRef.current) fileRef.current.value = ""; await load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Upload failed.");
  }

  async function viewDoc(id: string) {
    const res = await fetch(`/api/founder/startup/document?id=${id}`, { headers: await authHeaders() });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/founder/startup/submit", { method: "POST", headers: await authHeaders() });
    setBusy(false);
    if (res.ok) await load();
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't submit.");
  }

  async function postUpdate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/founder/startup/updates", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ title: updTitle, body: updBody }),
    });
    setBusy(false);
    if (res.ok) { setUpdTitle(""); setUpdBody(""); await load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't post.");
  }

  function resetMember() {
    setMId(null); setMName(""); setMRole(""); setMEmail(""); setMPhone(""); setMLinkedin("");
    setMErr({});
  }

  function editMember(m: TeamMember) {
    setMId(m.id); setMName(m.name); setMRole(m.role);
    setMEmail(m.email ?? ""); setMPhone(m.phone ?? ""); setMLinkedin(m.linkedin ?? "");
    setMErr({});
  }

  // Clear a field's error as the founder starts fixing it.
  function clearMErr(key: string) {
    setMErr((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault();

    // Validate required fields up front, naming each missing one.
    const errs: Record<string, string> = {};
    if (!mName.trim()) errs.name = "Name is required.";
    if (!mRole.trim()) errs.role = "Role is required.";
    if (!mEmail.trim()) errs.email = "Email is required.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mEmail.trim())) errs.email = "Enter a valid email address.";
    if (!mPhone.trim()) errs.phone = "Phone number is required.";
    if (Object.keys(errs).length > 0) {
      setMErr(errs);
      setError("Please fill in the highlighted field(s).");
      return;
    }
    setMErr({});

    setBusy(true);
    setError(null);
    const res = await fetch(
      mId ? `/api/founder/startup/team/${mId}` : "/api/founder/startup/team",
      {
        method: mId ? "PATCH" : "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: mName, role: mRole, email: mEmail, phone: mPhone, linkedin: mLinkedin }),
      },
    );
    setBusy(false);
    if (res.ok) { resetMember(); await load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't save team member.");
  }

  async function deleteMember(memberId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/founder/startup/team/${memberId}`, { method: "DELETE", headers: await authHeaders() });
    setBusy(false);
    if (res.ok) { if (mId === memberId) resetMember(); await load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't remove.");
  }

  if (isPending || !session || !loaded) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  const editable = !startup || ["draft", "rejected", "queried"].includes(startup.status);
  const s = startup ? STATUS[startup.status] ?? STATUS.draft : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{startup ? startup.name : "List your startup"}</h1>
        {s && <Badge tone={s.tone}>{s.label}</Badge>}
      </div>
      {!startup && <p className="mt-1 text-sm text-cosmic/70">Tell StarSector8 about your startup to be considered for investment.</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {(startup?.status === "queried" || startup?.status === "rejected") && startup.rejectionReason && (
        <Card className="mt-4 border-danger/30 bg-ignition/10">
          <p className="text-sm font-medium text-cosmic">{startup.status === "queried" ? "Reviewer questions" : "Reviewer feedback"}</p>
          <p className="mt-1 text-sm text-cosmic/80">{startup.rejectionReason}</p>
          <p className="mt-2 text-sm text-cosmic/70">Update your details or documents below, then resubmit.</p>
        </Card>
      )}

      {/* Founder profile (B-065) — the person first, then the venture. */}
      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-semibold text-cosmic">Founder profile</p>
          {fpExists && <Badge tone="venture">complete</Badge>}
        </div>
        <p className="mt-1 text-sm text-cosmic/70">
          The person operating the startup — shown to the StarSector8 review team{fpExists ? "." : " before you create your startup profile."}
        </p>
        <form onSubmit={saveFounderProfile} className="mt-3 space-y-3">
          <Field label="Full name" value={fpName} error={fpErr.fullName}
            onChange={(e) => { setFpName(e.target.value); setFpErr((p) => ({ ...p, fullName: "" })); }} />
          <Field label="Phone" value={fpPhone} error={fpErr.phone} type="tel"
            onChange={(e) => { setFpPhone(e.target.value); setFpErr((p) => ({ ...p, phone: "" })); }} />
          <Field label="LinkedIn profile" value={fpLinkedin} error={fpErr.linkedin}
            placeholder="https://linkedin.com/in/your-name"
            onChange={(e) => { setFpLinkedin(e.target.value); setFpErr((p) => ({ ...p, linkedin: "" })); }} />
          <Field label="Residential address" value={fpAddress} error={fpErr.residentialAddress}
            onChange={(e) => { setFpAddress(e.target.value); setFpErr((p) => ({ ...p, residentialAddress: "" })); }} />
          {fpSaved && <p className="text-sm text-deep-frontier">Founder profile saved.</p>}
          <Button type="submit" disabled={busy}>{fpExists ? "Save founder profile" : "Save & continue"}</Button>
        </form>

        {/* Identity verification (B-074) — required before submitting a startup. */}
        {fpExists && (
          <div className="mt-5 border-t border-cosmic/10 pt-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-cosmic">Identity verification</p>
              <Badge tone={vStatus === "verified" ? "venture" : vStatus === "submitted" ? "pitch" : vStatus === "rejected" ? "ignition" : "neutral"}>
                {vStatus === "incomplete" ? "required" : vStatus}
              </Badge>
            </div>

            {vStatus === "verified" && (
              <p className="mt-2 text-sm text-cosmic/70">Your identity is verified — you can submit your startup for review.</p>
            )}
            {vStatus === "submitted" && (
              <p className="mt-2 text-sm text-cosmic/70">Your documents are under review. Your status updates here once the StarSector8 team completes it.</p>
            )}
            {(vStatus === "incomplete" || vStatus === "rejected") && (
              <>
                {vStatus === "rejected" && vReason && (
                  <div className="mt-2 rounded-lg bg-ignition/10 p-3 text-sm text-ignition-ink">
                    Your verification was rejected. Reason: {vReason}. Please review and resubmit.
                  </div>
                )}
                <p className="mt-2 text-sm text-cosmic/70">
                  Everyone on StelarVest is identity-verified. Upload a photograph, a government ID, and a
                  utility bill (proof of address) — the StarSector8 team reviews them before you can submit
                  your startup. Files: JPG, PNG, WebP, or PDF, max 4MB.
                </p>
                {/* Flow: photograph → which ID → its number → the ID itself. */}
                <form onSubmit={submitVerification} className="mt-3 space-y-3">
                  {[FOUNDER_DOCS[0]].map((d) => (
                    <div key={d.kind}>
                      <span className="mb-1 block text-sm font-medium text-cosmic/80">{d.label}</span>
                      <input
                        ref={(el) => { vFileRefs.current[d.kind] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={() => setVErr((p) => ({ ...p, [d.kind]: "" }))}
                        className={`block w-full rounded-lg border text-sm text-cosmic/70 file:mr-3 file:rounded-lg file:border-0 file:bg-cosmic file:px-3 file:py-2 file:text-sm file:font-medium file:text-pioneer hover:file:bg-cosmic/90 ${
                          vErr[d.kind] ? "border-danger" : "border-cosmic/15"
                        }`}
                      />
                      {vErr[d.kind] && <p className="mt-1 text-sm text-danger">{vErr[d.kind]}</p>}
                    </div>
                  ))}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-cosmic/80">ID type</span>
                    <select
                      value={vIdType}
                      onChange={(e) => { setVIdType(e.target.value); setVErr((p) => ({ ...p, idType: "" })); }}
                      aria-invalid={vErr.idType ? true : undefined}
                      className={`${inputCls} ${vErr.idType ? "border-danger" : ""}`}
                    >
                      <option value="">Select…</option>
                      {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {vErr.idType && <span className="mt-1 block text-sm text-danger">{vErr.idType}</span>}
                  </label>
                  <Field label="ID number" value={vIdNumber} error={vErr.idNumber}
                    onChange={(e) => { setVIdNumber(e.target.value); setVErr((p) => ({ ...p, idNumber: "" })); }} />
                  {FOUNDER_DOCS.slice(1).map((d) => (
                    <div key={d.kind}>
                      <span className="mb-1 block text-sm font-medium text-cosmic/80">{d.label}</span>
                      <input
                        ref={(el) => { vFileRefs.current[d.kind] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={() => setVErr((p) => ({ ...p, [d.kind]: "" }))}
                        className={`block w-full rounded-lg border text-sm text-cosmic/70 file:mr-3 file:rounded-lg file:border-0 file:bg-cosmic file:px-3 file:py-2 file:text-sm file:font-medium file:text-pioneer hover:file:bg-cosmic/90 ${
                          vErr[d.kind] ? "border-danger" : "border-cosmic/15"
                        }`}
                      />
                      {vErr[d.kind] && <p className="mt-1 text-sm text-danger">{vErr[d.kind]}</p>}
                    </div>
                  ))}
                  <Button variant="accent" type="submit" disabled={vBusy}>
                    {vBusy ? "Submitting…" : vStatus === "rejected" ? "Resubmit for verification" : "Submit for verification"}
                  </Button>
                </form>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Startup profile — unlocked once the founder profile exists. */}
      {!fpExists && !startup ? (
        <Card className="mt-4 border-cosmic/10 bg-cosmic/[0.03]">
          <p className="font-display text-lg font-semibold text-cosmic/70">Startup profile</p>
          <p className="mt-1 text-sm text-cosmic/60">Complete your founder profile above to create your startup profile.</p>
        </Card>
      ) : (
      <Card className="mt-4">
        <p className="font-display text-lg font-semibold text-cosmic">Startup profile</p>
        {editable ? (
          <form onSubmit={saveProfile} className="mt-3 space-y-3">
            <Field label="Startup name" value={name} error={pErr.name}
              onChange={(e) => { setName(e.target.value); setPErr((p) => ({ ...p, name: "" })); }} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
            </label>
            <Field label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Stage</span>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls}>
                <option value="">Select a stage…</option>
                {STARTUP_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.value}</option>
                ))}
              </select>
              {stageHelp(stage) && <p className="mt-1 text-xs text-cosmic/50">{stageHelp(stage)}</p>}
            </label>
            <Button type="submit" disabled={busy}>{startup ? "Save profile" : "Create startup"}</Button>
          </form>
        ) : (
          <div className="mt-2 space-y-1 text-sm text-cosmic/80">
            {startup.description && <p>{startup.description}</p>}
            {startup.website && <p className="text-cosmic/60"><ExternalLink href={startup.website} /></p>}
            {startup.stage && <p className="text-cosmic/60">Stage: {startup.stage}</p>}
            <p className="text-cosmic/60">Profile is locked while {s?.label.toLowerCase()}.</p>
          </div>
        )}
      </Card>
      )}

      {/* Team */}
      {startup && (
        <Card className="mt-4">
          <p className="font-display text-lg font-semibold text-cosmic">Team</p>
          <p className="mt-1 text-sm text-cosmic/70">The people behind {startup.name}, shown to the StarSector8 review team.</p>
          {team.length > 0 && (
            <ul className="mt-3 divide-y divide-cosmic/10 border-t border-cosmic/10">
              {team.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cosmic">
                      {m.name} <span className="font-normal text-cosmic/60">· {m.role}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-cosmic/60">
                      {[m.email, m.phone].filter(Boolean).join(" · ")}
                      {m.linkedin && (
                        <>
                          {(m.email || m.phone) ? " · " : ""}
                          <a href={m.linkedin} target="_blank" rel="noreferrer" className="text-ignition-ink underline">LinkedIn</a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-sm">
                    <button onClick={() => editMember(m)} className="font-medium text-ignition-ink underline">Edit</button>
                    <button onClick={() => deleteMember(m.id)} disabled={busy} className="font-medium text-danger underline">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={saveMember} noValidate className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={mName} error={mErr.name} required
                onChange={(e) => { setMName(e.target.value); clearMErr("name"); }} />
              <Field label="Role" value={mRole} error={mErr.role} placeholder="e.g. CEO, CTO" required
                onChange={(e) => { setMRole(e.target.value); clearMErr("role"); }} />
              <Field label="Email" type="email" value={mEmail} error={mErr.email} required
                onChange={(e) => { setMEmail(e.target.value); clearMErr("email"); }} />
              <Field label="Phone" value={mPhone} error={mErr.phone} required
                onChange={(e) => { setMPhone(e.target.value); clearMErr("phone"); }} />
            </div>
            <Field label="LinkedIn (optional)" value={mLinkedin} onChange={(e) => setMLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
            <div className="flex gap-3">
              <Button type="submit" disabled={busy}>{mId ? "Save changes" : "Add team member"}</Button>
              {mId && <Button type="button" variant="outline" onClick={resetMember}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      {/* Documents */}
      {startup && (
        <Card className="mt-4">
          <p className="font-display text-lg font-semibold text-cosmic">Documents</p>
          {docs.length === 0 ? (
            <p className="mt-1 text-sm text-cosmic/70">No documents yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-cosmic"><span className="text-cosmic/60">{KIND_LABEL[d.kind] ?? d.kind}:</span> {d.filename}</span>
                  <button onClick={() => viewDoc(d.id)} aria-label={`View ${d.filename}`} className="shrink-0 font-medium text-ignition-ink underline">View</button>
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <form onSubmit={uploadDoc} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select value={docKind} onChange={(e) => setDocKind(e.target.value)} className={inputCls} aria-label="Document type">
                <option value="pitch">Pitch deck</option>
                <option value="dd">Due diligence</option>
                <option value="kyc">Founder ID/KYC</option>
                <option value="other">Other</option>
              </select>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required
                className="block w-full text-sm text-cosmic/70 file:mr-3 file:rounded-lg file:border-0 file:bg-cosmic file:px-3 file:py-2 file:text-sm file:font-medium file:text-pioneer hover:file:bg-cosmic/90" />
              <Button type="submit" variant="accent" disabled={busy} className="w-full sm:w-auto">Upload</Button>
            </form>
          )}
        </Card>
      )}

      {/* Submit */}
      {startup && editable && (
        <Card className="mt-4">
          <p className="font-display text-lg font-semibold text-cosmic">Submit for review</p>
          <p className="mt-1 text-sm text-cosmic/70">Once you submit, StarSector8 reviews your startup and documents. You&rsquo;ll be emailed the result.</p>
          <Button variant="accent" disabled={busy} onClick={submit} className="mt-3">Submit for review</Button>
        </Card>
      )}

      {/* Updates (approved) */}
      {startup?.status === "approved" && (
        <Card className="mt-4">
          <p className="font-display text-lg font-semibold text-cosmic">Investor updates</p>
          <p className="mt-1 text-sm text-cosmic/70">
            Please post a comprehensive update at least once a quarter, and whenever you hit a
            significant milestone. Updates are reviewed by StarSector8 before investors see them.
          </p>
          <form onSubmit={postUpdate} className="mt-3 space-y-3">
            <Field label="Title" value={updTitle} onChange={(e) => setUpdTitle(e.target.value)} required />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Update</span>
              <textarea value={updBody} onChange={(e) => setUpdBody(e.target.value)} rows={3} required className={inputCls} />
            </label>
            <Button type="submit" disabled={busy}>Post update</Button>
          </form>
          {updates.length > 0 && (
            <ul className="mt-4 divide-y divide-cosmic/10 border-t border-cosmic/10">
              {updates.map((u) => {
                const us = UPDATE_STATUS[u.status] ?? UPDATE_STATUS.pending;
                return (
                  <li key={u.id} className="py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-cosmic">{u.title}</p>
                      <Badge tone={us.tone}>{us.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-cosmic/70">{u.body}</p>
                    {u.status === "rejected" && u.rejectionReason && (
                      <p className="mt-1 text-sm text-ignition-ink">Reviewer note: {u.rejectionReason}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </main>
  );
}
