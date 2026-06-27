"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Cta = { label: string; href: string } | null;

const KYC: Record<
  string,
  { tone: "venture" | "pitch" | "ignition" | "neutral"; title: string; body: string; cta: Cta }
> = {
  registered: {
    tone: "neutral",
    title: "Complete your profile",
    body: "Add your details and upload your ID to get verified and start investing.",
    cta: { label: "Complete profile", href: "/profile" },
  },
  submitted: {
    tone: "pitch",
    title: "Verification in progress",
    body: "Your documents are under review. Your status updates here once it's done — no need to do anything.",
    cta: { label: "View profile", href: "/profile" },
  },
  verified: {
    tone: "venture",
    title: "You're verified",
    body: "Your account is verified. Browse the latest investment opportunities.",
    cta: { label: "Browse deals", href: "/deals" },
  },
  rejected: {
    tone: "ignition",
    title: "Action needed",
    body: "Your verification didn't pass. See the reason on your profile and re-upload your documents.",
    cta: { label: "Review & re-upload", href: "/profile" },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loaded, setLoaded] = useState(false);
  const [kyc, setKyc] = useState("registered");

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/kyc", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const d = await res.json().catch(() => ({}));
          setKyc(d.kycStatus ?? "registered");
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [isPending, session, router]);

  if (isPending || !session || !loaded) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  const s = KYC[kyc] ?? KYC.registered;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-sm text-cosmic/70">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      <Card className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-cosmic">{s.title}</p>
              <Badge tone={s.tone}>{kyc}</Badge>
            </div>
            <p className="mt-1 text-sm text-cosmic/70">{s.body}</p>
          </div>
          {s.cta && (
            <Link
              href={s.cta.href}
              className="inline-flex w-full items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90 sm:w-auto"
            >
              {s.cta.label}
            </Link>
          )}
        </div>
      </Card>

      {kyc === "verified" && (
        <p className="mt-4 text-sm text-cosmic/70">
          Already pledged?{" "}
          <Link href="/portfolio" className="font-medium text-ignition-ink underline">View your contributions</Link>
          {" · "}
          <Link href="/updates" className="font-medium text-ignition-ink underline">Portfolio updates</Link>
        </p>
      )}

      <Card className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-cosmic">Raising capital?</p>
            <p className="mt-1 text-sm text-cosmic/70">List your startup to be considered for investment by StarSector8.</p>
          </div>
          <Link href="/founder" className="inline-flex w-full items-center justify-center rounded-lg border border-cosmic/15 px-4 py-2.5 text-sm font-medium text-cosmic hover:bg-cosmic/5 sm:w-auto">
            List your startup
          </Link>
        </div>
      </Card>
    </main>
  );
}
