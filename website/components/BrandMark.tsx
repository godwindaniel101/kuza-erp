/**
 * Kuza logo mark — the single shared brand mark used across the app and the
 * marketing website (blue→indigo gradient, rounded square, K glyph + spark).
 * Keep this identical to user-portal/components/BrandMark.tsx.
 */
export default function BrandMark({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill="url(#kzmark)" />
      <path
        d="M13 27V13m0 7 8-7m-8 7 8 7"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28.5" cy="12.5" r="2.6" fill="#fff" />
      <defs>
        <linearGradient id="kzmark" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2e56d3" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
