"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; fullName: string; email: string; interest: string; createdAt: string };

const INTEREST_LABEL: Record<string, string> = { investor: "Investor", founder: "Founder", both: "Both" };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function AdminWaitlistPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      const res = await fetch("/api/admin/waitlist", { headers: await authHeaders() });
      if (res.status === 403) return setState("forbidden");
      const data = await res.json().catch(() => ({}));
      setRows(data.waitlist ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
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
      <h1 className="font-display text-3xl font-semibold tracking-tight">Waitlist</h1>
      <p className="mt-1 text-sm text-cosmic/70">People waiting for pre-launch access.</p>
      <p className="mt-1 text-sm text-cosmic/60">
        On the list: <span className="font-medium text-cosmic">{rows.length}</span>
      </p>

      {rows.length === 0 ? (
        <Card className="mt-6 text-sm text-cosmic/60">No one on the waitlist yet.</Card>
      ) : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cosmic/10 text-xs uppercase tracking-wide text-cosmic/50">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Interest</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-cosmic/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-cosmic">{r.fullName}</td>
                  <td className="px-4 py-3 text-cosmic/80">
                    <a href={`mailto:${r.email}`} className="text-ignition-ink underline">{r.email}</a>
                  </td>
                  <td className="px-4 py-3"><Badge tone="pitch">{INTEREST_LABEL[r.interest] ?? r.interest}</Badge></td>
                  <td className="px-4 py-3 text-cosmic/60">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
