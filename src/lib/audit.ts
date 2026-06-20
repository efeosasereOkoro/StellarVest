import { db } from "@/db";
import { auditLog } from "@/db/schema";

type AuditInput = {
  actorId?: string;
  actorEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

// Append a row to the immutable audit trail. Never throws — a logging failure
// must not break the action it records (the failure is surfaced in server logs).
export async function recordAudit(entry: AuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error("audit log write failed:", err);
  }
}
