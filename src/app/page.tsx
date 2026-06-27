import Link from "next/link";

const STEPS = [
  { n: "1", t: "Create your account", d: "Sign up and verify your email in about a minute." },
  { n: "2", t: "Get verified", d: "Upload your ID; the StarSector8 team reviews it (KYC)." },
  { n: "3", t: "Join a cohort", d: "Your capital is pooled and deployed into vetted startups." },
];

// Trust signals — built from real platform guarantees, not marketing fluff.
const TRUST = [
  {
    t: "Identity verified",
    d: "Every investor completes KYC before participating.",
    bg: "bg-frontier",
    fg: "text-deep-frontier",
    icon: (<><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></>),
  },
  {
    t: "Documents kept private",
    d: "IDs and diligence files sit in access-controlled storage — never public.",
    bg: "bg-pitch",
    fg: "text-deep-pitch",
    icon: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  },
  {
    t: "Every action audited",
    d: "Governance decisions are written to a tamper-proof, append-only log.",
    bg: "bg-ignition/15",
    fg: "text-ignition-ink",
    icon: (<><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4h6v3H9z" /><path d="m9.5 13 2 2 3-3.5" /></>),
  },
  {
    t: "We never hold your money",
    d: "Funds move bank-to-bank through escrow; the platform only records the steps.",
    bg: "bg-frontier",
    fg: "text-deep-frontier",
    icon: (<><path d="M3 9 12 4l9 5" /><path d="M5 9v9M19 9v9M9.5 9v9M14.5 9v9" /><path d="M3 20h18" /></>),
  },
];

function TrustIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      {children}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="border-b border-cosmic/10 bg-frontier/30">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-ignition-ink">StarSector8</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-cosmic sm:text-6xl">
            From day-zero ideas to{" "}
            <span className="rounded-lg bg-venture/60 px-2 decoration-clone box-decoration-clone">infinite success</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-cosmic/70">
            StellarVest pools investor capital into managed cohorts and deploys it into early-stage startups —
            transparently, securely, and under one roof.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-cosmic px-5 py-2.5 text-sm font-medium text-pioneer transition-colors hover:bg-cosmic/90">
              Create an account
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-cosmic/20 bg-pioneer px-5 py-2.5 text-sm font-medium transition-colors hover:bg-cosmic/5">
              Sign in
            </Link>
          </div>
          {/* quick trust cues */}
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-cosmic/70">
            {["KYC-verified investors", "Funds held in escrow", "Every action audited"].map((c) => (
              <li key={c} className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ignition-ink"><path d="m5 12 5 5 9-11" /></svg>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Built for trust — the credibility section, up front */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">Built for trust</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-cosmic/70">
          Handling money and identity demands more than good intentions. These are guarantees, not promises.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {TRUST.map((t) => (
            <div key={t.t} className="flex gap-4 rounded-2xl border border-cosmic/10 bg-pioneer p-5 shadow-sm">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.fg}`}>
                <TrustIcon>{t.icon}</TrustIcon>
              </span>
              <div>
                <p className="font-medium text-cosmic">{t.t}</p>
                <p className="mt-1 text-sm text-cosmic/70">{t.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-cosmic/10 bg-pitch/30">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-cosmic/10 bg-pioneer p-6 shadow-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-venture font-display text-lg font-bold text-cosmic">
                  {s.n}
                </span>
                <p className="mt-4 font-medium text-cosmic">{s.t}</p>
                <p className="mt-1 text-sm text-cosmic/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For founders */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="overflow-hidden rounded-2xl border border-cosmic/10 bg-frontier/40 p-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ignition-ink">For founders</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-cosmic">Raising capital?</h2>
            <p className="mt-2 max-w-xl text-sm text-cosmic/70">
              List your startup, share your pitch and due-diligence documents, and submit to be considered for
              investment by StarSector8 — through the same secure, audited platform.
            </p>
          </div>
          <Link href="/signup" className="mt-5 inline-flex shrink-0 items-center justify-center rounded-lg bg-cosmic px-5 py-2.5 text-sm font-medium text-pioneer transition-colors hover:bg-cosmic/90 sm:mt-0">
            List your startup
          </Link>
        </div>
      </section>

      {/* Closing CTA — dark band for a confident finish */}
      <section className="bg-deep-pitch">
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-pioneer sm:text-3xl">
            Invest in the next generation of startups.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-pitch">
            Join StarSector8&rsquo;s syndicate — verified, governed, and transparent from day zero.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-venture px-6 py-3 text-sm font-semibold text-cosmic transition hover:brightness-95">
              Create an account
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-pioneer/25 px-6 py-3 text-sm font-medium text-pioneer transition hover:bg-pioneer/10">
              Sign in
            </Link>
          </div>
          <p className="mt-8 text-sm text-pitch/80">
            Questions? <a href="mailto:support@starsector8.org" className="font-medium text-pioneer underline">support@starsector8.org</a>
          </p>
        </div>
      </section>
    </main>
  );
}
