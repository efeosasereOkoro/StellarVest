"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/50">Loading…</main>;
  }
  if (!session) return null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-sm text-cosmic/60">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      <Card className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-cosmic">Get started</p>
            <p className="mt-1 text-sm text-cosmic/60">Complete your profile to begin investing.</p>
          </div>
          <Link
            href="/profile"
            className="inline-flex w-full items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90 sm:w-auto"
          >
            Complete profile
          </Link>
        </div>
      </Card>

      <p className="mt-6 text-sm text-cosmic/50">
        Next: KYC document upload for verification.
      </p>
    </main>
  );
}
