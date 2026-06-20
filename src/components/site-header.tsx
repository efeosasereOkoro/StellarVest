"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut, getToken } from "@/lib/auth-client";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (active && res.ok) {
        const data = await res.json();
        setIsAdmin(!!data.isAdmin);
      }
    })();
    return () => {
      active = false;
    };
  }, [session]);

  return (
    <header className="border-b border-cosmic/10 bg-pioneer">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-cosmic">
          Stellar<span className="text-ignition">Vest</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {isPending ? null : session ? (
            <>
              {isAdmin && (
                <Link href="/admin/kyc" className="rounded-lg px-3 py-2 font-medium hover:bg-cosmic/5">
                  Admin
                </Link>
              )}
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
