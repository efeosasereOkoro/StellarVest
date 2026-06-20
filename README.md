# StellarVest

Syndicate-based investment platform for **StarSector8** — investors are organised into cohorts
whose capital is pooled and deployed across startup cohorts, all under centralised governance.

This repository is the **MVP** web application. It is in **alpha** and under active development.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS v4** — design tokens from the Star Sector 8 brand guide
- **Neon** — serverless PostgreSQL, accessed with **Drizzle ORM**
- **Neon Auth** (powered by Better Auth) — authentication; JWTs verified server-side with **jose** (JWKS)
- **Vercel Blob** (private) — secure storage for KYC documents
- **Vercel** — hosting and auto-deploys

## What's built

- **Accounts & auth** — sign up, email verification (one-time code), login, logout, password reset.
- **Investor onboarding** — profile (name + KYC status) and **KYC document upload** to private storage.
- **Admin KYC review** — an allowlisted admin reviews a queue of submitted investors, views their
  documents, and verifies or rejects them (with an optional reason shown back to the investor).
- **Audit trail** — an append-only log of governance actions (submit / verify / reject), with an
  admin viewer.
- **Brand UI** — design system, responsive (mobile hamburger) navigation, and an alpha banner.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See [`.env.example`](.env.example). Required:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection (app runtime) |
| `DIRECT_URL` | Neon **direct** connection (migrations) |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Neon Auth base URL (client) — public |
| `NEON_AUTH_JWKS_URL` | Neon Auth JWKS (server-side JWT verification) — public |
| `ADMIN_EMAILS` | Comma-separated emails granted admin access |

KYC uploads use **Vercel Blob**: on Vercel this is provided via the connected Blob store (OIDC +
`BLOB_STORE_ID`); for local uploads set `BLOB_READ_WRITE_TOKEN`. The same variables must be set in
the Vercel project (Production).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:check` | Verify the Neon connection |
| `npm run db:generate` | Generate a migration from the Drizzle schema |
| `npm run db:migrate` | Apply migrations to the database |

## Database

The schema lives in [`src/db/schema.ts`](src/db/schema.ts); migrations are in `drizzle/`.
After changing the schema, run `npm run db:generate` then `npm run db:migrate`.

## Project structure

```
src/
  app/             Pages and API routes (App Router)
    api/           profile, kyc, admin/kyc, admin/audit, me
  components/      UI primitives, site header, alpha banner
  db/              Drizzle client + schema
  lib/             auth-client, auth-server (JWT/JWKS), audit
drizzle/           Generated SQL migrations
scripts/           db-check / migrate helpers
```

## MVP decisions

- **Manual ("concierge") KYC and escrow** — the platform records these steps; admins perform them by hand.
- **Many-to-many allocation** — one investor cohort can fund multiple startup cohorts and vice-versa.
- **Immutable audit trail** for governance and money actions.

Planning artifacts (decision log, backlog, epics & stories, architecture and storyboard diagrams)
live with the StarSector8 project docs. Work is tracked as GitHub issues — epics with story sub-issues.
