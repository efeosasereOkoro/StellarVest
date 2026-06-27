"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
type Update = { id: string; title: string; body: string; createdAt: string };

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  submitted: { tone: "pitch", label: "Submitted" },
  under_review: { tone: "pitch", label: "Under review" },
  approved: { tone: "venture", label: "Approved" },
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [stage, setStage] = useState("");
  const [docKind, setDocKind] = useState("pitch");
  // Update form
  const [updTitle, setUpdTitle] = useState("");
  const [updBody, setUpdBody] = useState("");

  async function load() {
    const res = await fetch("/api/founder/startup", { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    const s: Startup | null = data.startup ?? null;
    setStartup(s);
    setDocs(data.documents ?? []);
    setUpdates(data.updates ?? []);
    if (s) {
      setName(s.name);
      setDescription(s.description ?? "");
      setWebsite(s.website ?? "");
      setStage(s.stage ?? "");
    }
    setLoaded(true);
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
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
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't save.");
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

  if (isPending || !session || !loaded) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  const editable = !startup || ["draft", "rejected"].includes(startup.status);
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

      {startup?.status === "rejected" && startup.rejectionReason && (
        <Card className="mt-4 border-danger/30 bg-ignition/10">
          <p className="text-sm font-medium text-cosmic">Reviewer feedback</p>
          <p className="mt-1 text-sm text-cosmic/80">{startup.rejectionReason}</p>
        </Card>
      )}

      {/* Profile */}
      <Card className="mt-6">
        <p className="font-medium text-cosmic">Startup profile</p>
        {editable ? (
          <form onSubmit={saveProfile} className="mt-3 space-y-3">
            <Field label="Startup name" value={name} onChange={(e) => setName(e.target.value)} required />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
            </label>
            <Field label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            <Field label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. Pre-seed, Seed" />
            <Button type="submit" disabled={busy}>{startup ? "Save profile" : "Create startup"}</Button>
          </form>
        ) : (
          <div className="mt-2 space-y-1 text-sm text-cosmic/80">
            {startup.description && <p>{startup.description}</p>}
            {startup.website && <p className="text-cosmic/60">{startup.website}</p>}
            {startup.stage && <p className="text-cosmic/60">Stage: {startup.stage}</p>}
            <p className="text-cosmic/60">Profile is locked while {s?.label.toLowerCase()}.</p>
          </div>
        )}
      </Card>

      {/* Documents */}
      {startup && (
        <Card className="mt-4">
          <p className="font-medium text-cosmic">Documents</p>
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
          <p className="font-medium text-cosmic">Submit for review</p>
          <p className="mt-1 text-sm text-cosmic/70">Once you submit, StarSector8 reviews your startup and documents. You&rsquo;ll be emailed the result.</p>
          <Button variant="accent" disabled={busy} onClick={submit} className="mt-3">Submit for review</Button>
        </Card>
      )}

      {/* Updates (approved) */}
      {startup?.status === "approved" && (
        <Card className="mt-4">
          <p className="font-medium text-cosmic">Investor updates</p>
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
              {updates.map((u) => (
                <li key={u.id} className="py-2.5">
                  <p className="text-sm font-medium text-cosmic">{u.title}</p>
                  <p className="mt-1 text-sm text-cosmic/70">{u.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </main>
  );
}
