/**
 * The little drawings for the brief's aesthetic directions, by style id
 * (messages: brief.styleCards). Drawn in currentColor, so the card or tile
 * that holds one decides its colour. Shared by the form's style cards and
 * the brief sheet beside it.
 */
export const STYLE_ART: Record<string, React.ReactNode> = {
  bold: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <rect x="8" y="14" width="64" height="16" rx="2" fill="currentColor" />
      <rect x="8" y="36" width="44" height="16" rx="2" fill="currentColor" />
      <rect x="8" y="58" width="24" height="10" rx="2" fill="currentColor" opacity="0.45" />
    </svg>
  ),
  minimal: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <line x1="8" y1="40" x2="72" y2="40" stroke="currentColor" strokeWidth="1" />
      <circle cx="40" cy="40" r="3.5" fill="currentColor" />
      <line x1="8" y1="52" x2="48" y2="52" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
    </svg>
  ),
  playful: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="24" cy="34" r="16" fill="currentColor" opacity="0.25" />
      <circle cx="50" cy="50" r="16" fill="currentColor" opacity="0.45" />
      <circle cx="58" cy="28" r="10" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  classic: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <line x1="40" y1="10" x2="40" y2="70" stroke="currentColor" strokeWidth="0.75" />
      <line x1="10" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="0.75" />
      <rect x="24" y="24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="40" cy="40" r="9" fill="none" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  ),
  tech: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <rect x="8"  y="8"  width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="31" y="8"  width="18" height="18" fill="currentColor" opacity="0.8" />
      <rect x="54" y="8"  width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="8"  y="31" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <rect x="54" y="31" width="18" height="18" fill="currentColor" opacity="0.3" />
      <line x1="8" y1="72" x2="72" y2="8" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
    </svg>
  ),
  luxury: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <line x1="40" y1="8"  x2="40" y2="72" stroke="currentColor" strokeWidth="0.5" />
      <line x1="16" y1="28" x2="64" y2="28" stroke="currentColor" strokeWidth="0.5" />
      <line x1="16" y1="52" x2="64" y2="52" stroke="currentColor" strokeWidth="0.5" />
      <rect x="33" y="33" width="14" height="14"
        transform="rotate(45 40 40)" fill="currentColor" opacity="0.85" />
    </svg>
  ),
  organic: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <path
        d="M18,42 C18,22 34,12 52,20 C66,26 70,44 56,58 C44,70 18,62 18,42Z"
        fill="currentColor" opacity="0.3"
      />
      <circle cx="38" cy="38" r="9" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  abstract: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="30" cy="36" r="18" fill="currentColor" opacity="0.25" />
      <circle cx="52" cy="46" r="18" fill="currentColor" opacity="0.25" />
      <polygon
        points="40,12 68,62 12,62"
        fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7"
      />
    </svg>
  ),
}
