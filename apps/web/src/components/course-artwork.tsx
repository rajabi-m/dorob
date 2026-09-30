type ArtworkSubject = "code" | "design" | "data" | "workflow";

/** Decorative sample artwork; titles and course facts remain in accessible text. */
export function CourseArtwork({ subject, variant = "category" }: { subject: ArtworkSubject; variant?: "category" | "course" }) {
  return (
    <svg className={`discovery-artwork discovery-artwork-${subject} discovery-artwork-${variant}`} viewBox="0 0 320 200" fill="none" aria-hidden="true" focusable="false">
      <rect width="320" height="200" rx="12" fill="var(--art-surface)" />
      <circle cx="265" cy="42" r="58" fill="var(--art-wash)" />
      <circle cx="40" cy="190" r="65" fill="var(--art-wash)" />
      {subject === "code" && <>
        <rect x="48" y="37" width="222" height="137" rx="10" fill="var(--ds-ink)" />
        <path d="M48 63H270" stroke="#ffffff30" />
        <circle cx="63" cy="50" r="3" fill="var(--ds-accent)" /><circle cx="75" cy="50" r="3" fill="#92b5da" />
        <path d="M91 94L76 107L91 120M130 94L145 107L130 120M118 88L104 127" stroke="var(--ds-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M169 91H243M169 108H223M169 125H234M77 150H180" stroke="#93a7da" strokeWidth="6" strokeLinecap="round" />
        <rect x="222" y="140" width="59" height="39" rx="8" fill="var(--ds-primary)" /><path d="M239 159L247 166L264 150" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </>}
      {subject === "design" && <>
        <rect x="47" y="43" width="180" height="127" rx="9" fill="white" stroke="var(--art-line)" strokeWidth="2" />
        <rect x="62" y="58" width="57" height="96" rx="5" fill="var(--ds-primary)" />
        <circle cx="90" cy="89" r="16" fill="var(--ds-accent)" />
        <path d="M75 124H105M75 135H98M134 70H206M134 84H184" stroke="var(--art-line)" strokeWidth="5" strokeLinecap="round" />
        <rect x="134" y="104" width="72" height="49" rx="4" fill="var(--art-wash)" />
        <path d="M235 40L261 55L213 137L186 151L187 122Z" fill="var(--art-secondary)" stroke="var(--ds-ink)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M235 40L261 55M187 122L213 137" stroke="var(--ds-ink)" strokeWidth="3" />
        <circle cx="252" cy="161" r="16" fill="var(--ds-accent)" />
      </>}
      {subject === "data" && <>
        <rect x="55" y="34" width="210" height="140" rx="10" fill="white" stroke="var(--art-line)" strokeWidth="2" />
        <path d="M78 148H245M78 148V63" stroke="var(--art-line)" strokeWidth="2" />
        <rect x="96" y="110" width="24" height="38" rx="3" fill="var(--art-secondary)" /><rect x="137" y="89" width="24" height="59" rx="3" fill="var(--ds-primary)" /><rect x="178" y="65" width="24" height="83" rx="3" fill="var(--ds-accent)" />
        <path d="M94 90L143 64L182 48L231 55" stroke="var(--art-secondary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="143" cy="64" r="5" fill="var(--art-secondary)" /><circle cx="231" cy="55" r="5" fill="var(--art-secondary)" />
        <circle cx="259" cy="157" r="23" fill="var(--ds-primary)" /><path d="M250 157H268M259 148V166" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </>}
      {subject === "workflow" && <>
        <path d="M79 101H150V57H238M150 101V150H238" stroke="var(--art-secondary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="42" y="73" width="62" height="56" rx="12" fill="var(--ds-primary)" /><path d="M61 102L71 112L88 91" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="211" y="30" width="62" height="56" rx="12" fill="white" stroke="var(--art-line)" strokeWidth="2" /><path d="M226 50H258M226 62H248" stroke="var(--ds-primary)" strokeWidth="4" strokeLinecap="round" />
        <rect x="211" y="122" width="62" height="56" rx="12" fill="var(--ds-accent)" /><circle cx="242" cy="150" r="12" stroke="var(--ds-ink)" strokeWidth="3" /><path d="M242 142V151L248 155" stroke="var(--ds-ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="150" cy="101" r="9" fill="var(--art-secondary)" stroke="var(--art-surface)" strokeWidth="4" />
      </>}
    </svg>
  );
}
