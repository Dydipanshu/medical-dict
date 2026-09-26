// Ultrasound probe sector with scan arcs, plus the wordmark. Same mark as the website.
export function Logo() {
  const sector = "M16 5 L6.5 24 A21.3 21.3 0 0 0 25.5 24 Z";
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
        <path d={sector} fill="currentColor" opacity=".12" />
        <path d={sector} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M12.75 12.3 A8 8 0 0 0 19.25 12.3 M10.3 17.8 A14 14 0 0 0 21.7 17.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="logo-word">USGScribe</span>
    </span>
  );
}
