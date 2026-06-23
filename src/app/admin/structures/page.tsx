"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Cohort = { id: string; name: string; hasPool: boolean; memberCount: number };
type Syndicate = { id: string; name: string; description: string | null; cohorts: Cohort[] };
type StartupCohort = { id: string; name: string };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

const inputCls =
  "w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30";

export default function StructuresPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [syndicates, setSyndicates] = useState<Syndicate[]>([]);
  const [startups, setStartups] = useState<StartupCohort[]>([]);
  const [synName, setSynName] = useState("");
  const [synDesc, setSynDesc] = useState("");
  const [cohortName, setCohortName] = useState<Record<string, string>>({});
  const [startupName, setStartupName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/structures", { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json();
    setSyndicates(data.syndicates ?? []);
    setStartups(data.startupCohorts ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function post(url: string, body: unknown) {
    setBusy(true);
    const res = await fetch(url, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) await load();
    return res.ok;
  }

  async function createSyndicate(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/admin/syndicates", { name: synName, description: synDesc })) {
      setSynName("");
      setSynDesc("");
    }
  }

  async function createCohort(syndicateId: string) {
    const name = cohortName[syndicateId]?.trim();
    if (!name) return;
    if (await post("/api/admin/cohorts", { syndicateId, name })) {
      setCohortName((m) => ({ ...m, [syndicateId]: "" }));
    }
  }

  async function createStartup(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/admin/startup-cohorts", { name: startupName })) setStartupName("");
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Admins only</h1>
        <p className="mt-2 text-cosmic/60">Your account doesn&apos;t have admin access.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Investment structures</h1>
        <div className="flex gap-4 text-cosmic">
          <Link href="/admin/kyc" className="font-medium underline">KYC review</Link>
          <Link href="/admin/audit" className="font-medium underline">Audit</Link>
        </div>
      </div>

      {/* Syndicates */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Syndicates</h2>
        <Card className="mt-3">
          <form onSubmit={createSyndicate} className="space-y-3">
            <Field label="New syndicate name" value={synName} onChange={(e) => setSynName(e.target.value)} required />
            <Field label="Description (optional)" value={synDesc} onChange={(e) => setSynDesc(e.target.value)} />
            <Button type="submit" disabled={busy}>Create syndicate</Button>
          </form>
        </Card>

        <div className="mt-4 space-y-4">
          {syndicates.length === 0 && <p className="text-cosmic/70">No syndicates yet.</p>}
          {syndicates.map((s) => (
            <Card key={s.id}>
              <p className="font-medium text-cosmic">{s.name}</p>
              {s.description && <p className="mt-0.5 text-sm text-cosmic/60">{s.description}</p>}

              <p className="mt-4 text-sm font-medium text-cosmic/80">Investor cohorts</p>
              {s.cohorts.length === 0 ? (
                <p className="mt-1 text-sm text-cosmic/70">No cohorts yet.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {s.cohorts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link href={`/admin/cohorts/${c.id}`} className="font-medium text-cosmic underline">{c.name}</Link>
                      <span className="flex items-center gap-2 text-cosmic/70">
                        {c.hasPool && <Badge tone="venture">pool</Badge>}
                        {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputCls}
                  placeholder="New cohort name"
                  value={cohortName[s.id] ?? ""}
                  onChange={(e) => setCohortName((m) => ({ ...m, [s.id]: e.target.value }))}
                />
                <Button
                  disabled={busy}
                  onClick={() => createCohort(s.id)}
                  className="w-full shrink-0 whitespace-nowrap sm:w-auto"
                >
                  Add cohort
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Startup cohorts */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Startup cohorts</h2>
        <Card className="mt-3">
          <form onSubmit={createStartup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="New startup cohort name" value={startupName} onChange={(e) => setStartupName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">Create</Button>
          </form>
          {startups.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-cosmic/10 pt-3 text-sm">
              {startups.map((sc) => (
                <li key={sc.id} className="text-cosmic">{sc.name}</li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}
