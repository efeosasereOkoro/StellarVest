import { redirect } from "next/navigation";

// The old deal-based "portfolio" is superseded by the cohort contribution hub
// (B1). A real portfolio drill-down (portfolio → startups) arrives with B-054.
export default function PortfolioPage() {
  redirect("/contribute");
}
