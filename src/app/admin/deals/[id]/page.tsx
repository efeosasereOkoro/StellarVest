"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Badge } from "@/components/ui/badge";

type Deal = { id: string; startupId: string | null; startupName: string; description: string | null; status: string; fundingGoal: string | null; valuation: string | null; terms: string | null };
type Doc = { id: string; filename: string; uploadedAt: string };
type FounderDoc = { id: string; kind: string; filename: string; uploadedAt: string };
type Review = { id: string; reviewerEmail: string | null; recommendation: string; comment: string | null; createdAt: string };

const money = (a: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(a));
const KIND_LABEL: Record<string, string> = { pitch: "Pitch deck", dd: "Due diligence", kyc: "Founder ID/KYC", other: "Other" };

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
  const [founderDocs, setFounderDocs] = useState<FounderDoc[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewRec, setReviewRec] = useState("comment");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/deals/${id}`, { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    if (res.status === 404) return setState("notfound");
    const data = await res.json().catch(() => ({}));
    if (!data.deal) return setState("notfound");
    setDeal(data.deal);
    setDocs(data.documents ?? []);
    setFounderDocs(data.founderDocuments ?? []);
    const allReviews: Review[] = data.reviews ?? [];
    setReviews(allReviews);
    // Pre-fill the form with this reviewer's existing review, if any (editable).
    const mine = allReviews.find((r) => r.reviewerEmail && r.reviewerEmail === session?.user?.email);
    if (mine) {
      setReviewRec(mine.recommendation);
      setReviewComment(mine.comment ?? "");
    }
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

  async function viewFounderDoc(docId: string) {
    const res = await fetch(`/api/admin/startups/document?id=${docId}`, { headers: await authHeaders() });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setReviewError(null);
    const res = await fetch(`/api/admin/deals/${id}/reviews`, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ recommendation: reviewRec, comment: reviewComment }),
    });
    setBusy(false);
    if (res.ok) {
      setReviewComment("");
      setReviewRec("comment");
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setReviewError(d.error ?? "Couldn't submit your review.");
    }
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
  const myReview = reviews.find((r) => r.reviewerEmail && r.reviewerEmail === session?.user?.email);

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
              <ConfirmButton
                variant="outline"
                disabled={busy}
                onConfirm={() => doAction("decline")}
                title="Decline this deal?"
                message="This permanently declines the deal. It won't be published to investors and can't be undone."
                confirmLabel="Decline deal"
              >
                Decline
              </ConfirmButton>
            </>
          )}
          {deal.status === "approved" && (
            <ConfirmButton
              variant="accent"
              disabled={busy}
              onConfirm={() => doAction("publish")}
              title="Publish to investors?"
              message="Verified investors will be able to view this deal and contribute to it. This can't be undone."
              confirmLabel="Publish"
            >
              Publish to investors
            </ConfirmButton>
          )}
          {deal.status === "published" && (
            <ConfirmButton
              variant="outline"
              disabled={busy}
              onConfirm={() => doAction("unpublish")}
              title="Unpublish this deal?"
              message="This removes the deal from investors and returns it to Approved. Only possible if no one has contributed yet."
              confirmLabel="Unpublish"
            >
              Unpublish
            </ConfirmButton>
          )}
          {deal.status === "declined" && (
            <ConfirmButton
              variant="outline"
              disabled={busy}
              onConfirm={() => doAction("reopen")}
              title="Reopen for review?"
              message="This sends the deal back to the investment committee (status: Under review)."
              confirmLabel="Reopen"
            >
              Reopen for review
            </ConfirmButton>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {/* Deal terms */}
      {(deal.fundingGoal || deal.valuation || deal.terms) && (
        <Card className="mt-4">
          <p className="font-medium text-cosmic">Deal terms</p>
          <dl className="mt-2 space-y-2 text-sm">
            {deal.fundingGoal && <div className="flex justify-between gap-3"><dt className="text-cosmic/70">Funding goal</dt><dd className="font-medium text-cosmic">{money(deal.fundingGoal)}</dd></div>}
            {deal.valuation && <div className="flex justify-between gap-3"><dt className="text-cosmic/70">Valuation</dt><dd className="font-medium text-cosmic">{deal.valuation}</dd></div>}
            {deal.terms && <div><dt className="text-cosmic/70">Investment terms</dt><dd className="mt-0.5 whitespace-pre-wrap text-cosmic">{deal.terms}</dd></div>}
          </dl>
        </Card>
      )}

      {/* Startup documents — pulled from the approved profile (single source of truth) */}
      {founderDocs.length > 0 && (
        <Card className="mt-4">
          <p className="font-medium text-cosmic">Startup documents <span className="text-sm font-normal text-cosmic/50">(from the approved profile)</span></p>
          <ul className="mt-2 space-y-1.5">
            {founderDocs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cosmic"><span className="text-cosmic/60">{KIND_LABEL[d.kind] ?? d.kind}:</span> {d.filename}</span>
                <button onClick={() => viewFounderDoc(d.id)} aria-label={`View ${d.filename}`} className="shrink-0 font-medium text-ignition-ink underline">View</button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Additional deal documents (optional supplements beyond the startup profile) */}
      <Card className="mt-4">
        <p className="font-medium text-cosmic">Additional documents <span className="text-sm font-normal text-cosmic/50">(optional, specific to this deal)</span></p>
        {docs.length === 0 ? (
          <p className="mt-1 text-sm text-cosmic/70">No documents yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cosmic">{d.filename}</span>
                <button onClick={() => viewDoc(d.id)} aria-label={`View ${d.filename}`} className="shrink-0 font-medium text-ignition-ink underline">View</button>
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
        {deal.status === "under_review" && (
          <form onSubmit={submitReview} className="mt-4 space-y-3 border-t border-cosmic/10 pt-4">
            <p className="text-sm font-medium text-cosmic/80">{myReview ? "Update your review" : "Add your review"}</p>
            <select
              value={reviewRec}
              onChange={(e) => setReviewRec(e.target.value)}
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
            >
              <option value="approve">Recommend approve</option>
              <option value="decline">Recommend decline</option>
              <option value="comment">Comment only</option>
            </select>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={2}
              placeholder="Comments (optional)"
              aria-label="Review comments"
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
            />
            {reviewError && <p className="text-sm text-danger">{reviewError}</p>}
            <Button type="submit" disabled={busy}>{myReview ? "Update review" : "Submit review"}</Button>
          </form>
        )}
      </Card>
    </main>
  );
}
