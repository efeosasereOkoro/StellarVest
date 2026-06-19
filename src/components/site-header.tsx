"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  return (
    <header className="border-b border-cosmic/10 bg-pioneer">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-cosmic">
          Stellar<span className="text-ignition">Vest</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {isPending ? null : session ? (
            <>
              <Link href="/dashboard" className="rounded-lg px-3 py-2 font-medium hover:bg-cosmic/5">
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
                className="rounded-lg border border-cosmic/15 px-3 py-2 font-medium hover:bg-cosmic/5"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-cosmic/5">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-cosmic px-3 py-2 font-medium text-pioneer hover:bg-cosmic/90"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
