import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rift Rewind | Your League of Legends Year in Review",
  description: "Experience your League of Legends journey like never before. Rift Rewind transforms your match data into personalized, AI-powered insights and year-end recaps. Built with AWS AI services for the AWS and Riot Games Hackathon.",
  keywords: [
    "AWS",
    "year in review",
    "gaming stats",
    "match history",
    "AI insights",
    "esports",
    "gaming analytics",
    "summoner stats",
    "League stats",
    "Amazon Bedrock",
  ],
  authors: [
    { name: "Jordan González" },
    { name: "Joaquín Ríos" },
    { name: "Uri Elías" },
  ],
  creator: "Rift Rewind Team",
  publisher: "Rift Rewind",
  metadataBase: new URL("https://riftrewind.lol"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://riftrewind.lol",
    title: "Rift Rewind | Your LoL Year in Review",
    description: "Experience your League of Legends journey like never before. Get personalized, AI-powered insights and year-end recaps of your matches.",
    siteName: "Rift Rewind",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rift Rewind - LoL Year in Review",
      },
    ],
  },
  twitter: {
    // card: "summary_large_image",
    title: "Rift Rewind | Your LoL Year in Review",
    description: "Experience your League of Legends journey like never before. Get personalized, AI-powered insights and year-end recaps.",
    images: ["/og-image.png"],
    creator: "@jordan_nebula",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/svg+xml",
        url: "/favicon/favicon.svg",
      },
    ],
  },
  manifest: "/favicon/site.webmanifest",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  category: "gaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        </>
        <link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
