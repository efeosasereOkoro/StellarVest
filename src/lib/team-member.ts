// Shared validation for a startup team member (B-048). Name, role, email and
// phone are required; LinkedIn is optional. The founder form validates the same
// rules client-side for inline field errors — this is the server-side backstop.

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

type MemberValues = { name: string; role: string; email: string; phone: string; linkedin: string | null };

export function validateMember(body: unknown): { error: string } | { values: MemberValues } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name);
  const role = str(b.role);
  const email = str(b.email);
  const phone = str(b.phone);

  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!role) missing.push("role");
  if (!email) missing.push("email");
  if (!phone) missing.push("phone");
  if (missing.length > 0) return { error: `Missing required field(s): ${missing.join(", ")}.` };

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email!)) return { error: "Enter a valid email address." };

  return { values: { name: name!, role: role!, email: email!, phone: phone!, linkedin: str(b.linkedin) } };
}
