"use client";

import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import LockCountdown from "@/components/shell/LockCountdown";
import type { Season } from "@/data/seasons";

interface HeroAction {
  label: string;
  href: string;
}

interface InSeasonHeroProps {
  mode: "in-season";
  /** "Week 5 · Merge episode" eyebrow. */
  weekKicker: string;
  /** Episode title; last word renders italic + flame. */
  episodeTitle: string;
  /** Lede paragraph below the H1. Can include `<b>` for emphasis. */
  lede: React.ReactNode;
  primaryAction: HeroAction;
  secondaryAction?: HeroAction;
  /** Members across all leagues. */
  totalMembers?: number;
  /** Castaway elimination tally — e.g. { eliminated: 7, total: 24 }. */
  eliminations?: { eliminated: number; total: number };
}

interface PreSeasonHeroProps {
  mode: "pre-season";
  season: Season;
  primaryAction: HeroAction;
  secondaryAction?: HeroAction;
}

export type DashHeroProps = InSeasonHeroProps | PreSeasonHeroProps;

/**
 * Split the trailing word of a heading so it can be wrapped in a flame-colored
 * <em>. Falls back to the whole string if there's only one word.
 */
function splitLastWord(title: string): { lead: string; tail: string } {
  const trimmed = title.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return { lead: "", tail: trimmed };
  return { lead: trimmed.slice(0, lastSpace + 1), tail: trimmed.slice(lastSpace + 1) };
}

function HeroActions({
  primary,
  secondary,
}: {
  primary: HeroAction;
  secondary?: HeroAction;
}) {
  return (
    <div className="sfl-dash-actions">
      <Link href={primary.href} className="sfl-btn primary">
        {primary.label}
        <span className="sfl-btn-arrow">→</span>
      </Link>
      {secondary && (
        <Link href={secondary.href} className="sfl-btn ghost">
          {secondary.label}
        </Link>
      )}
    </div>
  );
}

export default function DashHero(props: DashHeroProps) {
  if (props.mode === "pre-season") {
    const { season, primaryAction, secondaryAction } = props;
    const premiere = new Date(season.premiereDate);
    const daysUntil = Math.max(0, differenceInCalendarDays(premiere, new Date()));
    const premiereLabel = premiere.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const { lead, tail } = splitLastWord(season.name);

    return (
      <section className="sfl-dash-hero">
        <div className="sfl-dash-hero-main">
          <div className="sfl-eyebrow flame">
            Pre-season · Premieres {premiereLabel}
          </div>
          <h1 className="sfl-h1">
            {lead}
            <em>{tail}</em>
          </h1>
          <p className="sfl-dash-lede">
            {season.theme && (
              <>
                <b>{season.theme}.</b>{" "}
              </>
            )}
            {daysUntil > 0 ? (
              <>
                The season premieres in <b>{daysUntil} days</b>. Draft your
                tribe early so your roster locks the moment episode 1 airs.
              </>
            ) : (
              <>
                The season premieres today. Lock in your roster before the
                first vote.
              </>
            )}
          </p>
          <HeroActions primary={primaryAction} secondary={secondaryAction} />
        </div>
        <div className="sfl-dash-hero-stat">
          <PremiereCountdown target={premiere} />
          <div className="sfl-dash-hero-meta">
            <div>
              <span>{daysUntil}</span>
              <i>days until premiere</i>
            </div>
            <div>
              <span>S{season.number}</span>
              <i>up next</i>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const {
    weekKicker,
    episodeTitle,
    lede,
    primaryAction,
    secondaryAction,
    totalMembers,
    eliminations,
  } = props;
  const { lead, tail } = splitLastWord(episodeTitle);

  return (
    <section className="sfl-dash-hero">
      <div className="sfl-dash-hero-main">
        <div className="sfl-eyebrow flame">{weekKicker}</div>
        <h1 className="sfl-h1">
          {lead}
          <em>{tail}</em>
        </h1>
        <p className="sfl-dash-lede">{lede}</p>
        <HeroActions primary={primaryAction} secondary={secondaryAction} />
      </div>
      <div className="sfl-dash-hero-stat">
        <LockCountdown />
        <div className="sfl-dash-hero-meta">
          {totalMembers != null && (
            <div>
              <span>{totalMembers}</span>
              <i>members across all leagues</i>
            </div>
          )}
          {eliminations && (
            <div>
              <span>{eliminations.eliminated}</span>
              <i>of {eliminations.total} castaways eliminated</i>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Simple day-count card for pre-season. Mirrors the LockCountdown visual but
 * counts down to a fixed date rather than the next weekly Wed-8pm lock.
 */
function PremiereCountdown({ target }: { target: Date }) {
  const days = Math.max(0, differenceInCalendarDays(target, new Date()));
  return (
    <div className="sfl-lock" role="timer" aria-label={`Season premieres in ${days} days`}>
      <span className="sfl-lock-label">Premieres in</span>
      <span className="sfl-lock-time">
        <span>{days}</span>
        <i>{days === 1 ? "day" : "days"}</i>
      </span>
    </div>
  );
}
