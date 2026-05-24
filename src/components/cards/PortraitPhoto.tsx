import type { Castaway } from "@/types/castaway";
import { getTribe } from "@/data/tribes";

interface PortraitPhotoProps {
  castaway: Castaway;
  /** Apply the "voted out" grayscale + dimming filter. */
  eliminated?: boolean;
}

/**
 * Beach-photo SVG placeholder for trading cards.
 *
 * Sky/sand colors + silhouette x-offset are derived from a deterministic hash
 * of `castaway.id`, so each castaway gets a consistent-but-unique placeholder.
 * The silhouette uses the castaway's tribe color when a tribe is set
 * (`src/data/tribes.ts` lookup); otherwise it falls back to the flame accent.
 *
 * When `castaway.image` is set, the real headshot renders instead and the
 * SVG is bypassed entirely. The frame/badges sit in a sibling layer so they
 * still chrome the photo.
 */
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function PortraitPhoto({
  castaway,
  eliminated = false,
}: PortraitPhotoProps) {
  const photo = castaway.image || castaway.imageUrl;
  if (photo) {
    return (
      <img
        src={photo}
        alt={castaway.name}
        className={`sfl-tcg-photo${eliminated ? " is-eliminated" : ""}`}
      />
    );
  }

  const tribeColor = getTribe(castaway.tribe)?.color ?? "var(--flame, #E76F3C)";
  const seed = hashSeed(castaway.id);
  const skyHue = 195 + (seed % 30) - 15;
  const sandHue = 38 + (seed % 14);
  const lift = ((seed >> 4) % 20) - 10;
  const skyTop = `hsl(${skyHue}, 60%, 78%)`;
  const skyMid = `hsl(${skyHue + 10}, 50%, 88%)`;
  const sandTop = `hsl(${sandHue}, 38%, 78%)`;
  const sandBot = `hsl(${sandHue - 5}, 35%, 60%)`;
  const initials = castaway.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const gradId = `tcg-sky-${castaway.id}`;
  const sandId = `tcg-sand-${castaway.id}`;
  const seasonLabel = castaway.seasonNumber ? `S${castaway.seasonNumber}` : "";

  return (
    <svg
      viewBox="0 0 200 240"
      preserveAspectRatio="xMidYMid slice"
      className={`sfl-tcg-photo${eliminated ? " is-eliminated" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="65%" stopColor={skyMid} />
          <stop offset="100%" stopColor={sandTop} />
        </linearGradient>
        <linearGradient id={sandId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sandTop} />
          <stop offset="100%" stopColor={sandBot} />
        </linearGradient>
      </defs>
      <rect width="200" height="240" fill={`url(#${gradId})`} />
      <ellipse
        cx={40 + (seed % 80)}
        cy="135"
        rx="60"
        ry="14"
        fill="hsl(195, 22%, 60%)"
        opacity="0.5"
      />
      <path
        d={`M 0 152 Q 50 ${148 + (seed % 6)} 100 152 T 200 152 L 200 158 L 0 158 Z`}
        fill="hsl(195, 40%, 70%)"
        opacity="0.6"
      />
      <rect y="155" width="200" height="85" fill={`url(#${sandId})`} />
      <path
        d={`M ${100 + lift - 66} 240 L ${100 + lift - 46} 175 Q ${100 + lift - 22} 160 ${100 + lift} 158 Q ${100 + lift + 22} 160 ${100 + lift + 46} 175 L ${100 + lift + 66} 240 Z`}
        fill={tribeColor}
      />
      <circle cx={100 + lift} cy="132" r="32" fill={tribeColor} />
      <ellipse
        cx={100 + lift}
        cy="222"
        rx="80"
        ry="6"
        fill="rgba(0,0,0,0.18)"
      />
      <text
        x={100 + lift}
        y="143"
        textAnchor="middle"
        fontFamily="var(--font-display, 'Bricolage Grotesque'), sans-serif"
        fontWeight="800"
        fontSize="34"
        fill="rgba(255,255,255,0.85)"
        letterSpacing="1"
      >
        {initials}
      </text>
      <text
        x="190"
        y="232"
        textAnchor="end"
        fontFamily="var(--font-mono, 'JetBrains Mono'), monospace"
        fontSize="9"
        fill="rgba(0,0,0,0.25)"
        letterSpacing="0.5"
      >
        {seasonLabel ? `${seasonLabel} · ` : ""}
        {String(seed).slice(-3)}
      </text>
    </svg>
  );
}
