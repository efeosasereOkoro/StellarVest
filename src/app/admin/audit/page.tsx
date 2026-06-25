"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Entry = {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: { reason?: string; filename?: string } | null;
  createdAt: string;
};

const TONE: Record<string, "venture" | "pitch" | "ignition" | "neutral"> = {
  "kyc.verified": "venture",
  "kyc.submitted": "pitch",
  "kyc.rejected": "ignition",
};

export default function AuditPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load(f = { actor, action, from, to }) {
    const token = await getToken();
    const qs = new URLSearchParams();
    if (f.actor) qs.set("actor", f.actor);
    if (f.action) qs.set("action", f.action);
    if (f.from) qs.set("from", f.from);
    if (f.to) qs.set("to", f.to);
    const res = await fetch(`/api/admin/audit?${qs.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json().catch(() => ({}));
    setEntries(data.entries ?? []);
    setState("ready");
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function clearFilters() {
    setActor("");
    setAction("");
    setFrom("");
    setTo("");
    load({ actor: "", action: "", from: "", to: "" });
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-cosmic/60">Your account doesn&apos;t have admin access.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Audit trail</h1>
      <p className="mt-1 text-sm text-cosmic/60">
        Append-only record of governance actions ({entries.length} shown, newest first).
      </p>

      <Card className="mt-4">
        <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-cosmic/70">Actor email</span>
            <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="e.g. admin@…"
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-cosmic/70">Action</span>
            <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. deal, kyc, contribution"
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-cosmic/70">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-cosmic/70">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30" />
          </label>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
          </div>
        </form>
      </Card>

      {entries.length === 0 ? (
        <Card className="mt-6 text-sm text-cosmic/60">No activity matches these filters.</Card>
      ) : (
        <ul className="mt-6 space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="!p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={TONE[e.action] ?? "neutral"}>{e.action}</Badge>
                  <span className="text-xs text-cosmic/70">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-cosmic/80">
                  <span className="font-medium text-cosmic">{e.actorEmail ?? "system"}</span>
                  {e.targetId ? <> → {(e.targetType ?? "record").replace(/_/g, " ")} <span className="text-cosmic/60">{e.targetId.slice(0, 8)}…</span></> : null}
                </p>
                {e.metadata?.reason && (
                  <p className="mt-1 text-sm text-cosmic/60">Reason: {e.metadata.reason}</p>
                )}
                {e.metadata?.filename && (
                  <p className="mt-1 text-sm text-cosmic/60">File: {e.metadata.filename}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
