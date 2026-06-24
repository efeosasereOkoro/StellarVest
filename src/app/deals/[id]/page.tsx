"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Deal = { id: string; startupName: string; description: string | null; publishedAt: string | null };
type Doc = { id: string; filename: string; uploadedAt: string };

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function InvestorDealPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "notfound" | "ready">("loading");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const res = await fetch(`/api/deals/${id}`, { headers: await authHeaders() });
      if (res.status === 403) return setState("forbidden");
      if (res.status === 404) return setState("notfound");
      const data = await res.json().catch(() => ({}));
      if (!data.deal) return setState("notfound");
      setDeal(data.deal);
      setDocs(data.documents ?? []);
      setState("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, id]);

  async function viewDoc(docId: string) {
    const res = await fetch(`/api/deals/document?id=${docId}`, { headers: await authHeaders() });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Get verified to view this deal</h1>
        <Link href="/profile" className="mt-3 inline-block font-medium text-ignition-ink underline">Go to profile</Link>
      </main>
    );
  }
  if (state === "notfound" || !deal) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Deal not available</h1>
        <Link href="/deals" className="mt-3 inline-block font-medium text-cosmic underline">&larr; All deals</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/deals" className="text-cosmic/60 underline">&larr; All deals</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{deal.startupName}</h1>
        <Badge tone="venture">Open</Badge>
      </div>
      {deal.description && <p className="mt-2 text-sm text-cosmic/70">{deal.description}</p>}

      {/* Deal Room — due-diligence documents */}
      <Card className="mt-6">
        <p className="font-medium text-cosmic">Deal Room</p>
        <p className="mt-1 text-sm text-cosmic/70">Due-diligence documents for this opportunity.</p>
        {docs.length === 0 ? (
          <p className="mt-3 text-sm text-cosmic/70">No documents have been shared yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cosmic">{d.filename}</span>
                <button onClick={() => viewDoc(d.id)} className="shrink-0 font-medium text-ignition-ink underline">View</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
