"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Entry = {
  id: string;
  actorEmail: string | null;
  action: string;
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

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/audit", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) return setState("forbidden");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/50">Loading…</main>;
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Audit trail</h1>
        <Link href="/admin/kyc" className="text-sm font-medium text-cosmic underline">KYC review →</Link>
      </div>
      <p className="mt-1 text-sm text-cosmic/60">
        Append-only record of governance actions ({entries.length} most recent).
      </p>

      {entries.length === 0 ? (
        <Card className="mt-6 text-sm text-cosmic/60">No activity recorded yet.</Card>
      ) : (
        <ul className="mt-6 space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="!p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={TONE[e.action] ?? "neutral"}>{e.action}</Badge>
                  <span className="text-xs text-cosmic/50">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-cosmic/80">
                  <span className="font-medium text-cosmic">{e.actorEmail ?? "system"}</span>
                  {e.targetId ? <> → investor <span className="text-cosmic/60">{e.targetId.slice(0, 8)}…</span></> : null}
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
