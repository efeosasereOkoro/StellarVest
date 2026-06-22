"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Member = { userId: string; fullName: string | null; kycStatus: string | null };
type Assignable = { userId: string; fullName: string | null };
type Cohort = { id: string; name: string; syndicate: string | null };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function CohortPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "notfound" | "ready">("loading");
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignable, setAssignable] = useState<Assignable[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/cohorts/${id}/members`, { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    if (res.status === 404) return setState("notfound");
    const data = await res.json();
    setCohort(data.cohort);
    setMembers(data.members ?? []);
    setAssignable(data.assignable ?? []);
    setSelected("");
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, id]);

  async function addMember() {
    if (!selected) return;
    setBusy(true);
    const res = await fetch(`/api/admin/cohorts/${id}/members`, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ userId: selected }),
    });
    setBusy(false);
    if (res.ok) await load();
  }

  async function removeMember(userId: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/cohorts/${id}/members`, {
      method: "DELETE",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    if (res.ok) await load();
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/50">Loading…</main>;
  }
  if (state === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Admins only</h1>
      </main>
    );
  }
  if (state === "notfound" || !cohort) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Cohort not found</h1>
        <Link href="/admin/structures" className="mt-3 inline-block font-medium text-cosmic underline">← Structures</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/admin/structures" className="text-cosmic/60 underline">← Structures</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{cohort.name}</h1>
      {cohort.syndicate && <p className="mt-1 text-cosmic/60">{cohort.syndicate}</p>}

      <Card className="mt-6">
        <p className="font-medium text-cosmic">Members ({members.length})</p>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-cosmic/50">No investors assigned yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cosmic/10 border-t border-cosmic/10">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-cosmic">{m.fullName ?? m.userId}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {m.kycStatus && <Badge tone={m.kycStatus === "verified" ? "venture" : "neutral"}>{m.kycStatus}</Badge>
                  }
                  <button onClick={() => removeMember(m.userId)} disabled={busy} className="font-medium text-danger underline">
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <p className="font-medium text-cosmic">Assign a verified investor</p>
        {assignable.length === 0 ? (
          <p className="mt-2 text-sm text-cosmic/50">No verified investors available to add.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
            >
              <option value="">Select an investor…</option>
              {assignable.map((a) => (
                <option key={a.userId} value={a.userId}>{a.fullName ?? a.userId}</option>
              ))}
            </select>
            <Button onClick={addMember} disabled={busy || !selected} className="w-full sm:w-auto">Add</Button>
          </div>
        )}
      </Card>
    </main>
  );
}
