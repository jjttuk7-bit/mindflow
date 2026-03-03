export function DotLineLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Small dot */}
      <circle cx="3" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
      {/* Medium dot */}
      <circle cx="7.5" cy="12" r="2" fill="currentColor" opacity="0.65" />
      {/* Large dot merging into line */}
      <circle cx="12.5" cy="12" r="2.5" fill="currentColor" opacity="0.85" />
      {/* Thickening line */}
      <path
        d="M14 12 H22"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="1"
      />
    </svg>
  )
}
