import type { ReactNode } from "react";

export interface SectionHeaderProps {
  /** Small label above the title (e.g. "WEEK 6"). Hidden if absent. */
  eyebrow?: string;
  /** Eyebrow rendered in flame-deep instead of muted ink. */
  eyebrowFlame?: boolean;
  title: ReactNode;
  /** Action slot rendered on the right (button cluster, etc.). */
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  eyebrowFlame = false,
  title,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={`sfl-secthead${className ? ` ${className}` : ""}`}>
      <div>
        {eyebrow && (
          <div className={`sfl-eyebrow${eyebrowFlame ? " flame" : ""}`}>
            {eyebrow}
          </div>
        )}
        <h2 className="sfl-secttitle">{title}</h2>
      </div>
      {action && <div className="sfl-secthead-actions">{action}</div>}
    </div>
  );
}
