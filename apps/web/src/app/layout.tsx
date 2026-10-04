import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: "دورُب — کشف و مقایسه‌ی دوره‌های آموزشی",
  description: "دورُب؛ کشف و مقایسه‌ی دوره‌های آموزشی برای انتخاب آگاهانه‌تر.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
