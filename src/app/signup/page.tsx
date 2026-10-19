import { redirect } from "next/navigation";

// Self-signup is paused during pre-launch (B-077, D-022). New people join the
// waitlist instead; existing users still sign in at /login. To reopen signup,
// restore the previous signup form from git history.
export default function SignUpPage() {
  redirect("/waitlist");
}
