// Shared password policy for sign-up and reset (B-024). Kept deliberately
// usable: a sensible minimum, not an onerous symbol/case gauntlet.
export const PASSWORD_HINT = "At least 8 characters, including a letter and a number.";

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw)) return "Password must include a letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  return null;
}
