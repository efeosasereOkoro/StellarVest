"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Startup = { id: string; name: string; status: string; founderEmail: string | null };

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  submitted: { tone: "pitch", label: "Submitted" },
  under_review: { tone: "pitch", label: "Under review" },
  approved: { tone: "venture", label: "Approved" },
  rejected: { tone: "ignition", label: "Rejected" },
};

export default function AdminStartupsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [startups, setStartups] = useState<Startup[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/startups", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 403) return setState("forbidden");
      const data = await res.json().catch(() => ({}));
      setStartups(data.startups ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }

  const awaiting = startups.filter((s) => s.status === "submitted" || s.status === "under_review").length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Founder submissions</h1>
      <p className="mt-1 text-sm text-cosmic/70">{awaiting > 0 ? `${awaiting} awaiting review` : "Nothing awaiting review"} · {startups.length} total</p>

      <div className="mt-6 space-y-3">
        {startups.length === 0 && <p className="text-cosmic/70">No startups yet.</p>}
        {startups.map((s) => {
          const st = STATUS[s.status] ?? STATUS.draft;
          return (
            <Link key={s.id} href={`/admin/startups/${s.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 transition-colors hover:border-cosmic/25">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-cosmic">{s.name}</span>
                  <span className="block truncate text-sm text-cosmic/60">{s.founderEmail ?? "—"}</span>
                </span>
                <Badge tone={st.tone} className="shrink-0">{st.label}</Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
