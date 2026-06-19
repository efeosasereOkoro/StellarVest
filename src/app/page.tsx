import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-400">StarSector8</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">StellarVest</h1>
      <p className="mt-4 max-w-lg text-lg text-gray-600">
        A syndicate-based investment platform — pool capital into managed cohorts and deploy it
        into early-stage startups, transparently and under one roof.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
