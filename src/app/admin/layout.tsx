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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
      <aside className="border-b border-cosmic/10 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <nav className="flex gap-1 overflow-x-auto px-4 py-3 md:flex-col md:px-3 md:py-6">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, n.href) ? "bg-cosmic text-pioneer" : "text-cosmic hover:bg-cosmic/5"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
