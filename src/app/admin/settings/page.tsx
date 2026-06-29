"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [escrow, setEscrow] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const res = await fetch("/api/admin/settings", { headers: await authHeaders() });
      if (res.status === 403) return setState("forbidden");
      const data = await res.json().catch(() => ({}));
      setEscrow(data.escrowInstructions ?? "");
      setState("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ escrowInstructions: escrow }),
    });
    setBusy(false);
    if (res.ok) setSaved(true);
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-cosmic/70">Platform settings, including the escrow funding instructions investors see when they pledge.</p>

      <Card className="mt-6">
        <form onSubmit={save} className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-medium text-cosmic">Escrow funding instructions</span>
            <span className="mb-2 block text-sm text-cosmic/70">
              Shown to investors when they pledge. Include the escrow bank name, account name/number, SWIFT/routing, and any notes.
              Investors are told to quote their unique payment reference on the transfer.
            </span>
            <textarea
              value={escrow}
              onChange={(e) => { setEscrow(e.target.value); setSaved(false); }}
              rows={8}
              placeholder={"Bank: …\nAccount name: StarSector8 Escrow\nAccount number: …\nSWIFT/BIC: …\nQuote your payment reference shown on the deal page."}
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>Save</Button>
            {saved && <span className="text-sm text-venture">Saved ✓</span>}
          </div>
        </form>
      </Card>
    </main>
  );
}
