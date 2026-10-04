import type { Metadata } from "next";
import { Homepage } from "@/components/homepage";
import "./design-system/preview.css";
import "./home.css";

export const metadata: Metadata = {
  title: "دورُب — کشف و مقایسه‌ی دوره‌های آموزشی",
  description: "دوره‌های آموزشی را کشف کن، سرفصل‌ها و قیمت‌ها را کنار هم ببین و آگاهانه انتخاب کن. پیش‌نمایش دورُب با داده‌های نمونه.",
};

export default function Home() {
  return <Homepage heroVariant="discovery" />;
}
