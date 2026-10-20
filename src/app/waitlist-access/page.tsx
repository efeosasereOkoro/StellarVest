"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  fullName: string;
  email: string;
  interest: string;
  location: string | null;
  whatsapp: string | null;
  createdAt: string;
};
const INTEREST_LABEL: Record<string, string> = { investor: "Investing", founder: "Building", both: "Both" };

// Password-gated waitlist view for the PM (B-078). No account needed. The
// password is verified server-side at /api/waitlist/view; rows only come back
// on the correct password.
export default function WaitlistAccessPage() {
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/waitlist/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.status === 401) {
      setError("Incorrect password.");
      return;
    }
    if (!res.ok) {
      setError("Could not load the waitlist right now. Please try again shortly.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setRows(data.waitlist ?? []);
  }

  // Download the list as a CSV (opens in Excel). Re-uses the same password.
  async function onExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/waitlist/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stelvest-waitlist.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (rows) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Waitlist</h1>
            <p className="mt-1 text-sm text-cosmic/70">
              People waiting for pre-launch access. On the list:{" "}
              <span className="font-medium text-cosmic">{rows.length}</span>
            </p>
          </div>
          {rows.length > 0 && (
            <Button type="button" onClick={onExport} disabled={exporting} variant="outline">
              {exporting ? "Preparing…" : "Export to Excel"}
            </Button>
          )}
        </div>

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
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
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
                    <td className="px-4 py-3 text-cosmic/80">{r.location || "-"}</td>
                    <td className="px-4 py-3 text-cosmic/80">{r.whatsapp || "-"}</td>
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

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Waitlist access</h1>
      <p className="mt-1 text-sm text-cosmic/70">Enter the password to view the waitlist.</p>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Password"
            type="password"
            value={password}
            error={error ?? undefined}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Checking…" : "View waitlist"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
