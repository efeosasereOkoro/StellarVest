"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut, getToken } from "@/lib/auth-client";
import { ADMIN_NAV, isAdminActive } from "@/lib/admin-nav";
import { NotificationBell } from "@/components/notification-bell";

const LINK = "rounded-lg px-3 py-2 font-medium hover:bg-cosmic/5";

// Compact line icons for the admin sections in the mobile menu.
function AdminIcon({ href }: { href: string }) {
  const paths: Record<string, React.ReactNode> = {
    "/admin": (<><path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /></>),
    "/admin/kyc": (<><circle cx="10" cy="8" r="3" /><path d="M4 19c0-3 2.7-5 6-5" /><path d="m14.5 14 2 2 3.5-3.5" /></>),
    "/admin/structures": (<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>),
    "/admin/deals": (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
    "/admin/updates": (<><path d="M4 5h16v11H7l-3 3z" /><path d="M8 9h8M8 12h5" /></>),
    "/admin/contributions": (<><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></>),
    "/admin/settings": (<><line x1="4" y1="8" x2="20" y2="8" /><circle cx="9" cy="8" r="2" /><line x1="4" y1="16" x2="20" y2="16" /><circle cx="15" cy="16" r="2" /></>),
    "/admin/audit": (<><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9.5 4h5v2.5h-5z" /><path d="m9 13.5 2 2 4-4" /></>),
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[href]}
    </svg>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      setRole(null);
      return;
    }
    let active = true;
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (active && res.ok) {
        const me = await res.json();
        setIsAdmin(!!me.isAdmin);
        setRole(me.role ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [session]);

  // Close the menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/login");
  }

  // Account/auth links — desktop bar, and the base of the mobile menu.
  function accountItems() {
    if (isPending) return null;
    if (session) {
      return (
        <>
          {isAdmin && (
            <Link href="/admin" className={LINK} onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
          {role === "founder" && (
            <Link href="/founder" className={LINK} onClick={() => setOpen(false)}>
              My startup
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

  // The landing page ("/") renders its own dark integrated nav, so the global
  // light header steps aside there.
  if (pathname === "/") return null;

  const inAdmin = !!session && isAdmin && pathname.startsWith("/admin");

  // The mobile sheet. In the admin area it carries the admin sections + an
  // Account zone, so there's a single menu instead of two competing hamburgers.
  function mobileMenu() {
    if (isPending) return null;
    if (!inAdmin) return <div className="flex flex-col gap-1">{accountItems()}</div>;
    return (
      <div className="flex flex-col gap-1">
        {ADMIN_NAV.map((nav) => {
          const active = isAdminActive(pathname, nav.href);
          return (
            <Link
              key={nav.href}
              href={nav.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium ${
                active ? "bg-cosmic text-pioneer" : "text-cosmic hover:bg-cosmic/5"
              }`}
            >
              <span className={active ? "text-pioneer" : "text-cosmic/50"}>
                <AdminIcon href={nav.href} />
              </span>
              {nav.label}
            </Link>
          );
        })}
        <div className="my-2 border-t border-cosmic/10" />
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-cosmic/50">Account</p>
        <div className="flex gap-1 rounded-lg bg-cosmic/5 p-1">
          <span className="flex-1 rounded-md bg-pioneer px-3 py-2 text-center font-semibold text-cosmic shadow-sm">Admin</span>
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex-1 rounded-md px-3 py-2 text-center font-medium text-cosmic/60 hover:text-cosmic">
            Dashboard
          </Link>
        </div>
        <button onClick={handleSignOut} className="mt-1 rounded-lg border border-cosmic/15 px-3 py-2 font-medium hover:bg-cosmic/5">
          Sign out
        </button>
      </div>
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

        <div className="flex items-center gap-1">
          {/* Notifications bell — signed-in users, desktop + mobile */}
          {!isPending && session && <NotificationBell />}

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 text-sm sm:flex">{accountItems()}</nav>

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
      </div>

      {/* Mobile dropdown — the single menu */}
      {open && (
        <nav className="border-t border-cosmic/10 px-4 py-3 text-sm sm:hidden">{mobileMenu()}</nav>
      )}
    </header>
  );
}
