// Drizzle schema — database tables live here.
// Tables are added as we build each story.

import { pgTable, pgEnum, uuid, text, integer, jsonb, timestamp, unique } from "drizzle-orm/pg-core";

// KYC lifecycle for an investor (manual review in the MVP — see DECISIONS D-003).
export const kycStatus = pgEnum("kyc_status", [
  "registered",
  "submitted",
  "verified",
  "rejected",
]);

// One profile per authenticated user (Neon Auth / Better Auth user id).
export const investorProfiles = pgTable("investor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  // The Neon Auth user this profile belongs to (Better Auth user id).
  userId: text("user_id").notNull().unique(),
  fullName: text("full_name"),
  kycStatus: kycStatus("kyc_status").notNull().default("registered"),
  kycRejectionReason: text("kyc_rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Uploaded KYC documents (files stored privately in Vercel Blob; we keep metadata here).
export const kycDocuments = pgTable("kyc_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  pathname: text("pathname").notNull(), // Blob pathname (used to fetch/sign later)
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only audit trail. The app never updates or deletes these rows.
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(), // e.g. "kyc.verified", "kyc.rejected", "kyc.submitted"
  targetType: text("target_type"), // e.g. "investor"
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InvestorProfile = typeof investorProfiles.$inferSelect;
export type NewInvestorProfile = typeof investorProfiles.$inferInsert;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;

// ---- Investment structures (E3) ----

// Top-level structure managed by StarSector8.
export const syndicates = pgTable("syndicates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A group of investors under a syndicate.
export const investorCohorts = pgTable("investor_cohorts", {
  id: uuid("id").defaultRandom().primaryKey(),
  syndicateId: uuid("syndicate_id").notNull().references(() => syndicates.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One pool per investor cohort; aggregates that cohort's confirmed contributions.
export const investmentPools = pgTable("investment_pools", {
  id: uuid("id").defaultRandom().primaryKey(),
  investorCohortId: uuid("investor_cohort_id").notNull().unique().references(() => investorCohorts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A group of startups that pooled capital is deployed into.
export const startupCohorts = pgTable("startup_cohorts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Verified investors assigned to an investor cohort.
export const cohortMembers = pgTable(
  "cohort_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    investorCohortId: uuid("investor_cohort_id").notNull().references(() => investorCohorts.id),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.investorCohortId, t.userId)],
);

// Allocation of a pool to a startup cohort, as a percentage (many-to-many).
export const allocations = pgTable(
  "allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    poolId: uuid("pool_id").notNull().references(() => investmentPools.id),
    startupCohortId: uuid("startup_cohort_id").notNull().references(() => startupCohorts.id),
    percentage: integer("percentage").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.poolId, t.startupCohortId)],
);

export type Syndicate = typeof syndicates.$inferSelect;
export type InvestorCohort = typeof investorCohorts.$inferSelect;
export type StartupCohort = typeof startupCohorts.$inferSelect;
export type Allocation = typeof allocations.$inferSelect;
