/** An abstract RTL journey: three learning routes connect one start and one goal. */
export function LearningPathsArtwork() {
  return <svg className="home-learning-paths" viewBox="0 0 360 240" fill="none" aria-hidden="true" focusable="false">
    <circle cx="44" cy="120" r="39" fill="var(--ds-soft)" />
    <path d="M314 120C271 120 273 42 227 42H132C88 42 91 120 44 120" stroke="var(--ds-primary)" strokeWidth="8" strokeLinecap="round" />
    <path d="M314 120C267 120 255 100 219 100C162 100 148 140 107 140C78 140 68 120 44 120" stroke="var(--ds-accent)" strokeWidth="8" strokeLinecap="round" />
    <path d="M314 120C271 120 273 198 227 198H132C88 198 91 120 44 120" stroke="var(--ds-primary)" strokeOpacity=".28" strokeWidth="5" strokeLinecap="round" />
    <circle cx="207" cy="42" r="7" fill="var(--ds-surface)" stroke="var(--ds-primary)" strokeWidth="3" />
    <circle cx="177" cy="111" r="7" fill="var(--ds-surface)" stroke="var(--ds-accent)" strokeWidth="3" />
    <circle cx="153" cy="198" r="6" fill="var(--ds-bg)" stroke="var(--ds-primary)" strokeOpacity=".5" strokeWidth="2" />
    <circle cx="314" cy="120" r="13" fill="var(--ds-bg)" stroke="var(--ds-primary)" strokeWidth="3" />
    <circle cx="314" cy="120" r="4" fill="var(--ds-primary)" />
    <circle cx="44" cy="120" r="23" fill="var(--ds-primary)" />
    <path d="M34 120L41 127L55 113" stroke="var(--ds-surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <g fill="var(--ds-muted)" fontSize="12" textAnchor="middle" direction="rtl">
      <text x="314" y="157">شروع</text>
      <text x="44" y="178">یادگیری</text>
    </g>
  </svg>;
}
