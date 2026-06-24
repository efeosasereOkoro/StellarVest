"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";

type Deal = { id: string; startupName: string; description: string | null; publishedAt: string | null };

export default function DealsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "not_verified" | "ready">("loading");
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/deals", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 403) return setState("not_verified");
      const data = await res.json().catch(() => ({}));
      setDeals(data.deals ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  if (state === "not_verified") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Investment opportunities</h1>
        <Card className="mt-6">
          <p className="font-medium text-cosmic">Get verified to view deals</p>
          <p className="mt-1 text-sm text-cosmic/70">
            Investment opportunities open up once your identity is verified. Complete your profile and upload your ID to get started.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90"
          >
            Go to profile
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Investment opportunities</h1>
      <p className="mt-1 text-sm text-cosmic/70">Published deals open to verified investors.</p>

      {deals.length === 0 ? (
        <Card className="mt-6">
          <p className="font-medium text-cosmic">No open deals right now</p>
          <p className="mt-1 text-sm text-cosmic/70">
            There are no published opportunities at the moment. We&rsquo;ll let you know when a new deal opens.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 space-y-4">
          {deals.map((d) => (
            <li key={d.id}>
              <Link href={`/deals/${d.id}`} className="block">
                <Card className="transition hover:border-cosmic/25">
                  <p className="font-display text-xl font-semibold tracking-tight text-cosmic">{d.startupName}</p>
                  {d.description && <p className="mt-1 line-clamp-2 text-sm text-cosmic/70">{d.description}</p>}
                  <p className="mt-3 text-sm font-medium text-ignition-ink">View deal &rarr;</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
