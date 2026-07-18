"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Startup = { id: string; name: string; stage?: string | null };
type Assignable = { id: string; name: string };

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

const inputCls =
  "w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30";

export default function AdminPortfolioPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "notfound" | "ready">("loading");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Startup[]>([]);
  const [assignable, setAssignable] = useState<Assignable[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/startup-cohorts/${id}/startups`, { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    if (res.status === 404) return setState("notfound");
    const data = await res.json().catch(() => ({}));
    setName(data.portfolio?.name ?? "");
    setMembers(data.startups ?? []);
    setAssignable(data.assignable ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, id]);

  async function mutate(method: "POST" | "DELETE", startupId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/startup-cohorts/${id}/startups`, {
      method,
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ startupId }),
    });
    setBusy(false);
    if (res.ok) { setSelected(""); await load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
  }

  if (isPending || state === "loading") return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  if (state === "forbidden") return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  if (state === "notfound") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Portfolio not found</h1>
        <Link href="/admin/structures" className="mt-3 inline-block font-medium text-cosmic underline">← Structures</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/admin/structures" className="text-cosmic/60 underline">← Structures</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 text-sm text-cosmic/70">The startups in this portfolio. A cohort&rsquo;s pool allocated to this portfolio is deployed across these startups.</p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <Card className="mt-6">
        <p className="font-display text-lg font-semibold text-cosmic">Startups in this portfolio</p>
        {members.length === 0 ? (
          <p className="mt-1 text-sm text-cosmic/70">No startups yet. Add approved startups below.</p>
        ) : (
          <ul className="mt-2 divide-y divide-cosmic/10 border-t border-cosmic/10">
            {members.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate text-cosmic">{s.name}{s.stage ? <span className="text-cosmic/60"> · {s.stage}</span> : null}</span>
                <button onClick={() => mutate("DELETE", s.id)} disabled={busy} className="shrink-0 font-medium text-danger underline">Remove</button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className={inputCls} aria-label="Approved startup">
            <option value="">{assignable.length ? "Add an approved startup…" : "No approved startups available"}</option>
            {assignable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button disabled={busy || !selected} onClick={() => mutate("POST", selected)} className="w-full shrink-0 sm:w-auto">Add</Button>
        </div>
      </Card>
    </main>
  );
}
