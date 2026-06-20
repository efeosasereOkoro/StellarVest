"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut, getToken } from "@/lib/auth-client";

const LINK = "rounded-lg px-3 py-2 font-medium hover:bg-cosmic/5";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (active && res.ok) setIsAdmin(!!(await res.json()).isAdmin);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/login");
  }

  // The nav items, reused in the desktop bar and the mobile dropdown.
  function items() {
    if (isPending) return null;
    if (session) {
      return (
        <>
          {isAdmin && (
            <Link href="/admin/kyc" className={LINK} onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
          <Link href="/dashboard" className={LINK} onClick={() => setOpen(false)}>
            Dashboard
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-cosmic/15 px-3 py-2 text-left font-medium hover:bg-cosmic/5"
          >
            Sign out
          </button>
        </>
      );
    }
    return (
      <>
        <Link href="/login" className={LINK} onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-cosmic px-3 py-2 text-center font-medium text-pioneer hover:bg-cosmic/90"
          onClick={() => setOpen(false)}
        >
          Create account
        </Link>
      </>
    );
  }

  return (
    <header className="border-b border-cosmic/10 bg-pioneer">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-cosmic"
          onClick={() => setOpen(false)}
        >
          Stellar<span className="text-ignition">Vest</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 text-sm sm:flex">{items()}</nav>

        {/* Mobile toggle */}
        {!isPending && (
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 hover:bg-cosmic/5 sm:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-cosmic/10 px-6 py-3 text-sm sm:hidden">
          {items()}
        </nav>
      )}
    </header>
  );
}
