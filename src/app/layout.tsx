import type { Metadata } from "next";
import { Funnel_Display, Figtree } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AlphaBanner } from "@/components/alpha-banner";
import { SiteFooter } from "@/components/site-footer";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StellarVest",
  description: "Syndicate-based investment platform for StarSector8.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${funnelDisplay.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-pioneer text-cosmic">
        <SiteHeader />
        <AlphaBanner />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
