/** Fixed editorial categories. Presentation and server dependencies stay in their apps. */
export const categoryRegistry = [
  { id: "code", label: "برنامه‌نویسی" },
  { id: "design", label: "طراحی" },
  { id: "data", label: "داده و هوش مصنوعی" },
  { id: "business", label: "کسب‌وکار" },
  { id: "language", label: "زبان‌های خارجی" },
  { id: "tools", label: "ابزار و بهره‌وری" },
] as const;
export type CategoryId = typeof categoryRegistry[number]["id"];
export const targetLevels = ["beginner", "intermediate", "advanced", "mixed"] as const;
export type TargetLevel = typeof targetLevels[number];
