import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://healthstory.ai"),
  title: {
    default: "HealthStory AI — Your health has a story",
    template: "%s · HealthStory AI",
  },
  description:
    "HealthStory AI transforms scattered symptoms, notes, health events and medical information into a clear, structured timeline you can understand and discuss with a healthcare professional.",
  keywords: [
    "health history timeline",
    "health journal AI",
    "symptom tracking",
    "health information organizer",
    "patient communication",
    "health-tech",
  ],
  authors: [{ name: "HealthStory AI" }],
  openGraph: {
    type: "website",
    title: "HealthStory AI — Your health has a story",
    description:
      "Scattered symptoms, notes, dates and results become one structured health timeline — organized for understanding and better conversations with healthcare professionals.",
    siteName: "HealthStory AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "HealthStory AI — Your health has a story",
    description:
      "Scattered health information becomes one structured, understandable story.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#faf9f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        {/*
          Progressive enhancement safety net.

          Entrance animations start from `opacity: 0`. Without JavaScript the
          IntersectionObserver never runs, so that state would never lift and
          the page would read as blank. These selectors use substring matching
          because the animation classes live in CSS Modules (hashed) — the
          stable, hashed prefix is stripped by matching on the readable part.
        */}
        <noscript>
          <style>{`
            [data-reveal] { opacity: 1 !important; transform: none !important; }
            [class*="dot"], [class*="event"], [class*="insightItem"],
            [class*="rail"], [class*="scatterChip"], [class*="orderedItem"],
            [class*="ordered"], [class*="aiNode"], [class*="flowDot"],
            [class*="flowLabel"], [class*="flowLine"], [class*="metricFill"],
            [class*="entry"] { opacity: 1 !important; transform: none !important; }
          `}</style>
        </noscript>
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}