import Link from "next/link";

export const metadata = { title: "Terms · StellarVest" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-cosmic/70">Alpha draft — these terms will be finalised before launch.</p>

      <div className="mt-8 space-y-6 text-cosmic/80">
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">1. About StellarVest</h2>
          <p className="mt-2">
            StellarVest is a syndicate-based investment platform operated by StarSector8. It lets
            verified investors join cohorts whose capital is pooled and deployed into early-stage
            startups under StarSector8&apos;s governance.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">2. Eligibility &amp; accounts</h2>
          <p className="mt-2">
            You must provide accurate information and complete identity verification (KYC) before
            participating. You are responsible for keeping your account credentials secure.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">3. Verification &amp; funds</h2>
          <p className="mt-2">
            During the alpha, identity checks and the movement of funds are handled manually
            (a &quot;concierge&quot; model). StellarVest records these steps; it does not itself hold or
            move money.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">4. No investment advice</h2>
          <p className="mt-2">
            Information on the platform is not financial advice. Investing in early-stage startups
            carries significant risk, including the loss of your capital.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">5. Changes &amp; contact</h2>
          <p className="mt-2">
            We may update these terms as the platform evolves. Questions?{" "}
            <a href="mailto:support@starsector8.org" className="underline">support@starsector8.org</a>.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/" className="font-medium text-cosmic underline">← Back to home</Link>
      </p>
    </main>
  );
}
