// Admin section navigation — shared by the desktop sidebar (admin layout) and
// the mobile menu (site header), so there's a single source of truth.
export const ADMIN_NAV = [
  { href: "/admin", label: "Home" },
  { href: "/admin/kyc", label: "KYC review" },
  { href: "/admin/structures", label: "Structures" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/startups", label: "Startups" },
  { href: "/admin/contributions", label: "Contributions" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit" },
];

export function isAdminActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}
