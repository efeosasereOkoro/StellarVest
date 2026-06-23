import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-cosmic/10 bg-pioneer">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-cosmic/70 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 StarSector8 — StellarVest (Alpha)</p>
        <nav className="flex flex-wrap gap-5">
          <Link href="/terms" className="underline hover:text-cosmic">Terms</Link>
          <Link href="/privacy" className="underline hover:text-cosmic">Privacy</Link>
          <a href="mailto:support@starsector8.org" className="underline hover:text-cosmic">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
