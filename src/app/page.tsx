import Link from "next/link";

const STEPS = [
  { n: "1", t: "Create your account", d: "Sign up and verify your email in about a minute." },
  { n: "2", t: "Get verified", d: "Upload your ID; the StarSector8 team reviews it (KYC)." },
  { n: "3", t: "Join a cohort", d: "Your capital is pooled and deployed into vetted startups." },
];

const TRUST = [
  { t: "Identity verified", d: "Every investor completes KYC before participating." },
  { t: "Documents kept private", d: "IDs are held in access-controlled storage, never public." },
  { t: "Every action audited", d: "Governance decisions are written to a tamper-proof log." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-6 py-20">
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
      </section>

      <section className="border-t border-cosmic/10 bg-cosmic/[0.02]">
        <div className="mx-auto w-full max-w-3xl px-6 py-14">
          <h2 className="font-display text-2xl font-semibold">How it works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-cosmic/10 bg-pioneer p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-venture font-display font-semibold text-cosmic">
                  {s.n}
                </span>
                <p className="mt-3 font-medium text-cosmic">{s.t}</p>
                <p className="mt-1 text-sm text-cosmic/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-14">
        <h2 className="font-display text-2xl font-semibold">Built for trust</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {TRUST.map((t) => (
            <div key={t.t}>
              <p className="font-medium text-cosmic">{t.t}</p>
              <p className="mt-1 text-sm text-cosmic/70">{t.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-cosmic/70">
          Questions? <a href="mailto:support@starsector8.org" className="underline hover:text-cosmic">support@starsector8.org</a>
        </p>
      </section>
    </main>
  );
}
