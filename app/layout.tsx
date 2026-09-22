import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseLocale,
} from "@/features/i18n/config";
import { LocaleProvider } from "@/features/i18n/locale";
import "./globals.css";

export const metadata: Metadata = {
  description:
    "Principles — nhìn thẳng vào thực tế, cải thiện cách vận hành và chắt lọc nguyên tắc từ trải nghiệm.",
  metadataBase: new URL("https://principles.me"),
  title: "Principles",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale =
    parseLocale(cookieStore.get(LOCALE_COOKIE)?.value) ?? DEFAULT_LOCALE;

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
