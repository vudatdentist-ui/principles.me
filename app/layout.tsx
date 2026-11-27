import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/features/i18n/config";
import { LocaleProvider } from "@/features/i18n/locale";
import "./globals.css";

export const metadata: Metadata = {
  description:
    "Tập trước cuộc đối thoại, thử một cách trả lời khác và áp dụng những điều đã đọc.",
  metadataBase: new URL("https://principles.me"),
  title: "Principles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
