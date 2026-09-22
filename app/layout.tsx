import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/features/i18n/config";
import { LocaleProvider } from "@/features/i18n/locale";
import "./globals.css";

export const metadata: Metadata = {
  description:
    "Principles — nhìn thẳng vào thực tế, cải thiện cách vận hành và chắt lọc nguyên tắc từ trải nghiệm.",
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
