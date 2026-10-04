import type { CourseGroup } from "./course-group-card";
import { providerHomepageCourses, type HomepageCourse } from "./provider-homepage-data";

// Editorial topic groups drawn from the same dated snapshots as the homepage.
// Wider course scope and provider-reported levels remain visible on each offering.
const definitions: (Omit<CourseGroup, "courseCount"> & {
  artwork: "beginner" | "web" | "workflow";
  courseIds: string[];
})[] = [
  {
    id: "python-beginner", title: "پایتون مقدماتی",
    description: "یادگیری مبانی پایتون با تمرین و پروژه‌های عملی",
    level: "مقدماتی", artwork: "beginner",
    courseIds: ["toplearn-7ed1a6e4bb4d", "toplearn-fa4cc5c2826a", "quera-12547"],
  },
  {
    id: "html-css", title: "طراحی وب با HTML و CSS",
    description: "ساخت صفحات وب؛ با تفاوت در سطح و پوشش جاوااسکریپت",
    level: "سطوح مختلف", artwork: "web",
    courseIds: ["maktabkhooneh-mk8902", "toplearn-81651d228742", "quera-16809"],
  },
  {
    id: "n8n", title: "اتوماسیون کارها با n8n",
    description: "ساخت گردش‌کارهای خودکار؛ از اتصال ابزارها تا عامل‌های هوشمند",
    level: "مقدماتی تا پیشرفته", artwork: "workflow",
    courseIds: ["maktabkhooneh-mk11887", "quera-23458"],
  },
];

export const groupCourses: Record<string, HomepageCourse[]> = Object.fromEntries(
  definitions.map(group => [group.id, providerHomepageCourses.filter(course => group.courseIds.includes(course.id))]),
);

// Counts and destinations share membership; singleton groups never appear.
export const homeGroups = definitions
  .filter(group => groupCourses[group.id].length >= 2)
  .map(({ courseIds, ...group }) => {
    void courseIds;
    return { ...group, courseCount: groupCourses[group.id].length };
  });
