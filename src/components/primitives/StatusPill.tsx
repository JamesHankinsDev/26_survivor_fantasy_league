export type CastawayStatus = "active" | "jury" | "out";

const LABELS: Record<CastawayStatus, string> = {
  active: "ON ROSTER",
  jury: "JURY",
  out: "VOTED OUT",
};

export interface StatusPillProps {
  status: CastawayStatus;
  /** Override the default label (e.g. "ELIMINATED" instead of "VOTED OUT"). */
  label?: string;
  className?: string;
}

export default function StatusPill({ status, label, className }: StatusPillProps) {
  return (
    <span className={`sfl-pill ${status}${className ? ` ${className}` : ""}`}>
      {label ?? LABELS[status]}
    </span>
  );
}
