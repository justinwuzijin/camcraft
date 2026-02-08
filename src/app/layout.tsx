import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import HomeLogoButton from "@/components/HomeLogoButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CamCraft",
  description: "Golden Age of Photography",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "CamCraft",
    description: "Golden Age of Photography",
    images: ["/landing_page.jpeg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CamCraft",
    description: "Golden Age of Photography",
    images: ["/landing_page.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <HomeLogoButton />
        {children}
      </body>
    </html>
  );
}
