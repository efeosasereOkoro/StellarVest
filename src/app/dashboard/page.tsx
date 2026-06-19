"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</main>;
  }
  if (!session) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Welcome to StellarVest</h1>
      <p className="mt-2 text-sm text-gray-600">
        Signed in as <span className="font-medium">{session.user.email}</span>
      </p>
      <p className="mt-1 text-sm text-gray-500">
        This is your account home. Investor onboarding (profile &amp; verification) comes next.
      </p>
      <button
        onClick={async () => {
          await signOut();
          router.push("/login");
        }}
        className="mt-6 w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Sign out
      </button>
    </main>
  );
}
