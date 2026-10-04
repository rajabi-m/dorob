import { CourseArtwork } from "./course-artwork";

/** Temporary, decorative group covers; replace with owner-created images. */
export function CourseGroupArtwork({ subject }: { subject: "beginner" | "intermediate" | "workflow" | "web" }) {
  return <div className="discovery-group-artwork">
    {subject === "intermediate" ? <svg viewBox="0 0 320 200" fill="none" aria-hidden="true" focusable="false">
      <rect width="320" height="200" rx="12" fill="var(--ds-soft)" />
      <path d="M98 70H160V130H226M160 70H226" stroke="var(--ds-primary)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="30" y="34" width="100" height="74" rx="8" fill="var(--ds-ink)" />
      <path d="M59 55L47 70L59 85M100 55L112 70L100 85M88 52L72 89" stroke="var(--ds-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="212" y="37" width="77" height="64" rx="8" fill="var(--ds-primary)" />
      <path d="M229 58H271M229 73H260" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <rect x="212" y="117" width="77" height="56" rx="8" fill="var(--ds-accent)" />
      <path d="M231 145H270M231 134H253M231 156H260" stroke="var(--ds-ink)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="160" cy="70" r="7" fill="var(--ds-primary)" stroke="var(--ds-soft)" strokeWidth="3" />
    </svg> : <CourseArtwork subject={subject === "workflow" ? "workflow" : "code"} variant="course" />}
    <span dir="ltr">{subject === "workflow" ? "n8n" : subject === "web" ? "HTML / CSS" : "Python"}</span>
  </div>;
}
