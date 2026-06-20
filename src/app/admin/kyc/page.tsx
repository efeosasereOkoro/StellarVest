"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Doc = { id: string; filename: string; uploadedAt: string };
type Investor = { userId: string; fullName: string | null; kycStatus: string; documents: Doc[] };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function AdminKycPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [queue, setQueue] = useState<Investor[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      const res = await fetch("/api/admin/kyc", { headers: await authHeaders() });
      if (res.status === 403) {
        setState("forbidden");
        return;
      }
      const data = await res.json();
      setQueue(data.queue ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  async function viewDoc(id: string) {
    const res = await fetch(`/api/admin/kyc/document?id=${id}`, { headers: await authHeaders() });
    if (!res.ok) return;
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  }

  async function decide(userId: string, action: "verify" | "reject") {
    setBusy(userId);
    const res = await fetch("/api/admin/kyc", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ userId, action }),
    });
    setBusy(null);
    if (res.ok) setQueue((q) => q.filter((i) => i.userId !== userId));
  }

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
      <h1 className="font-display text-3xl font-semibold tracking-tight">KYC review</h1>
      <p className="mt-1 text-sm text-cosmic/60">
        Investors awaiting verification: <span className="font-medium text-cosmic">{queue.length}</span>
      </p>

      {queue.length === 0 ? (
        <Card className="mt-6 text-sm text-cosmic/60">Nothing to review right now. 🎉</Card>
      ) : (
        <div className="mt-6 space-y-4">
          {queue.map((inv) => (
            <Card key={inv.userId}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-cosmic">{inv.fullName ?? "(no name)"}</p>
                  <p className="text-xs text-cosmic/50">{inv.userId}</p>
                </div>
                <Badge tone="pitch">{inv.kycStatus}</Badge>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-cosmic/80">Documents</p>
                {inv.documents.length === 0 ? (
                  <p className="mt-1 text-sm text-cosmic/50">No documents uploaded.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {inv.documents.map((d) => (
                      <li key={d.id} className="flex items-center justify-between text-sm">
                        <span className="text-cosmic">{d.filename}</span>
                        <button onClick={() => viewDoc(d.id)} className="font-medium text-ignition underline">
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                <Button variant="accent" disabled={busy === inv.userId} onClick={() => decide(inv.userId, "verify")}>
                  {busy === inv.userId ? "…" : "Verify"}
                </Button>
                <Button variant="outline" disabled={busy === inv.userId} onClick={() => decide(inv.userId, "reject")}>
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
