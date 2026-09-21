import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  description:
    "Principles — notice reality, change the machine, and learn what survives.",
  metadataBase: new URL("https://principles.me"),
  title: "Principles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
