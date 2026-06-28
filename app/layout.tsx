import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://megafx.vercel.app"),

  title: {
    default: "EUR/USD AI Analyst",
    template: "%s · EUR/USD AI Analyst",
  },

  description:
    "AI dashboard for EUR/USD market analysis with live signals, historical backtest, ATR targets, DXY context, and session-based filters.",

  keywords: [
    "EUR/USD",
    "EURUSD",
    "forex AI",
    "forex analysis",
    "AI trading dashboard",
    "market analysis",
    "DXY",
    "ATR",
  ],

  authors: [{ name: "Alexander Dev" }],
  creator: "Alexander Dev",

  openGraph: {
    title: "EUR/USD AI Analyst",
    description:
      "Live EUR/USD AI analysis dashboard with historical similarity model, DXY context, ATR targets, and backtest baseline.",
    url: "https://megafx.vercel.app",
    siteName: "EUR/USD AI Analyst",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "EUR/USD AI Analyst dashboard",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "EUR/USD AI Analyst",
    description:
      "Live EUR/USD AI analysis dashboard with historical similarity model and backtest baseline.",
    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "finance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
