"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Deal = { id: string; startupName: string; description: string | null; status: string };
type Doc = { id: string; filename: string; uploadedAt: string };
type Review = { id: string; reviewerEmail: string | null; recommendation: string; comment: string | null; createdAt: string };

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  under_review: { tone: "pitch", label: "Under review" },
  approved: { tone: "venture", label: "Approved" },
  declined: { tone: "ignition", label: "Declined" },
  published: { tone: "venture", label: "Published" },
};

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function DealPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<"loading" | "forbidden" | "notfound" | "ready">("loading");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/deals/${id}`, { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    if (res.status === 404) return setState("notfound");
    const data = await res.json().catch(() => ({}));
    if (!data.deal) return setState("notfound");
    setDeal(data.deal);
    setDocs(data.documents ?? []);
    setReviews(data.reviews ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, id]);

  async function doAction(action: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/deals/${id}`, {
      method: "PATCH",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) await load();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't update the deal.");
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
    const res = await fetch(`/api/admin/deals/${id}/documents`, { method: "POST", headers: await authHeaders(), body });
    setBusy(false);
    if (res.ok) {
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Upload failed.");
    }
  }

  async function viewDoc(docId: string) {
    const res = await fetch(`/api/admin/deals/document?id=${docId}`, { headers: await authHeaders() });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }
  if (state === "notfound" || !deal) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Deal not found</h1>
        <Link href="/admin/deals" className="mt-3 inline-block font-medium text-cosmic underline">← Deals</Link>
      </main>
    );
  }

  const s = STATUS[deal.status] ?? STATUS.draft;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/admin/deals" className="text-cosmic/60 underline">← Deals</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{deal.startupName}</h1>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      {deal.description && <p className="mt-2 text-sm text-cosmic/70">{deal.description}</p>}

      {/* Workflow actions */}
      <Card className="mt-6">
        <p className="font-medium text-cosmic">Status</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {deal.status === "draft" && <Button disabled={busy} onClick={() => doAction("send_to_committee")}>Send to committee</Button>}
          {deal.status === "under_review" && (
            <>
              <Button variant="accent" disabled={busy} onClick={() => doAction("approve")}>Approve</Button>
              <Button variant="outline" disabled={busy} onClick={() => doAction("decline")}>Decline</Button>
            </>
          )}
          {deal.status === "approved" && <Button variant="accent" disabled={busy} onClick={() => doAction("publish")}>Publish to investors</Button>}
          {(deal.status === "published" || deal.status === "declined") && (
            <p className="text-sm text-cosmic/70">This deal is {s.label.toLowerCase()} — no further actions.</p>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {/* Deal Room documents */}
      <Card className="mt-4">
        <p className="font-medium text-cosmic">Deal Room documents</p>
        {docs.length === 0 ? (
          <p className="mt-1 text-sm text-cosmic/70">No documents yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cosmic">{d.filename}</span>
                <button onClick={() => viewDoc(d.id)} className="shrink-0 font-medium text-ignition-ink underline">View</button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={uploadDoc} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required
            className="block w-full text-sm text-cosmic/70 file:mr-3 file:rounded-lg file:border-0 file:bg-cosmic file:px-3 file:py-2 file:text-sm file:font-medium file:text-pioneer hover:file:bg-cosmic/90"
          />
          <Button type="submit" variant="accent" disabled={busy} className="w-full sm:w-auto">Upload</Button>
        </form>
      </Card>

      {/* Committee reviews */}
      <Card className="mt-4">
        <p className="font-medium text-cosmic">Committee reviews</p>
        {reviews.length === 0 ? (
          <p className="mt-1 text-sm text-cosmic/70">No committee reviews yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cosmic/10 border-t border-cosmic/10">
            {reviews.map((r) => (
              <li key={r.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-cosmic">{r.reviewerEmail ?? "Committee"}</span>
                  <Badge tone={r.recommendation === "approve" ? "venture" : r.recommendation === "decline" ? "ignition" : "neutral"}>{r.recommendation}</Badge>
                </div>
                {r.comment && <p className="mt-1 text-cosmic/70">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
