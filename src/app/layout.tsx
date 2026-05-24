import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Schibsted_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { QueryProvider } from "@/lib/query-client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const fontBody = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Survivor Fantasy League",
  description:
    "Compete with friends in the ultimate Survivor Fantasy League experience. Draft teams, track scores, and dominate the leaderboard!",
  applicationName: "Survivor Fantasy League",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SFL",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Survivor Fantasy League",
    title: "Survivor Fantasy League",
    description:
      "Draft teams, track scores, and compete with friends in Survivor fantasy leagues",
  },
  twitter: {
    card: "summary_large_image",
    title: "Survivor Fantasy League",
    description:
      "Draft teams, track scores, and compete with friends in Survivor fantasy leagues",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#20B2AA" },
    { media: "(prefers-color-scheme: dark)", color: "#20B2AA" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="cream"
      data-cards="shadow"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SFL" />
        <meta name="theme-color" content="#20B2AA" />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider>
              <AuthProvider>
                {children}
                <FeedbackWidget />
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
