import {Code2,Palette,Database,TrendingUp,Globe,Workflow,type LucideIcon} from "lucide-react";
import { categoryRegistry, type CategoryId } from "@dorob/core";

type CategoryPresentation = { description: string; icon: LucideIcon; artwork: "code" | "design" | "data" | "business" | "language" | "workflow" };
const categoryPresentation: Record<CategoryId, CategoryPresentation> = {
  code: { description: "از اولین خط کد تا ساخت محصول", icon: Code2, artwork: "code" },
  design: { description: "رابط، تجربه‌ی کاربر و تصویر", icon: Palette, artwork: "design" },
  data: { description: "تحلیل داده و یادگیری ماشین", icon: Database, artwork: "data" },
  business: { description: "بازاریابی و رشد کسب‌وکار", icon: TrendingUp, artwork: "business" },
  language: { description: "مکالمه، نوشتن و ارتباط", icon: Globe, artwork: "language" },
  tools: { description: "اتوماسیون و مدیریت کارها", icon: Workflow, artwork: "workflow" },
};
export const categories = categoryRegistry.map(({ id, label }) => ({ id, name: label, ...categoryPresentation[id] }));
