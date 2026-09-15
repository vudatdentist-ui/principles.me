import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CurrentActionReadability } from "./current-action-readability";
import "./globals.css";
import "./readability.css";

export const metadata: Metadata = {
  description:
    "Principles — notice reality, change the machine, and learn what survives.",
  metadataBase: new URL("https://principles.me"),
  title: "Principles",
};

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${geist.variable} ${geistMono.variable}`} lang="en">
      <body>
        <CurrentActionReadability />
        {children}
      </body>
    </html>
  );
}
