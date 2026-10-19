"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; fullName: string; email: string; interest: string; createdAt: string };
const INTEREST_LABEL: Record<string, string> = { investor: "Investor", founder: "Founder", both: "Both" };

// Password-gated waitlist view for the PM (B-078). No account needed. The
// password is verified server-side at /api/waitlist/view; rows only come back
// on the correct password.
export default function WaitlistAccessPage() {
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!res.ok) {
      setError("Incorrect password.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setRows(data.waitlist ?? []);
  }

  if (rows) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Waitlist</h1>
        <p className="mt-1 text-sm text-cosmic/70">
          People waiting for pre-launch access. On the list:{" "}
          <span className="font-medium text-cosmic">{rows.length}</span>
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
