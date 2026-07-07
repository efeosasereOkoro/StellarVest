"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Update = {
  id: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  startupName: string;
  founderEmail: string | null;
};

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  pending: { tone: "pitch", label: "Pending" },
  approved: { tone: "venture", label: "Approved" },
  rejected: { tone: "ignition", label: "Rejected" },
};

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function AdminUpdatesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [updates, setUpdates] = useState<Update[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/updates", { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json().catch(() => ({}));
    setUpdates(data.updates ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/updates/${id}`, {
      method: "PATCH",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action, reason: reason[id] ?? "" }),
    });
    setBusyId(null);
    if (res.ok) {
      setReason((r) => ({ ...r, [id]: "" }));
      await load();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Couldn't update.");
    }
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }

  const pending = updates.filter((u) => u.status === "pending");
  const reviewed = updates.filter((u) => u.status !== "pending");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Founder updates</h1>
      <p className="mt-1 text-sm text-cosmic/70">Review updates founders post before investors see them — approve to publish, or reject with a reason.</p>
      <p className="mt-1 text-sm text-cosmic/60">{pending.length > 0 ? `${pending.length} awaiting review` : "Nothing awaiting review"} · {updates.length} total</p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Pending — needs action */}
      <div className="mt-6 space-y-4">
        {pending.length === 0 && <p className="text-cosmic/70">No updates awaiting review.</p>}
        {pending.map((u) => (
          <Card key={u.id} className="border-ignition/30 bg-ignition/[0.05]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-cosmic">{u.title}</p>
              <Badge tone="pitch">Pending</Badge>
            </div>
            <p className="mt-0.5 text-sm text-cosmic/60">{u.startupName} · {u.founderEmail ?? "—"} · {new Date(u.createdAt).toLocaleDateString()}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-cosmic/80">{u.body}</p>
            <textarea
              value={reason[u.id] ?? ""}
              onChange={(e) => setReason((r) => ({ ...r, [u.id]: e.target.value }))}
              rows={2}
              placeholder="Reason (required to reject)"
              aria-label="Rejection reason"
              className="mt-3 w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
            />
            <div className="mt-2 flex gap-3">
              <Button variant="accent" disabled={busyId === u.id} onClick={() => decide(u.id, "approve")}>Approve</Button>
              <Button variant="outline" disabled={busyId === u.id} onClick={() => decide(u.id, "reject")}>Reject</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-semibold text-cosmic">Reviewed</h2>
          <div className="mt-3 space-y-3">
            {reviewed.map((u) => {
              const st = STATUS[u.status] ?? STATUS.pending;
              return (
                <Card key={u.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-cosmic">{u.title}</p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-cosmic/60">{u.startupName} · {new Date(u.createdAt).toLocaleDateString()}</p>
                  {u.status === "rejected" && u.rejectionReason && (
                    <p className="mt-1 text-sm text-cosmic/70">Reason: {u.rejectionReason}</p>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
