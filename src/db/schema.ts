// Drizzle schema — database tables live here.
// Tables are added as we build each story.

import { pgTable, pgEnum, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

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
