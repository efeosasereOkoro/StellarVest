import { db } from "@/db";
import { notifications } from "@/db/schema";

type NotifyInput = {
  userId?: string | null; // personal recipient
  role?: string | null; // role broadcast, e.g. "admin"
  type: string;
  title: string;
  body?: string;
  href?: string;
};

// Create a notification. Best-effort — a notification failure must never break
// the action that triggered it, so errors are swallowed.
export async function notify(n: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      recipientUserId: n.userId ?? null,
      recipientRole: n.role ?? null,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      href: n.href ?? null,
    });
  } catch {
    /* swallow */
  }
}

// Broadcast to the admin audience (covers committee for now — walkthrough-2).
export function notifyAdmins(n: Omit<NotifyInput, "userId" | "role">): Promise<void> {
  return notify({ ...n, role: "admin" });
}
