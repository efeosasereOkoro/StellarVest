"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Startup = {
  id: string; name: string; description: string | null; website: string | null;
  stage: string | null; status: string; founderEmail: string | null; rejectionReason: string | null;
};
type Doc = { id: string; kind: string; filename: string; uploadedAt: string };
type TeamMember = { id: string; name: string; role: string; linkedin: string | null; phone: string | null; email: string | null };

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  submitted: { tone: "pitch", label: "Submitted" },
  under_review: { tone: "pitch", label: "Under review" },
  approved: { tone: "venture", label: "Approved" },
  rejected: { tone: "ignition", label: "Rejected" },
};
const KIND_LABEL: Record<string, string> = { pitch: "Pitch deck", dd: "Due diligence", kyc: "Founder ID/KYC", other: "Other" };

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function AdminStartupReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "notfound" | "ready">("loading");
  const [startup, setStartup] = useState<Startup | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/startups/${id}`, { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    if (res.status === 404) return setState("notfound");
    const data = await res.json().catch(() => ({}));
    if (!data.startup) return setState("notfound");
    setStartup(data.startup);
    setDocs(data.documents ?? []);
    setTeam(data.team ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, id]);

  async function viewDoc(docId: string) {
    const res = await fetch(`/api/admin/startups/document?id=${docId}`, { headers: await authHeaders() });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/startups/${id}`, {
      method: "PATCH",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action, reason }),
    });
    setBusy(false);
    if (res.ok) await load();
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't update.");
  }

  if (isPending || state === "loading") return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  if (state === "forbidden") return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  if (state === "notfound" || !startup) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Startup not found</h1>
        <Link href="/admin/startups" className="mt-3 inline-block font-medium text-cosmic underline">← Submissions</Link>
      </main>
    );
  }

  const s = STATUS[startup.status] ?? STATUS.draft;
  const reviewable = ["submitted", "under_review"].includes(startup.status);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/admin/startups" className="text-cosmic/60 underline">← Submissions</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{startup.name}</h1>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-cosmic/60">{startup.founderEmail ?? "—"}</p>

      <Card className="mt-6">
        <p className="font-medium text-cosmic">Profile</p>
        <div className="mt-2 space-y-1 text-sm text-cosmic/80">
          {startup.description && <p>{startup.description}</p>}
          {startup.website && <p className="text-cosmic/60">{startup.website}</p>}
          {startup.stage && <p className="text-cosmic/60">Stage: {startup.stage}</p>}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-medium text-cosmic">Team</p>
        {team.length === 0 ? (
          <p className="mt-1 text-sm text-cosmic/70">No team members listed.</p>
        ) : (
          <ul className="mt-2 divide-y divide-cosmic/10 border-t border-cosmic/10">
            {team.map((m) => (
              <li key={m.id} className="py-2.5 text-sm">
                <p className="font-medium text-cosmic">{m.name} <span className="font-normal text-cosmic/60">· {m.role}</span></p>
                <p className="mt-0.5 text-cosmic/60">
                  {[m.email, m.phone].filter(Boolean).join(" · ") || "—"}
                  {m.linkedin && (
                    <>
                      {(m.email || m.phone) ? " · " : ""}
                      <a href={m.linkedin} target="_blank" rel="noreferrer" className="text-ignition-ink underline">LinkedIn</a>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <p className="font-medium text-cosmic">Documents</p>
        {docs.length === 0 ? (
          <p className="mt-1 text-sm text-cosmic/70">No documents.</p>
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
      </Card>

      <Card className="mt-4">
        <p className="font-medium text-cosmic">Review decision</p>
        {startup.status === "rejected" && startup.rejectionReason && (
          <p className="mt-1 text-sm text-cosmic/70">Last rejection reason: {startup.rejectionReason}</p>
        )}
        {reviewable ? (
          <div className="mt-3 space-y-3">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (required to reject)" aria-label="Rejection reason"
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30" />
            <div className="flex gap-3">
              <Button variant="accent" disabled={busy} onClick={() => decide("approve")}>Approve</Button>
              <Button variant="outline" disabled={busy} onClick={() => decide("reject")}>Reject</Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-cosmic/70">This startup is {s.label.toLowerCase()} — no review action.</p>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>
    </main>
  );
}
