import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { startups, startupDocuments, startupUpdates, startupTeamMembers, founderProfiles } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

const EDITABLE = ["draft", "rejected", "queried"];

// Validate the profile body; returns field-keyed errors the client shows
// inline (same pattern as the team-member form — B-048).
function profileErrors(body: Record<string, unknown>): { errors: Record<string, string> } | { values: { name: string; description: string | null; website: string | null; stage: string | null } } {
  const errors: Record<string, string> = {};
  const name = String(body.name ?? "").trim();
  if (!name) errors.name = "Startup name is required.";
  if (Object.keys(errors).length) return { errors };
  return {
    values: {
      name,
      description: String(body.description ?? "").trim() || null,
      website: String(body.website ?? "").trim() || null,
      stage: String(body.stage ?? "").trim() || null,
    },
  };
}

async function requireUser(req: Request) {
  if (!req.headers.get("authorization")) return { error: "missing token" as const };
  const user = await getAuthUser(req);
  if (!user) return { error: "invalid token" as const };
  return { user };
}

// The founder's own startup (or null), with documents + updates.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

  const [startup] = await db.select().from(startups).where(eq(startups.founderUserId, auth.user.id));
  if (!startup) return NextResponse.json({ startup: null });

  const documents = await db
    .select({ id: startupDocuments.id, kind: startupDocuments.kind, filename: startupDocuments.filename, uploadedAt: startupDocuments.uploadedAt })
    .from(startupDocuments)
    .where(eq(startupDocuments.startupId, startup.id))
    .orderBy(desc(startupDocuments.uploadedAt));

  const updates = await db
    .select()
    .from(startupUpdates)
    .where(eq(startupUpdates.startupId, startup.id))
    .orderBy(desc(startupUpdates.createdAt));

  const team = await db
    .select()
    .from(startupTeamMembers)
    .where(eq(startupTeamMembers.startupId, startup.id))
    .orderBy(startupTeamMembers.createdAt);

  return NextResponse.json({ startup, documents, updates, team });
}

// Create the founder's startup (one per founder).
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

  const [existing] = await db.select({ id: startups.id }).from(startups).where(eq(startups.founderUserId, auth.user.id));
  if (existing) return NextResponse.json({ error: "You already have a startup." }, { status: 400 });

  // Founder profile comes first (B-065) — the person is identified before the venture.
  const [fp] = await db.select({ id: founderProfiles.id }).from(founderProfiles).where(eq(founderProfiles.userId, auth.user.id));
  if (!fp) return NextResponse.json({ error: "Complete your founder profile before creating your startup." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const checked = profileErrors(body);
  if ("errors" in checked) {
    return NextResponse.json({ error: "Some required details are missing.", fields: checked.errors }, { status: 400 });
  }

  const [startup] = await db
    .insert(startups)
    .values({
      founderUserId: auth.user.id,
      founderEmail: auth.user.email ?? null,
      ...checked.values,
    })
    .returning();

  await recordAudit({ actorId: auth.user.id, actorEmail: auth.user.email, action: "startup.created", targetType: "startup", targetId: startup.id });
  return NextResponse.json({ startup });
}

// Edit profile — only while editable (draft / rejected).
export async function PATCH(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

  const [startup] = await db.select().from(startups).where(eq(startups.founderUserId, auth.user.id));
  if (!startup) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!EDITABLE.includes(startup.status)) {
    return NextResponse.json({ error: "You can only edit while in draft or after a rejection." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const checked = profileErrors(body);
  if ("errors" in checked) {
    return NextResponse.json({ error: "Some required details are missing.", fields: checked.errors }, { status: 400 });
  }

  const [updated] = await db
    .update(startups)
    .set({ ...checked.values, updatedAt: new Date() })
    .where(eq(startups.id, startup.id))
    .returning();

  await recordAudit({ actorId: auth.user.id, actorEmail: auth.user.email, action: "startup.updated", targetType: "startup", targetId: startup.id });
  return NextResponse.json({ startup: updated });
}
