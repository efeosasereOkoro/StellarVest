// StellarVest landing — faithful implementation of the "StellarVest Landing"
// design (Claude Design export). A cosmic-dark hero with an animated starfield
// and orbital graphic, trust guarantees, a three-step how-it-works, a founders
// band, and a dark closing CTA. Ported to the app's brand tokens
// (venture/cosmic/ignition/frontier/pitch) and fonts (Funnel Display / Figtree).
//
// The landing carries its own dark nav + footer, so the global light chrome
// (SiteHeader / AlphaBanner / SiteFooter) is suppressed on "/" — see those
// components. decoration=on and glow=60% from the design are baked in.

const COSMIC = "#161616";

// Radial-gradient washes for the two dark sections.
const heroBg = {
  background:
    "radial-gradient(115% 90% at 82% 8%, rgba(16,42,67,.55), transparent 58%)," +
    "radial-gradient(90% 85% at 6% 105%, rgba(171,224,67,.10), transparent 55%)," +
    COSMIC,
};
const ctaBg = {
  background: "radial-gradient(90% 120% at 50% 0%, rgba(16,42,67,.5), transparent 60%)," + COSMIC,
};

// Two twinkling star layers for the hero.
const starLayer1 = {
  backgroundRepeat: "no-repeat",
  backgroundImage: [
    "radial-gradient(1.5px 1.5px at 12% 20%, #fff, transparent)",
    "radial-gradient(1.5px 1.5px at 44% 30%, #fff, transparent)",
    "radial-gradient(1px 1px at 78% 22%, #fff, transparent)",
    "radial-gradient(1.5px 1.5px at 88% 60%, rgba(255,255,255,.9), transparent)",
    "radial-gradient(1px 1px at 62% 74%, rgba(255,255,255,.75), transparent)",
    "radial-gradient(1.5px 1.5px at 52% 12%, rgba(171,224,67,.95), transparent)",
    "radial-gradient(1.5px 1.5px at 18% 80%, rgba(229,91,19,.9), transparent)",
  ].join(","),
};
const starLayer2 = {
  backgroundRepeat: "no-repeat",
  backgroundImage: [
    "radial-gradient(1px 1px at 28% 62%, rgba(255,255,255,.7), transparent)",
    "radial-gradient(1px 1px at 70% 40%, rgba(255,255,255,.7), transparent)",
    "radial-gradient(1px 1px at 33% 88%, rgba(255,255,255,.6), transparent)",
    "radial-gradient(1px 1px at 92% 34%, rgba(255,255,255,.6), transparent)",
    "radial-gradient(1px 1px at 8% 46%, rgba(255,255,255,.55), transparent)",
    "radial-gradient(1px 1px at 58% 54%, rgba(255,255,255,.5), transparent)",
  ].join(","),
};
const ctaStars = {
  backgroundRepeat: "no-repeat",
  backgroundImage: [
    "radial-gradient(1.5px 1.5px at 15% 30%, #fff, transparent)",
    "radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,.7), transparent)",
    "radial-gradient(1.5px 1.5px at 68% 26%, rgba(171,224,67,.9), transparent)",
    "radial-gradient(1px 1px at 85% 64%, #fff, transparent)",
    "radial-gradient(1px 1px at 55% 82%, rgba(255,255,255,.6), transparent)",
    "radial-gradient(1.5px 1.5px at 90% 34%, rgba(229,91,19,.85), transparent)",
  ].join(","),
};

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

const HERO_CUES = ["KYC-verified investors", "Funds held in escrow", "Every action audited"];

