interface AppLogoProps {
  /** Hide the wordmark; only the torch icon shows. */
  collapsed?: boolean;
  /** Subline rendered under "SURVIVOR" (e.g. season label). */
  subtitle?: string;
}

function Torch({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 20 24"
      aria-hidden="true"
      className="sfl-torch"
    >
      <rect
        x="8"
        y="11"
        width="4"
        height="11"
        rx="1"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        className="sfl-torch-flame"
        d="M10 0 C 6 5, 4 8, 5 12 Q 5 15, 10 14 Q 15 15, 15 12 C 16 8, 14 5, 10 0 Z"
        fill="var(--flame, #E76F3C)"
      />
      <circle cx="10" cy="10" r="2" fill="#FFD66A" />
    </svg>
  );
}

export default function AppLogo({
  collapsed = false,
  subtitle = "Fantasy League",
}: AppLogoProps) {
  return (
    <div className="sfl-logo">
      <Torch size={22} />
      {!collapsed && (
        <div className="sfl-logo-text">
          <div className="sfl-logo-name">SURVIVOR</div>
          <div className="sfl-logo-sub">{subtitle}</div>
        </div>
      )}
    </div>
  );
}
