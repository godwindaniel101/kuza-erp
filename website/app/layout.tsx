import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ScrollFx from "@/components/ScrollFx";
import { LocaleProvider } from "@/lib/i18n";

/*
DIRECTION CONTRACT — Kuza marketing site
THESIS: The clean, conversion-first SaaS canon executed at the Bumpa/Paystack
craft bar — but where the category ships a floating dashboard screenshot, Kuza
proves its mechanism live: a WhatsApp DM becomes a structured order, stock,
ledger and books in one motion.
OWN-WORLD: Dashboard blue (#2563eb accent, #3b82f6 ring) + deep navy surfaces
(#0f1e46/#0a1533) on warm paper (#faf9f7); cool-slate neutrals; emerald for
semantic success only; Bricolage Grotesque display over Figtree body; real
African merchant photography; hand-built product-UI mockups with labeled demo
data. (Re-skinned from the earlier growth-green build; token names kept.)
STORY: A multi-branch owner sees their own operation — DM sales, counter
sales, branches, books — running on one truth, and starts the 14-day trial.
FIRST VIEWPORT: Split hero — headline + trial CTA left, animated DM→order→
ledger demo right; nav above, proof strip below the fold line.
FORM: User-pinned reference path (Bumpa-clean canon), superseding seed
54a3e2bb's assigned direction (sign-writer storefront, rank 3 of 7).
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md
*/

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const siteDescription =
  "One system of record for stock, sales, money and people across every branch — with AI agents that answer customers on WhatsApp and Instagram and turn conversations into orders. Built for African businesses.";

export const metadata: Metadata = {
  title: "Kuza — the AI operating system that runs your business and sells for you",
  description: siteDescription,
  openGraph: {
    title: "Kuza — runs your business and sells for you",
    description: siteDescription,
    siteName: "Kuza",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kuza" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kuza — runs your business and sells for you",
    description: siteDescription,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`}>
      {/* Grammarly & similar extensions inject attributes on <body> before React
          hydrates; suppress the resulting warning (this element's attributes only). */}
      <body suppressHydrationWarning>
        <LocaleProvider>
          <ScrollFx />
          <Nav />
          <main>{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
