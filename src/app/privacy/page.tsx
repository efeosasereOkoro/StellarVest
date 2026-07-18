import Link from "next/link";

export const metadata = { title: "Privacy · StelarVest" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-cosmic/70">Alpha draft — this policy will be finalised before launch.</p>
      <p className="mt-1 text-sm text-cosmic/50">Last updated: 18 July 2026</p>

      <div className="mt-8 space-y-6 text-cosmic/80">
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">What we collect</h2>
          <p className="mt-2">
            Account details (name, email) and the identity information you provide for verification:
            if you live in Nigeria, your NIN and residential address; if you live outside Nigeria,
            your government ID type and number — plus the photographs and documents you upload. When
            you contribute, we record the amount and the payment reference for your transfer. If you
            list a startup as a founder, we collect your founder profile (full name, phone number,
            LinkedIn profile, and residential address), your identity-verification details and
            documents (ID type and number, photograph, government ID, and a utility bill as proof
            of address), your startup details, the
            documents you upload (pitch, due-diligence, and founder identity/KYC), and the team
            member details you provide (name, role, email, phone, LinkedIn) — make sure your team
            members are aware you&apos;re sharing these.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">How we use it</h2>
          <p className="mt-2">
            To create and secure your account, verify your identity (KYC), record and reconcile the
            contributions you make to your cohort, and — for founders — review startups submitted
            for investment. For approved startups, investors can see the startup&apos;s profile, the
            founder&apos;s name and LinkedIn, and team members&apos; names, roles, and LinkedIn profiles;
            phone numbers, emails, and addresses are never shown to investors. We don&apos;t sell your
            personal data.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">How it&apos;s stored</h2>
          <p className="mt-2">
            Your data is held in a managed database, and identity documents are kept in
            private, access-controlled storage — viewable only by authorised StarSector8 reviewers,
            with a traceable watermark applied when they&apos;re viewed. Every review action is
            recorded in an audit log. We use a small number of service providers to run the
            platform: Neon (database), Vercel (hosting and document storage), Brevo (transactional
            email), and Slack (operational alerts to the StarSector8 team — these can include your
            email address, contribution amounts, and payment references, but never your identity
            documents or ID numbers).
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">Your rights &amp; contact</h2>
          <p className="mt-2">
            You can request access to or deletion of your data. Contact{" "}
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
