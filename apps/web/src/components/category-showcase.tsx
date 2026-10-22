"use client";

import { useState } from "react";
import { CategoryGrid } from "./category-card";
import {categories} from "@/lib/category-presentation";

export function CategoryShowcase() {
  const [selected, setSelected] = useState("");
  return <section id="compact-categories" className="discovery-section" aria-labelledby="compact-categories-title">
    <div className="ds-section-head"><div><h3 id="compact-categories-title">کارت‌های فشرده‌ی دسته‌بندی</h3><p className="discovery-section-description">همان جزء استفاده‌شده در صفحه‌ی اصلی؛ انتخاب‌ها در این پیش‌نمایش مستقل‌اند.</p></div><button className="ds-compare" onClick={() => setSelected("")}>پاک کردن انتخاب</button></div>
    <CategoryGrid categories={categories} selectedId={selected} onSelect={id => setSelected(current => current === id ? "" : id)} />
    <p className="discovery-section-description" role="status">{selected ? `دسته‌ی انتخاب‌شده: ${categories.find(category => category.id === selected)?.name}` : "برای بررسی حالت انتخاب، یک دسته را انتخاب کن."}</p>
  </section>;
}
