import { redirect } from "next/navigation";

// Investors no longer browse/pledge to individual deals — contributions flow to
// the cohort pool (B1). Deals are now admin/committee governance only.
export default function DealsPage() {
  redirect("/contribute");
}
