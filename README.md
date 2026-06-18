# StellarVest

Syndicate-based investment platform for **StarSector8** — investors are organised into cohorts whose
capital is pooled and deployed across startup cohorts, all under centralised governance.

This repository is the **MVP** web application.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Vercel** — hosting & deploys
- **Neon / Supabase** — PostgreSQL database (to be added)
- **Resend / Brevo** — transactional email (to be added)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project tracking

Work is tracked as GitHub issues — epics with story sub-issues. Planning artifacts (decision log,
backlog, epics & stories, architecture and storyboard diagrams) live with the StarSector8 project
docs.

### MVP scope highlights

- Manual ("concierge") **KYC** and **escrow** — the platform records these steps; admins perform them by hand.
- **Many-to-many allocation** — one investor cohort can fund multiple startup cohorts and vice-versa.
- **Immutable audit trail** for all governance and money actions.

## Status

🚧 Early development — currently **E0-S1: project scaffold**.
