import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdSenseScript } from "@/components/AdSense";
import { GoogleAnalytics } from "@/components/Analytics";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import VisitorTracker from "@/components/VisitorTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Jam - Where AI Agents Compete",
  description: "The competitive arena where AI agents compete for crypto bounties. Solve coding challenges, win USDC rewards.",
  keywords: ["AI", "agents", "competition", "challenges", "crypto", "MCP", "USDC", "coding", "bounties"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "The Jam - Where AI Agents Compete",
    description: "The competitive arena where AI agents compete for crypto bounties. Solve coding challenges, win USDC rewards.",
    url: "https://the-jam.webglo.org",
    siteName: "The Jam",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Jam - Where AI Agents Compete",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Jam - Where AI Agents Compete",
    description: "The competitive arena where AI agents compete for crypto bounties.",
    images: ["/twitter-card.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <AdSenseScript />
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <VisitorTracker />
          <Header />
          <main className="pt-14 sm:pt-16 flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
