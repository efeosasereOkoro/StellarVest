"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, getToken } from "@/lib/auth-client";
import { ADMIN_NAV, isAdminActive } from "@/lib/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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

  // While we don't know, or for non-admins, render the page alone — each page
  // handles its own login redirect / "Admins only" gate.
  if (isPending || isAdmin === null || !isAdmin) return <>{children}</>;

  // On mobile the admin sections live in the single header menu; here we only
  // render the persistent desktop sidebar (sm and up).
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col sm:flex-row">
      <aside className="hidden sm:block sm:w-56 sm:shrink-0 sm:border-r sm:border-cosmic/10">
        <nav className="flex flex-col gap-1 px-3 py-6">
          {ADMIN_NAV.map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isAdminActive(pathname, nav.href) ? "bg-cosmic text-pioneer" : "text-cosmic hover:bg-cosmic/5"
              }`}
            >
              {nav.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
