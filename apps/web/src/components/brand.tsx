export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 72" fill="none" aria-hidden="true">
      <path d="M15 31c-7 12 1 28 17 32 16-4 24-20 17-32" fill="currentColor" />
      <path d="M32 18 7 28l25 11 25-11-25-10Z" fill="currentColor" />
      <path d="M19 37v9c8 6 18 6 26 0v-9" stroke="var(--surface, #fff)" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 30v15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 15c1-7 6-10 12-10-1 7-5 10-12 10Z" fill="currentColor" />
      <path d="M29 17c-7 0-11-4-12-10 7-1 11 3 12 10Z" fill="currentColor" opacity=".55" />
      <path d="M32 61v6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="دورُب، صفحه نخست">
      <BrandMark className="brand-mark" />
      <span>دورُب<span className="brand-caption">کشف کن. مقایسه کن. یاد بگیر.</span></span>
    </Link>
  );
}
import Link from "next/link";
