"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";

type Update = { title: string; body: string; createdAt: string };
type Startup = {
  id: string;
  name: string;
  stage: string | null;
  description: string | null;
  website: string | null;
  updates: Update[];
};

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function PortfolioDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "notfound" | "ready">("loading");
  const [name, setName] = useState("");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const res = await fetch(`/api/portfolio/${id}`, { headers: await authHeaders() });
      if (!res.ok) return setState("notfound");
      const data = await res.json().catch(() => ({}));
      setName(data.portfolio?.name ?? "");
      setStartups(data.startups ?? []);
      setState("ready");
    })();
  }, [isPending, session, id, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }
  if (state === "notfound") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Portfolio not found</h1>
        <p className="mt-2 text-sm text-cosmic/70">It may not be part of your cohort&rsquo;s allocation.</p>
        <Link href="/portfolio" className="mt-3 inline-block font-medium text-cosmic underline">← Your portfolio</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/portfolio" className="text-cosmic/60 underline">&larr; Your portfolio</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 text-sm text-cosmic/70">Startups in this portfolio. Tap one for details and its latest updates.</p>

      <div className="mt-6 space-y-3">
        {startups.length === 0 && <p className="text-cosmic/70">No startups have been added to this portfolio yet.</p>}
        {startups.map((s) => {
          const expanded = open === s.id;
          return (
            <Card key={s.id}>
              <button onClick={() => setOpen(expanded ? null : s.id)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={expanded}>
                <div className="min-w-0">
                  <p className="font-medium text-cosmic">{s.name}</p>
                  {s.stage && <p className="mt-0.5 text-sm text-cosmic/60">{s.stage}</p>}
                </div>
                <span className="shrink-0 text-sm font-medium text-ignition-ink">{expanded ? "Hide" : "Details"}</span>
              </button>

              {expanded && (
                <div className="mt-3 border-t border-cosmic/10 pt-3">
                  {s.description && <p className="text-sm text-cosmic/80">{s.description}</p>}
                  {s.website && (
                    <p className="mt-1 text-sm">
                      <a href={s.website} target="_blank" rel="noreferrer" className="font-medium text-ignition-ink underline">{s.website}</a>
                    </p>
                  )}
                  <p className="mt-3 text-sm font-medium text-cosmic/80">Updates</p>
                  {s.updates.length === 0 ? (
                    <p className="mt-1 text-sm text-cosmic/70">No updates yet.</p>
                  ) : (
                    <ul className="mt-1 space-y-2">
                      {s.updates.map((u, i) => (
                        <li key={i} className="rounded-lg bg-cosmic/[0.03] p-3">
                          <p className="text-sm font-medium text-cosmic">{u.title}</p>
                          <p className="mt-0.5 text-xs text-cosmic/50">{new Date(u.createdAt).toLocaleDateString()}</p>
                          <p className="mt-1 text-sm text-cosmic/70">{u.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
