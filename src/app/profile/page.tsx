"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Profile = { fullName: string | null; kycStatus: string };

const KYC_TONE: Record<string, "venture" | "pitch" | "ignition" | "neutral"> = {
  verified: "venture",
  submitted: "pitch",
  registered: "neutral",
  rejected: "ignition",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [loaded, setLoaded] = useState(false);
  const [fullName, setFullName] = useState("");
  const [kyc, setKyc] = useState("registered");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const { profile } = (await res.json()) as { profile: Profile | null };
          if (profile) {
            setFullName(profile.fullName ?? "");
            setKyc(profile.kycStatus ?? "registered");
          }
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [isPending, session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const token = await getToken();
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ fullName }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save your profile. Please try again.");
      return;
    }
    const { profile } = (await res.json()) as { profile: Profile };
    setKyc(profile.kycStatus ?? "registered");
    setSaved(true);
  }

  if (isPending || !session || !loaded) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/50">Loading…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-1 text-sm text-cosmic/60">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      <Card className="mt-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-medium text-cosmic">KYC status</span>
          <Badge tone={KYC_TONE[kyc] ?? "neutral"}>{kyc}</Badge>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Full name"
            type="text"
            value={fullName}
            required
            onChange={(e) => setFullName(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {saved && <p className="text-sm text-deep-frontier">Saved.</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-cosmic/50">
        Next: upload your KYC documents for verification.
      </p>
    </main>
  );
}
