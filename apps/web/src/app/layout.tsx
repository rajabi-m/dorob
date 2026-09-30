import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: "دورُب — شروع یک یادگیری بهتر",
  description: "دورُب؛ جایی برای کشف و مقایسه دوره‌های آموزشی. یک شروع تازه برای انتخاب آگاهانه‌تر.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
