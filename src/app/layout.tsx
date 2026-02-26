import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryProvider } from "@/lib/query-client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Survivor Fantasy League",
  description:
    "Compete with friends in the ultimate Survivor Fantasy League experience. Draft teams, track scores, and dominate the leaderboard!",
  applicationName: "Survivor Fantasy League",
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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SFL" />
        <meta name="theme-color" content="#20B2AA" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider>
              <AuthProvider>{children}</AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
