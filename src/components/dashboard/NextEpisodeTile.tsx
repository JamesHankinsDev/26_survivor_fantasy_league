import Card from "@/components/primitives/Card";

export interface NextEpisodeStat {
  label: string;
  value: string;
}

interface NextEpisodeTileProps {
  /** "EP 5 · Live Together, Die Solo" */
  title: string;
  /** "Wed 8pm ET · CBS" */
  when: string;
  /** Up to 3 mini-grid stats. */
  stats?: NextEpisodeStat[];
  /** Footer CTA (e.g. "Episode log") — omitted hides the button. */
  cta?: { label: string; onClick?: () => void; href?: string };
  /** Override the "Next up" eyebrow. */
  eyebrow?: string;
}

export default function NextEpisodeTile({
  title,
  when,
  stats = [],
  cta,
  eyebrow = "Next up",
}: NextEpisodeTileProps) {
  return (
    <Card className="sfl-next-ep">
      <div className="sfl-eyebrow">{eyebrow}</div>
      <div className="sfl-next-ep-title">{title}</div>
      <div className="sfl-next-ep-when">{when}</div>
      {stats.length > 0 && (
        <div className="sfl-next-ep-mini">
          {stats.slice(0, 3).map((s, i) => (
            <div key={i}>
              <i>{s.label}</i>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
      )}
      {cta &&
        (cta.href ? (
          <a className="sfl-btn ghost full" href={cta.href}>
            {cta.label}
          </a>
        ) : (
          <button
            type="button"
            className="sfl-btn ghost full"
            onClick={cta.onClick}
          >
            {cta.label}
          </button>
        ))}
    </Card>
  );
}
