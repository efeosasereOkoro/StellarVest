"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";

type Update = { id: string; title: string; body: string; createdAt: string; startupName: string };

export default function UpdatesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "not_verified" | "ready">("loading");
  const [updates, setUpdates] = useState<Update[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/updates", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 403) return setState("not_verified");
      const data = await res.json().catch(() => ({}));
      setUpdates(data.updates ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }
  if (state === "not_verified") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Portfolio updates</h1>
        <Card className="mt-6">
          <p className="font-medium text-cosmic">Get verified first</p>
          <p className="mt-1 text-sm text-cosmic/70">Updates from startups are available once your identity is verified.</p>
          <Link href="/profile" className="mt-4 inline-flex items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90">Go to profile</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Portfolio updates</h1>
      <p className="mt-1 text-sm text-cosmic/70">Updates from startups on StelarVest.</p>

      {updates.length === 0 ? (
        <Card className="mt-6"><p className="text-sm text-cosmic/70">No updates yet.</p></Card>
      ) : (
        <ul className="mt-6 space-y-4">
          {updates.map((u) => (
            <li key={u.id}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-lg font-semibold tracking-tight text-cosmic">{u.title}</p>
                  <span className="text-xs text-cosmic/60">{u.startupName} · {new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-cosmic/80">{u.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
