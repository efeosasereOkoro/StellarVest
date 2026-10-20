import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { waitlistSignups } from "@/db/schema";
import { INTERESTS } from "@/lib/waitlist-options";

// CSV export of the waitlist for the PM (#115). Same shared password as the
// view (/api/waitlist/view). CSV opens directly in Excel; a UTF-8 BOM is added
// so accented names render correctly.
const PASSWORD = process.env.WAITLIST_PASSWORD || "123456";

const INTEREST_LABEL: Record<string, string> = Object.fromEntries(
  INTERESTS.map((i) => [i.value, i.label]),
);

// Quote every field and double any embedded quotes, so commas, quotes and
// newlines inside a value never break the row.
function cell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (String(body.password ?? "") !== PASSWORD) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const rows = await db
    .select({
      fullName: waitlistSignups.fullName,
      email: waitlistSignups.email,
      interest: waitlistSignups.interest,
      location: waitlistSignups.location,
      whatsapp: waitlistSignups.whatsapp,
      createdAt: waitlistSignups.createdAt,
    })
    .from(waitlistSignups)
    .orderBy(desc(waitlistSignups.createdAt));

  const header = ["Name", "Email", "Interest", "Location", "WhatsApp", "Joined"];
  const lines = [header.map(cell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        cell(r.fullName),
        cell(r.email),
        cell(INTEREST_LABEL[r.interest] ?? r.interest),
        cell(r.location ?? ""),
        cell(r.whatsapp ?? ""),
        cell(r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : ""),
      ].join(","),
    );
  }

  // \r\n line endings and a BOM are the combination Excel is happiest with.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stelvest-waitlist-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
