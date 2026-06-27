import Link from "next/link";

export const metadata = { title: "Privacy · StellarVest" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-cosmic/70">Alpha draft — this policy will be finalised before launch.</p>

      <div className="mt-8 space-y-6 text-cosmic/80">
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">What we collect</h2>
          <p className="mt-2">
            Account details (name, email), the identity documents you upload for verification, and —
            when you back a deal — your contribution amount and the payment reference for your transfer.
            If you list a startup as a founder, we also collect your startup details and the documents
            you upload (pitch, due-diligence, and founder identity/KYC).
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">How we use it</h2>
          <p className="mt-2">
            To create and secure your account, verify your identity (KYC), record and reconcile the
            contributions you make to deals, and — for founders — review startups submitted for
            investment. We don&apos;t sell your personal data.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-cosmic">How it&apos;s stored</h2>
          <p className="mt-2">
            Your data is held in a managed database, and identity documents are kept in
            private, access-controlled storage — viewable only by authorised StarSector8 reviewers.
            Every review action is recorded in an audit log.
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
