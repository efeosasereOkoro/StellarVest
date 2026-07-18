"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocViewer } from "@/components/doc-viewer";
import { DOC_KIND_LABEL, ID_TYPES } from "@/lib/kyc";

type Doc = { id: string; kind: string | null; filename: string; uploadedAt: string };
type Investor = {
  userId: string;
  fullName: string | null;
  kycStatus: string;
  residency: string | null;
  nin: string | null;
  residentialAddress: string | null;
  idType: string | null;
  idNumber: string | null;
  documents: Doc[];
};

type Founder = {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string;
  linkedin: string;
  residentialAddress: string | null;
  idType: string | null;
  idNumber: string | null;
  startupName: string | null;
  documents: Doc[];
};

const idTypeLabel = (v: string | null) => ID_TYPES.find((t) => t.value === v)?.label ?? v ?? "—";
// One decision at a time, across both queues (investors + founders — B-074).
type Pending = { userId: string; action: "verify" | "reject"; scope: "investor" | "founder" };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function AdminKycPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [queue, setQueue] = useState<Investor[]>([]);
  const [founderQueue, setFounderQueue] = useState<Founder[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ id: string; filename: string; watermark: string } | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      const headers = await authHeaders();
      const [res, fRes] = await Promise.all([
        fetch("/api/admin/kyc", { headers }),
        fetch("/api/admin/founders", { headers }),
      ]);
      if (res.status === 403) return setState("forbidden");
      const data = await res.json().catch(() => ({}));
      const fData = await fRes.json().catch(() => ({}));
      setQueue(data.queue ?? []);
      setFounderQueue(fData.queue ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  function viewDoc(id: string, filename: string) {
    setViewing({ id, filename, watermark: `${session?.user?.email ?? "reviewer"} · ${new Date().toLocaleString()}` });
  }

  function start(userId: string, action: "verify" | "reject", scope: "investor" | "founder" = "investor") {
    setPending({ userId, action, scope });
    setReason("");
    setActionError(null);
  }

  async function confirmDecide() {
    if (!pending) return;
    setBusy(true);
    const endpoint = pending.scope === "founder" ? "/api/admin/founders" : "/api/admin/kyc";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        userId: pending.userId,
        action: pending.action,
        reason: pending.action === "reject" ? reason : undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      if (pending.scope === "founder") setFounderQueue((q) => q.filter((i) => i.userId !== pending.userId));
      else setQueue((q) => q.filter((i) => i.userId !== pending.userId));
      setPending(null);
      setReason("");
    } else {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Couldn't complete that action.");
    }
  }

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
      <h1 className="font-display text-3xl font-semibold tracking-tight">KYC review</h1>
      <p className="mt-1 text-sm text-cosmic/70">Review identity documents for investors and founders — verify or reject with a reason.</p>
      <p className="mt-1 text-sm text-cosmic/60">
        Awaiting verification: <span className="font-medium text-cosmic">{queue.length}</span> investor{queue.length === 1 ? "" : "s"} · <span className="font-medium text-cosmic">{founderQueue.length}</span> founder{founderQueue.length === 1 ? "" : "s"}
      </p>

      <h2 className="mt-8 font-display text-xl font-semibold text-cosmic">Investor verification</h2>
      {queue.length === 0 ? (
        <Card className="mt-4 text-sm text-cosmic/60">No investor verifications waiting. 🎉</Card>
      ) : (
        <div className="mt-4 space-y-4">
          {queue.map((inv) => {
            const isPendingRow = pending?.userId === inv.userId;
            return (
              <Card key={inv.userId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-cosmic">{inv.fullName ?? "(no name)"}</p>
                    <p className="truncate text-xs text-cosmic/70">{inv.userId}</p>
                  </div>
                  <Badge tone="pitch" className="shrink-0">{inv.kycStatus}</Badge>
                </div>

                {/* Captured KYC details */}
                <div className="mt-4 rounded-lg bg-cosmic/[0.03] p-3 text-sm">
                  <p className="font-medium text-cosmic/80">Details</p>
                  <dl className="mt-1 space-y-0.5 text-cosmic/70">
                    <div className="flex gap-2"><dt className="text-cosmic/50">Based in:</dt><dd>{inv.residency === "nigeria" ? "Nigeria" : inv.residency === "diaspora" ? "Diaspora (outside Nigeria)" : "—"}</dd></div>
                    {inv.residency === "nigeria" ? (
                      <>
                        <div className="flex gap-2"><dt className="text-cosmic/50">NIN:</dt><dd>{inv.nin ?? "—"}</dd></div>
                        <div className="flex gap-2"><dt className="text-cosmic/50">Address:</dt><dd>{inv.residentialAddress ?? "—"}</dd></div>
                      </>
                    ) : inv.residency === "diaspora" ? (
                      <div className="flex gap-2"><dt className="text-cosmic/50">{idTypeLabel(inv.idType)}:</dt><dd>{inv.idNumber ?? "—"}</dd></div>
                    ) : null}
                  </dl>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-cosmic/80">Documents</p>
                  {inv.documents.length === 0 ? (
                    <p className="mt-1 text-sm text-cosmic/70">No documents uploaded.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {inv.documents.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-cosmic">
                            {d.kind && <span className="text-cosmic/60">{DOC_KIND_LABEL[d.kind] ?? d.kind}: </span>}
                            {d.filename}
                          </span>
                          <button onClick={() => viewDoc(d.id, d.filename)} className="shrink-0 font-medium text-ignition-ink underline">
                            View
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {isPendingRow ? (
                  <div className="mt-5 rounded-lg border border-cosmic/10 bg-cosmic/[0.03] p-4">
                    {pending!.action === "reject" && (
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection (required) — shown to the investor"
                        rows={2}
                        className="mb-3 w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
                      />
                    )}
                    <p className="mb-3 text-sm text-cosmic">
                      {pending!.action === "verify" ? "Verify this investor?" : "Reject this investor?"}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant={pending!.action === "verify" ? "accent" : "primary"}
                        disabled={busy || (pending!.action === "reject" && !reason.trim())}
                        onClick={confirmDecide}
                        className="flex-1 sm:flex-none"
                      >
                        {busy ? "…" : pending!.action === "verify" ? "Confirm verify" : "Confirm reject"}
                      </Button>
                      <Button variant="outline" disabled={busy} onClick={() => setPending(null)} className="flex-1 sm:flex-none">
                        Cancel
                      </Button>
                    </div>
                    {actionError && <p className="mt-3 text-sm text-danger">{actionError}</p>}
                  </div>
                ) : (
                  <div className="mt-5 flex gap-3">
                    <Button variant="accent" className="flex-1 sm:flex-none" onClick={() => start(inv.userId, "verify")}>Verify</Button>
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => start(inv.userId, "reject")}>Reject</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Founder identity verification queue (B-074, D-019). */}
      <h2 className="mt-10 font-display text-xl font-semibold text-cosmic">Founder verification</h2>
      {founderQueue.length === 0 ? (
        <Card className="mt-4 text-sm text-cosmic/60">No founder verifications waiting. 🎉</Card>
      ) : (
        <div className="mt-4 space-y-4">
          {founderQueue.map((f) => {
            const isPendingRow = pending?.userId === f.userId && pending?.scope === "founder";
            return (
              <Card key={f.userId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-cosmic">{f.fullName}</p>
                    <p className="truncate text-xs text-cosmic/70">{f.email ?? f.userId}{f.startupName ? ` · ${f.startupName}` : ""}</p>
                  </div>
                  <Badge tone="pitch" className="shrink-0">submitted</Badge>
                </div>

                <div className="mt-4 rounded-lg bg-cosmic/[0.03] p-3 text-sm">
                  <p className="font-medium text-cosmic/80">Details</p>
                  <dl className="mt-1 space-y-0.5 text-cosmic/70">
                    <div className="flex gap-2"><dt className="text-cosmic/50">Phone:</dt><dd>{f.phone}</dd></div>
                    <div className="flex gap-2"><dt className="text-cosmic/50">LinkedIn:</dt><dd><a href={f.linkedin.startsWith("http") ? f.linkedin : `https://${f.linkedin}`} target="_blank" rel="noreferrer" className="break-all text-ignition-ink underline">{f.linkedin}</a></dd></div>
                    {f.residentialAddress && <div className="flex gap-2"><dt className="text-cosmic/50">Address:</dt><dd>{f.residentialAddress}</dd></div>}
                    <div className="flex gap-2"><dt className="text-cosmic/50">{idTypeLabel(f.idType)}:</dt><dd>{f.idNumber ?? "—"}</dd></div>
                  </dl>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-cosmic/80">Documents</p>
                  {f.documents.length === 0 ? (
                    <p className="mt-1 text-sm text-cosmic/70">No documents uploaded.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {f.documents.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-cosmic">
                            {d.kind && <span className="text-cosmic/60">{DOC_KIND_LABEL[d.kind] ?? d.kind}: </span>}
                            {d.filename}
                          </span>
                          <button onClick={() => viewDoc(d.id, d.filename)} className="shrink-0 font-medium text-ignition-ink underline">
                            View
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {isPendingRow ? (
                  <div className="mt-5 rounded-lg border border-cosmic/10 bg-cosmic/[0.03] p-4">
                    {pending!.action === "reject" && (
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection (required) — shown to the founder"
                        rows={2}
                        className="mb-3 w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
                      />
                    )}
                    <p className="mb-3 text-sm text-cosmic">
                      {pending!.action === "verify" ? "Verify this founder?" : "Reject this founder?"}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant={pending!.action === "verify" ? "accent" : "primary"}
                        disabled={busy || (pending!.action === "reject" && !reason.trim())}
                        onClick={confirmDecide}
                        className="flex-1 sm:flex-none"
                      >
                        {busy ? "…" : pending!.action === "verify" ? "Confirm verify" : "Confirm reject"}
                      </Button>
                      <Button variant="outline" disabled={busy} onClick={() => setPending(null)} className="flex-1 sm:flex-none">
                        Cancel
                      </Button>
                    </div>
                    {actionError && <p className="mt-3 text-sm text-danger">{actionError}</p>}
                  </div>
                ) : (
                  <div className="mt-5 flex gap-3">
                    <Button variant="accent" className="flex-1 sm:flex-none" onClick={() => start(f.userId, "verify", "founder")}>Verify</Button>
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => start(f.userId, "reject", "founder")}>Reject</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <DocViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.filename ?? ""}
        watermark={viewing?.watermark ?? ""}
        docKey={viewing?.id ?? null}
        loadBlob={async () => {
          if (!viewing) return null;
          const res = await fetch(`/api/admin/kyc/document?id=${viewing.id}`, { headers: await authHeaders() });
          return res.ok ? res.blob() : null;
        }}
      />
    </main>
  );
}
