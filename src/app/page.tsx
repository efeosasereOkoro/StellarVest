import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-ignition-ink">
          StarSector8
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-cosmic sm:text-6xl">
          From day-zero ideas to <span className="text-venture">infinite success</span>.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-cosmic/70">
          StellarVest pools investor capital into managed cohorts and deploys it into
          early-stage startups — transparently, and under one roof.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-cosmic px-5 py-2.5 text-sm font-medium text-pioneer transition-colors hover:bg-cosmic/90"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-cosmic/15 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-cosmic/5"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
