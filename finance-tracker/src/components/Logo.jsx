// className adds to the base "logo" class (the size is set in the CSS)
export default function Logo({ className = '' }) {
  return (
    <svg
      className={className ? `logo ${className}` : 'logo'}
      viewBox="10 7 124 124"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="logo-bar logo-bar-1" x="30" y="94" width="20" height="28" rx="10" />
      <rect className="logo-bar logo-bar-2" x="58" y="74" width="20" height="48" rx="10" />
      <rect className="logo-bar logo-bar-3" x="86" y="62" width="20" height="60" rx="10" />
      <circle className="logo-coin" cx="96" cy="34" r="18" fill="none" strokeWidth="5" />
      <path
        className="logo-arrow"
        d="M89 41 L103 27"
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        className="logo-arrow"
        d="M94 27 L103 27 L103 36"
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
