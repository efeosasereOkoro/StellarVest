"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { naira, unitsLabel } from "@/lib/money";
import { SHOW_LOCK_IN_MESSAGE } from "@/lib/lockin";

type Contribution = {
  id: string;
  amount: string;
  currency: string;
  reference: string;
  status: "pledged" | "paid" | "confirmed" | "cancelled";
  createdAt: string;
};
type Cohort = { id: string; name: string };
type Data = {
  cohort: Cohort | null;
  contributions: Contribution[];
  escrowInstructions: string;
  totals: { confirmed: string; pending: string };
  residency: string | null;
  minimum: number;
  ownership: { units: number; poolUnits: number; pct: number };
  lockIn: { started: boolean; unlockDate: string | null; eligible: boolean; months: number };
};

const fmtUnits = (u: number) => {
  const s = Number.isInteger(u) ? String(u) : u.toFixed(2).replace(/\.?0+$/, "");
  return `${s} ${u === 1 ? "unit" : "units"}`;
};

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  pledged: { tone: "pitch", label: "Pledged" },
  paid: { tone: "pitch", label: "Awaiting confirmation" },
  confirmed: { tone: "venture", label: "Confirmed" },
  cancelled: { tone: "neutral", label: "Cancelled" },
};

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function ContributePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "unverified" | "ready">("loading");
  const [data, setData] = useState<Data | null>(null);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/contributions", { headers: await authHeaders() });
    if (res.status === 403) return setState("unverified");
    setData(await res.json().catch(() => null));
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) {
      setAmountError("Enter an amount of at least ₦1.");
      return;
    }
    if (data && n < data.minimum) {
      setAmountError(`The minimum contribution is ${naira(data.minimum)} (${unitsLabel(data.minimum)}).`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/contributions", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ amount: n }),
    });
    setBusy(false);
    if (res.ok) { setAmount(""); await load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't record your contribution.");
  }

  async function act(id: string, method: "PATCH" | "DELETE") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/contributions/${id}`, {
      method,
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: method === "PATCH" ? JSON.stringify({ action: "paid" }) : undefined,
    });
    setBusy(false);
    if (res.ok) await load();
    else setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  if (state === "unverified") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Contribute</h1>
        <Card className="mt-6">
          <p className="text-sm font-medium text-cosmic">Get verified first</p>
          <p className="mt-1 text-sm text-cosmic/70">You need to complete identity verification (KYC) before you can contribute.</p>
          <Link href="/profile" className="mt-3 inline-flex items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90">Complete verification</Link>
        </Card>
      </main>
    );
  }

  const hasPending = (data?.contributions ?? []).some((c) => c.status === "pledged" || c.status === "paid");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Contribute</h1>
      <p className="mt-1 text-sm text-cosmic/70">Add to your cohort&rsquo;s pool — StarSector8 deploys it across the cohort&rsquo;s portfolios.</p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {!data?.cohort ? (
        <Card className="mt-6">
          <p className="text-sm font-medium text-cosmic">You&rsquo;ll be placed in a cohort soon</p>
          <p className="mt-1 text-sm text-cosmic/70">
            You&rsquo;re verified — StarSector8 will assign you to an investment cohort. Once you&rsquo;re in one, you can contribute here.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <p className="text-sm text-cosmic/70">Your cohort</p>
            <p className="font-display text-xl font-semibold text-cosmic">{data.cohort.name}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-frontier/40 p-3">
                <p className="text-xs text-cosmic/60">Confirmed</p>
                <p className="font-display text-lg font-semibold text-cosmic">{naira(data.totals.confirmed)}</p>
                <p className="text-xs text-cosmic/60">{unitsLabel(data.totals.confirmed)}</p>
              </div>
              <div className="rounded-lg bg-pitch/40 p-3">
                <p className="text-xs text-cosmic/60">Pending</p>
                <p className="font-display text-lg font-semibold text-cosmic">{naira(data.totals.pending)}</p>
                <p className="text-xs text-cosmic/60">{unitsLabel(data.totals.pending)}</p>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <p className="font-medium text-cosmic">Your ownership</p>
            {data.ownership.units > 0 ? (
              <p className="mt-1 text-sm text-cosmic/70">
                You hold <span className="font-semibold text-cosmic">{fmtUnits(data.ownership.units)}</span> — <span className="font-semibold text-cosmic">{data.ownership.pct.toFixed(1)}%</span> of the {data.cohort.name} pool.
              </p>
            ) : (
              <p className="mt-1 text-sm text-cosmic/70">Once your contributions are confirmed, your unit holding and share of the cohort pool show here.</p>
            )}
            {SHOW_LOCK_IN_MESSAGE && (
              <p className="mt-2 text-sm text-cosmic/70">
                {!data.lockIn.started
                  ? `Direct startup investment unlocks ${data.lockIn.months} months after your first confirmed contribution.`
                  : data.lockIn.eligible
                    ? "You're now eligible to invest directly in a startup."
                    : `You'll be eligible to invest directly in a startup from ${new Date(data.lockIn.unlockDate!).toLocaleDateString()}.`}
              </p>
            )}
          </Card>

          <Card className="mt-4">
            <p className="font-medium text-cosmic">Make a contribution</p>
            <p className="mt-1 text-sm text-cosmic/70">
              Minimum <span className="font-medium text-cosmic">{naira(data.minimum)}</span> ({unitsLabel(data.minimum)})
              {data.residency === "diaspora" ? " for diaspora investors" : data.residency === "nigeria" ? " for Nigeria-based investors" : ""}.
            </p>
            {data.residency === "diaspora" && (
              <p className="mt-1 text-sm text-cosmic/70">
                Based abroad? You can fund this from your local currency — arrange the transfer with your bank. Contributions are recorded and held in naira.
              </p>
            )}
            <form onSubmit={contribute} className="mt-3 space-y-3">
              <div>
                <Field
                  label="Amount (₦)"
                  type="number" min={1} step="1" inputMode="decimal"
                  value={amount}
                  error={amountError ?? undefined}
                  onChange={(e) => { setAmount(e.target.value); setAmountError(null); }}
                />
                {amount && Number(amount) >= 1 && (
                  <p className="mt-1 text-xs text-cosmic/60">= {unitsLabel(amount)} (₦1,000 = 1 unit)</p>
                )}
              </div>
              <Button type="submit" disabled={busy}>Pledge contribution</Button>
            </form>
          </Card>

          {hasPending && (
            <Card className="mt-4 border-venture/40 bg-frontier/30">
              <p className="font-medium text-cosmic">How to fund</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-cosmic/80">
                {data.escrowInstructions?.trim()
                  ? data.escrowInstructions
                  : "Transfer your pledged amount to the StarSector8 escrow account quoting your reference below. Funding details will be shared with you."}
              </p>
              <p className="mt-2 text-sm text-cosmic/70">After sending, mark the contribution as paid below so we can reconcile it.</p>
            </Card>
          )}

          <Card className="mt-4">
            <p className="font-medium text-cosmic">Your contributions</p>
            {(data.contributions ?? []).length === 0 ? (
              <p className="mt-1 text-sm text-cosmic/70">No contributions yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-cosmic/10 border-t border-cosmic/10">
                {data.contributions.map((c) => {
                  const st = STATUS[c.status] ?? STATUS.pledged;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-cosmic">{naira(c.amount)} <span className="font-normal text-cosmic/50">· {unitsLabel(c.amount)}</span></p>
                        <p className="text-cosmic/60">Ref {c.reference} · {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {c.status === "pledged" && (
                          <>
                            <button onClick={() => act(c.id, "PATCH")} disabled={busy} className="font-medium text-ignition-ink underline">I&rsquo;ve sent the funds</button>
                            <button onClick={() => act(c.id, "DELETE")} disabled={busy} className="font-medium text-danger underline">Cancel</button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
