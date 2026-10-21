import {createGroupClient} from "@/lib/group-api";
import type { Metadata } from "next";
import { Homepage } from "@/components/homepage";
import "./design-system/preview.css";
import "./home.css";
import { createCourseClient } from "@/lib/course-api";
import { parseCourseQuery } from "@dorob/core";

export const metadata: Metadata = {
  title: "دورُب — کشف و مقایسه‌ی دوره‌های آموزشی",
  description: "دوره‌های آموزشی را کشف کن، سرفصل‌ها و قیمت‌ها را کنار هم ببین و آگاهانه انتخاب کن.",
};

export default function Home() {
  return <Homepage featuredGroup={createGroupClient().detail("python-starting-programming",{limit:3,offset:0})} heroVariant="discovery" realGroups={createGroupClient().list({limit:3,offset:0})} realCourses={createCourseClient().list(parseCourseQuery(new URLSearchParams()))} />;
}
