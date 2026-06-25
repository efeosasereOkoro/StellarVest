"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Deal = { id: string; startupName: string; status: string };

export const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
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

export default function DealsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/deals", { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json().catch(() => ({}));
    setDeals(data.deals ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/deals", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ startupName: name, description: desc }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setDesc("");
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't create the deal.");
    }
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Admins only</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Deals</h1>

      {(() => {
        const needsReview = deals.filter((d) => d.status === "under_review");
        if (needsReview.length === 0) return null;
        return (
          <Card className="mt-6 border-pitch bg-pitch/20">
            <p className="font-medium text-cosmic">Awaiting committee review ({needsReview.length})</p>
            <ul className="mt-2 space-y-1.5">
              {needsReview.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/deals/${d.id}`} className="min-w-0 truncate font-medium text-cosmic underline">{d.startupName}</Link>
                  <Link href={`/admin/deals/${d.id}`} className="shrink-0 font-medium text-ignition-ink underline">Review →</Link>
                </li>
              ))}
            </ul>
          </Card>
        );
      })()}

      <Card className="mt-6">
        <form onSubmit={create} className="space-y-3">
          <Field label="Startup name" value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-cosmic/80">Description (optional)</span>
            <textarea
              value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={busy}>Create deal</Button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {deals.length === 0 && <p className="text-cosmic/70">No deals yet.</p>}
        {deals.map((d) => {
          const s = STATUS[d.status] ?? STATUS.draft;
          return (
            <Link key={d.id} href={`/admin/deals/${d.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 transition-colors hover:border-cosmic/25">
                <span className="min-w-0 truncate font-medium text-cosmic">{d.startupName}</span>
                <Badge tone={s.tone} className="shrink-0">{s.label}</Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
