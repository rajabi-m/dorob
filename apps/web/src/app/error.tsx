"use client";
export default function Error({ reset }: { reset: () => void }) {
  return <main className="home-container home-section"><h1>نمایش اطلاعات انجام نشد</h1><p role="alert">کمی بعد دوباره تلاش کن.</p><button className="ds-button" onClick={reset}>تلاش دوباره</button></main>;
}
