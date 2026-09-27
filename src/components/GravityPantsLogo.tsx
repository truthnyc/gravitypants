import { useId } from "react";

const WORDMARK_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: "#1D1D1F",
  whiteSpace: "nowrap",
} as const;

export function GravityPantsLogo({
  size = 26,
  showWordmark = false,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  const maskId = useId();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: showWordmark ? 12 : 0,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <rect width="24" height="24" rx="5.4" fill="#0071E3" />
        <g transform="translate(0.75 1.65) scale(0.9)">
          <mask id={maskId}>
            <rect x="-8" y="-8" width="40" height="40" fill="#fff" />
            <path
              d="M9.95 10.3 14.2 13 9.95 15.7Z"
              fill="#000"
              stroke="#000"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </mask>
          <g fill="#fff">
            <circle cx="11" cy="13" r="7" mask={`url(#${maskId})`} />
            <circle cx="19" cy="5" r="2" />
          </g>
        </g>
      </svg>
      {showWordmark && <span style={WORDMARK_STYLE}>Gravity Pants</span>}
    </span>
  );
}
