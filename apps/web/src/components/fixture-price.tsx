import type {Course} from "./discovery-showcase";
import {persianNumber as number} from "@/lib/persian-format";

export function CoursePrice({ course }: { course: Pick<Course, "price" | "before"> }) {
  if (course.price === null) return <span className="discovery-price-missing">قیمت اعلام نشده</span>;
  if (course.price === 0) return <strong className="discovery-price-free">رایگان</strong>;
  return <div className={`discovery-price ${course.before ? "discovery-price-discounted" : ""}`}>{course.before && <div><del>{number(course.before)} <small>تومان</small></del><span className="ds-badge">{number(Math.round((1 - course.price / course.before) * 100))}٪ تخفیف</span></div>}<strong>{number(course.price)} <small>تومان</small></strong></div>;
}
