import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  /**
   * Optional accent color exposed as `--accent` for child rules
   * (gradient borders, color-mix backgrounds, etc.).
   */
  accent?: string;
  className?: string;
  style?: CSSProperties;
}

export default function Card({ children, accent, className, style }: CardProps) {
  const combined: CSSProperties = {
    ...(accent ? ({ ["--accent" as string]: accent } as CSSProperties) : {}),
    ...style,
  };
  return (
    <div
      className={`sfl-card${className ? ` ${className}` : ""}`}
      style={combined}
    >
      {children}
    </div>
  );
}
