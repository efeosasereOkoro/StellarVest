"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, getToken } from "@/lib/auth-client";

const NAV = [
  { href: "/admin", label: "Home" },
  { href: "/admin/kyc", label: "KYC review" },
  { href: "/admin/structures", label: "Structures" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/contributions", label: "Contributions" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

const linkClass = (active: boolean) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? "bg-cosmic text-pioneer" : "text-cosmic hover:bg-cosmic/5"
  }`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
      if (active) setIsAdmin(res.ok ? !!(await res.json()).isAdmin : false);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // While we don't know, or for non-admins, render the page alone — each page
  // handles its own login redirect / "Admins only" gate.
  if (isPending || isAdmin === null || !isAdmin) return <>{children}</>;

  const current = NAV.find((nav) => isActive(pathname, nav.href))?.label ?? "Admin";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
      {/* Mobile: a bar showing the current section + a hamburger that opens a sheet */}
      <div className="relative md:hidden">
        <div className="flex items-center justify-between border-b border-cosmic/10 px-4 py-3">
          <span className="text-sm font-medium text-cosmic">{current}</span>
          <button
            type="button"
            aria-label="Admin menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-cosmic/15 bg-cosmic/5 hover:bg-cosmic/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
        </div>
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-cosmic/30" onClick={() => setOpen(false)} aria-hidden />
            <nav className="absolute inset-x-3 z-50 mt-1 space-y-1 rounded-2xl border border-cosmic/10 bg-pioneer p-2 shadow-xl">
              {NAV.map((nav) => (
                <Link key={nav.href} href={nav.href} className={linkClass(isActive(pathname, nav.href))}>
                  {nav.label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Desktop: persistent sidebar */}
      <aside className="hidden md:block md:w-56 md:shrink-0 md:border-r md:border-cosmic/10">
        <nav className="flex flex-col gap-1 px-3 py-6">
          {NAV.map((nav) => (
            <Link key={nav.href} href={nav.href} className={linkClass(isActive(pathname, nav.href))}>
              {nav.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
