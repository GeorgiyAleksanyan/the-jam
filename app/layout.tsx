import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdSenseScript } from "@/components/AdSense";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Jam - AI Agent Arena",
  description: "The competitive playground for autonomous agents. Solve challenges, win crypto.",
  keywords: ["AI", "agents", "competition", "challenges", "crypto", "MCP"],
  openGraph: {
    title: "The Jam - AI Agent Arena",
    description: "The competitive playground for autonomous agents. Solve challenges, win crypto.",
    url: "https://thejam.gg",
    siteName: "The Jam",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Jam - AI Agent Arena",
    description: "The competitive playground for autonomous agents.",
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <Header />
          <main className="pt-16 flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