const TRUST = [
  {
    box: "bg-frontier text-deep-frontier",
    t: "Identity verified",
    d: "Every investor completes KYC before participating.",
    icon: (<><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></>),
  },
  {
    box: "bg-pitch text-deep-pitch",
    t: "Documents kept private",
    d: "IDs and diligence files sit in access-controlled storage — never public.",
    icon: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  },
  {
    box: "bg-ignition/15 text-ignition-ink",
    t: "Every action audited",
    d: "Governance decisions are written to a tamper-proof, append-only log.",
    icon: (<><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4h6v3H9z" /><path d="m9.5 13 2 2 3-3.5" /></>),
  },
  {
    box: "bg-frontier text-deep-frontier",
    t: "We never hold your money",
    d: "Funds move bank-to-bank through escrow; the platform only records the steps.",
    icon: (<><path d="M3 9 12 4l9 5" /><path d="M5 9v9M19 9v9M9.5 9v9M14.5 9v9" /><path d="M3 20h18" /></>),
  },
];

const STEPS = [
  { n: "1", t: "Create your account", d: "Sign up and verify your email in about a minute." },
  { n: "2", t: "Get verified", d: "Upload your ID; the StarSector8 team completes your KYC review." },
  { n: "3", t: "Join a cohort", d: "Your capital is pooled and deployed into vetted startups." },
];

export default function Home() {
  return (
    <main
      className="flex-1 overflow-x-hidden bg-pioneer text-cosmic"
      style={{ lineHeight: 1.6 }}
    >
      {/* ============ HERO (cosmic dark) ============ */}
      <section className="relative overflow-hidden text-pioneer" style={heroBg}>
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.6 }}>
          <div className="absolute -top-40 -right-16 h-[560px] w-[560px] rounded-full blur-[6px]" style={{ background: "radial-gradient(closest-side, rgba(171,224,67,.20), transparent 70%)" }} />
          <div className="absolute -bottom-52 -left-24 h-[620px] w-[620px] rounded-full blur-[6px]" style={{ background: "radial-gradient(closest-side, rgba(16,42,67,.60), transparent 70%)" }} />
          <div className="absolute left-[35%] top-[20%] h-[360px] w-[360px] rounded-full blur-[4px]" style={{ background: "radial-gradient(closest-side, rgba(229,91,19,.14), transparent 70%)" }} />
        </div>

        {/* starfield */}
        <div className="pointer-events-none absolute inset-0">
          <div className="sv-twinkle absolute inset-0" style={starLayer1} />
          <div className="sv-twinkle2 absolute inset-0" style={starLayer2} />
        </div>

        <div className="relative z-[2] mx-auto w-full max-w-[1180px] px-6">
          {/* alpha strip */}
          <div className="flex items-center gap-2.5 pt-4 text-[13px] text-pioneer/60">
            <span className="inline-flex items-center rounded-full bg-ignition px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-pioneer">
              Alpha
            </span>
            <span>New platform, in active development — features may change.</span>
          </div>

          {/* nav */}
          <nav className="flex items-center justify-between gap-4 pb-1.5 pt-4">
            <a href="/" className="font-display text-[22px] font-bold tracking-[-0.02em] text-pioneer">
              Stellar<span className="text-ignition">Vest</span>
            </a>
            <div className="flex items-center gap-2">
              <a href="/login" className="hidden items-center whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[15px] font-semibold text-pioneer/85 transition-colors hover:bg-white/10 sm:inline-flex">
                Sign in
              </a>
              <a href="/signup" className="inline-flex items-center whitespace-nowrap rounded-[10px] bg-venture px-[18px] py-2.5 text-[15px] font-semibold text-cosmic transition hover:brightness-95">
                Create account
              </a>
            </div>
          </nav>

          {/* hero grid */}
          <div className="flex flex-wrap items-center gap-10 pb-[clamp(56px,8vw,104px)] pt-[clamp(40px,7vw,84px)]">
            <div className="min-w-[300px] flex-[1_1_500px]">
              <p className="mb-5 font-display text-[13px] font-semibold uppercase tracking-[0.24em] text-venture">
                StarSector8 Syndicate
              </p>
              <h1
                className="font-display text-[clamp(2.7rem,6.2vw,4.6rem)] font-bold leading-[1.02] tracking-[-0.025em] text-pioneer"
                style={{ textWrap: "balance" }}
              >
                From day-zero ideas to <span className="text-venture">infinite success</span>.
              </h1>
              <p
                className="mt-[22px] max-w-[520px] text-[clamp(1.05rem,1.5vw,1.22rem)] text-pioneer/75"
                style={{ textWrap: "pretty" }}
              >
                Pool your capital into managed cohorts and deploy it into vetted early-stage startups —
                transparent, held in escrow, and audited end to end.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/signup" className="inline-flex items-center gap-2 whitespace-nowrap rounded-[11px] bg-venture px-7 py-[15px] text-[16px] font-semibold text-cosmic transition hover:brightness-95">
                  Start investing
                  <ArrowIcon />
                </a>
                <a href="/login" className="inline-flex items-center whitespace-nowrap rounded-[11px] border border-white/30 px-[26px] py-[15px] text-[16px] font-semibold text-pioneer transition-colors hover:bg-white/10">
                  Sign in
                </a>
              </div>

              <ul className="mt-[34px] flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0 text-[15px] font-medium text-pioneer/70">
                {HERO_CUES.map((c) => (
                  <li key={c} className="inline-flex items-center gap-2">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ABE043" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-11" />
                    </svg>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* orbital graphic — a companion to the headline on wide screens only;
                below lg it would stack into a tall block of empty space, so it's hidden */}
            <div className="hidden min-w-[280px] flex-[1_1_360px] justify-center lg:flex">
              <div className="sv-float relative aspect-square w-full max-w-[460px]">
                <svg viewBox="0 0 600 600" width="100%" height="100%" className="overflow-visible" style={{ filter: "drop-shadow(0 0 34px rgba(171,224,67,.14))" }}>
                  <circle cx="300" cy="300" r="90" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="1.4" />
                  <circle cx="300" cy="300" r="160" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1.4" />
                  <circle cx="300" cy="300" r="230" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1.4" />
                  <circle cx="300" cy="300" r="290" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1.4" />
                  <circle cx="300" cy="300" r="46" fill="rgba(171,224,67,.14)" />
                  <circle cx="300" cy="300" r="9" fill="#ABE043" />
                  <g className="sv-spin-slow">
                    <circle cx="378" cy="255" r="6" fill="#ABE043" />
                    <circle cx="150" cy="355" r="4" fill="rgba(255,255,255,.85)" />
                    <circle cx="476" cy="448" r="7" fill="#E55B13" />
                    <circle cx="340" cy="74" r="4" fill="rgba(255,255,255,.8)" />
                  </g>
                  <g className="sv-spin-slower">
                    <circle cx="70" cy="300" r="5" fill="rgba(255,255,255,.9)" />
                    <circle cx="530" cy="300" r="4" fill="#ABE043" />
                    <circle cx="300" cy="10" r="3" fill="rgba(229,91,19,.9)" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST ============ */}
      <section className="mx-auto w-full max-w-[1180px] px-6 pb-[clamp(48px,6vw,72px)] pt-[clamp(64px,9vw,120px)]">
        <div className="max-w-[640px]">
          <p className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-ignition-ink">
            Why StellarVest
          </p>
          <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold leading-[1.1] tracking-[-0.02em] text-cosmic">
            Trust, engineered in.
          </h2>
          <p className="mt-3.5 text-[1.05rem] text-cosmic/70" style={{ textWrap: "pretty" }}>
            Handling money and identity takes more than good intentions. These are guarantees, not
            promises — enforced by the platform itself.
          </p>
        </div>

        <div className="mt-11 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(288px,1fr))]">
          {TRUST.map((c) => (
            <div key={c.t} className="flex gap-[18px] rounded-[18px] border border-cosmic/10 bg-pioneer p-[26px] shadow-sm">
              <span className={`inline-flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[14px] ${c.box}`}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {c.icon}
                </svg>
              </span>
              <div>
                <p className="text-[1.08rem] font-semibold text-cosmic">{c.t}</p>
                <p className="mt-1.5 text-[1rem] text-cosmic/70">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-y border-cosmic/[0.08] bg-frontier/40">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-[clamp(64px,9vw,120px)]">
          <div className="max-w-[620px]">
            <p className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-ignition-ink">
              Getting started
            </p>
            <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold leading-[1.1] tracking-[-0.02em] text-cosmic">
              Your first investment, in three steps.
            </h2>
          </div>

          <div className="mt-11 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-[18px] border border-cosmic/10 bg-pioneer p-7 shadow-sm">
                <span className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full bg-venture font-display text-[20px] font-bold text-cosmic">
                  {s.n}
                </span>
                <p className="mt-5 text-[1.12rem] font-semibold text-cosmic">{s.t}</p>
                <p className="mt-2 text-[1rem] text-cosmic/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOUNDERS ============ */}
      <section className="mx-auto w-full max-w-[1180px] px-6 py-[clamp(56px,8vw,96px)]">
        <div className="relative overflow-hidden rounded-[24px] border border-cosmic/[0.08] bg-frontier/[0.55] p-[clamp(32px,5vw,52px)]">
          <div className="pointer-events-none absolute -top-20 -right-10 h-[280px] w-[280px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(171,224,67,.5), transparent 70%)" }} />
          <div className="relative flex flex-wrap items-center justify-between gap-7">
            <div className="min-w-[280px] flex-[1_1_440px]">
              <p className="mb-2.5 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-ignition-ink">
                For founders
              </p>
              <h2 className="font-display text-[clamp(1.7rem,3vw,2.3rem)] font-bold leading-[1.1] tracking-[-0.02em] text-cosmic">
                Raising capital?
              </h2>
              <p className="mt-3 max-w-[560px] text-[1.05rem] text-cosmic/[0.72]" style={{ textWrap: "pretty" }}>
                List your startup, share your pitch and due-diligence documents, and submit to be considered
                for investment by StarSector8 — through the same secure, audited platform.
              </p>
            </div>
            <a href="/signup" className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-[11px] bg-cosmic px-[26px] py-[15px] text-[16px] font-semibold text-pioneer transition-colors hover:bg-cosmic/90">
              List your startup
              <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ============ CLOSING CTA (cosmic dark) ============ */}
      <section className="relative overflow-hidden text-pioneer" style={ctaBg}>
        <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.6 }}>
          <div className="absolute -top-36 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full blur-[6px]" style={{ background: "radial-gradient(closest-side, rgba(171,224,67,.18), transparent 70%)" }} />
        </div>
        <div className="sv-twinkle-cta pointer-events-none absolute inset-0" style={ctaStars} />

        <div className="relative z-[2] mx-auto w-full max-w-[760px] px-6 py-[clamp(72px,10vw,128px)] text-center">
          <h2
            className="font-display text-[clamp(2rem,4.4vw,3.2rem)] font-bold leading-[1.06] tracking-[-0.025em] text-pioneer"
            style={{ textWrap: "balance" }}
          >
            Invest in the next generation of startups.
          </h2>
          <p className="mx-auto mt-[18px] max-w-[520px] text-[1.1rem] text-pitch/85" style={{ textWrap: "pretty" }}>
            Join StarSector8&rsquo;s syndicate — verified, governed, and transparent from day zero.
          </p>
          <div className="mt-[34px] flex flex-wrap justify-center gap-3">
            <a href="/signup" className="inline-flex items-center gap-2 whitespace-nowrap rounded-[11px] bg-venture px-[30px] py-4 text-[16px] font-semibold text-cosmic transition hover:brightness-95">
              Create an account
              <ArrowIcon />
            </a>
            <a href="/login" className="inline-flex items-center whitespace-nowrap rounded-[11px] border border-white/30 px-7 py-4 text-[16px] font-semibold text-pioneer transition-colors hover:bg-white/10">
              Sign in
            </a>
          </div>
          <p className="mt-8 text-[1rem] text-pitch/75">
            Questions?{" "}
            <a href="mailto:support@starsector8.org" className="font-semibold text-pioneer underline">
              support@starsector8.org
            </a>
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-cosmic/10 bg-pioneer">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-[15px] text-cosmic/70">
          <div className="flex items-center gap-3.5">
            <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-cosmic">
              Stellar<span className="text-ignition">Vest</span>
            </span>
            <span>© 2026 StarSector8 (Alpha)</span>
          </div>
          <nav className="flex flex-wrap gap-[22px]">
            <a href="/terms" className="underline hover:text-cosmic">Terms</a>
            <a href="/privacy" className="underline hover:text-cosmic">Privacy</a>
            <a href="mailto:support@starsector8.org" className="underline hover:text-cosmic">Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
