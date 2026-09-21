"use client";

import { useState, type ReactNode } from "react";
import { CURRENT_SEASON } from "@/data/seasons";
import { getScoringConfig, getSeasonRuleExtras } from "@/utils/seasonScoringConfig";
import { getEventLabel } from "@/utils/eventScoringConfig";
import type { ScoringEventType } from "@/types/league";

export interface HowToPlayWalkthroughProps {
  open: boolean;
  /** Fires on finish, skip, or backdrop dismiss — the caller marks it seen. */
  onClose: () => void;
  /** Dev-only footnote telling you the "seen" flag won't be written. */
  persists?: boolean;
}

interface Slide {
  kicker: string;
  title: string;
  body: ReactNode;
}

/** The point values that actually move the needle, biggest first. */
const HEADLINE_EVENTS: ScoringEventType[] = [
  "season_winner",
  "made_final_three",
  "immunity_win",
  "found_idol",
  "team_challenge_win",
  "used_idol_successfully",
  "voted_at_tribal",
  "found_advantage",
  "used_advantage_successfully",
  "voted_out",
];

function buildSlides(): Slide[] {
  const season = CURRENT_SEASON;
  const scoring = getScoringConfig(season.number);
  const extras = getSeasonRuleExtras(season.number);

  return [
    {
      kicker: "Welcome back",
      title: "Here's how the game works",
      body: (
        <>
          <p>
            Two minutes, start to finish. You draft five castaways, they earn you
            points every episode, and you get weekly swaps to fix your mistakes.
          </p>
          <p className="sfl-wt-muted">
            You can close this any time and replay it later from the About page.
          </p>
        </>
      ),
    },
    {
      kicker: "Step 1",
      title: "Open your pack, keep five",
      body: (
        <>
          <p>
            Your season starts with a <b>starter pack</b> — nine castaways dealt at
            random. Cut it down to the five you want on your tribe.
          </p>
          <p>
            The deal is locked to you, so refreshing won't give you a better hand.
            Choose carefully.
          </p>
        </>
      ),
    },
    {
      kicker: "Step 2",
      title: "They score, you score",
      body: (
        <>
          <p>
            Every episode, whatever your five castaways do earns you points in{" "}
            <b>{season.name}</b>:
          </p>
          <ul className="sfl-wt-scores">
            {HEADLINE_EVENTS.filter((e) => scoring[e] !== 0).map((event) => (
              <li key={event}>
                <span>{getEventLabel(event)}</span>
                <b className={scoring[event] > 0 ? "up" : "down"}>
                  {scoring[event] > 0 ? "+" : ""}
                  {scoring[event]}
                </b>
              </li>
            ))}
          </ul>
          {typeof extras.weeklyScoreFloor === "number" && (
            <p className="sfl-wt-muted">
              A bad week can't sink you — weekly scores bottom out at{" "}
              {extras.weeklyScoreFloor}.
            </p>
          )}
        </>
      ),
    },
    {
      kicker: "Step 3",
      title: "Swap before Wednesday",
      body: (
        <>
          <p>
            Tap <b>Make my weekly swap</b> on your home screen. Pick who's leaving,
            pick who's coming in, confirm. That's it.
          </p>
          <p>
            Rosters lock <b>Wednesday at 8:00 PM ET</b>, right before the episode
            airs. Miss it and you ride the week out with who you've got.
          </p>
          <p>
            You get <b>two swaps a week before the merge</b>, and <b>one after</b>.
          </p>
        </>
      ),
    },
    {
      kicker: "New this season",
      title: "The merge changes everything",
      body: (
        <>
          <p>
            <b>Before the merge</b> you&apos;re flexible: two swaps a week, and if
            one of yours is voted out you can drop them and free up the slot.
          </p>
          <p>
            <b>After the merge</b> it tightens: one swap a week, and a voted-out
            castaway <b>stays on your roster</b> — you don&apos;t get to replace
            them. By the finale you might be down to one or two surviving
            castaways carrying you home.
          </p>
        </>
      ),
    },
    {
      kicker: "The one rule people miss",
      title: "Points only count while they're yours",
      body: (
        <>
          <p>
            You keep every point a castaway scored <b>while they were on your
            tribe</b> — dropping them doesn't erase that.
          </p>
          <p>
            But you get nothing for what they do after you let them go. Dropping a
            winner the week before they win is how this league is lost.
          </p>
        </>
      ),
    },
    {
      kicker: "That's everything",
      title: "Go win the season",
      body: (
        <>
          <p>
            Check <b>Standings</b> to see where you sit, <b>Cast</b> to scout who's
            scoring, and your league's message board to talk your share of trash.
          </p>
          <p className="sfl-wt-muted">
            Idols and advantages score twice: once for finding one, again for
            playing it successfully.
          </p>
        </>
      ),
    },
  ];
}

/**
 * HowToPlayWalkthrough — a full-screen, swipeable-feeling explainer of the game.
 *
 * Replaces the old `AppTutorial`, which was a nine-step tour of the navigation
 * (including a "My Leagues" tab and an "Admin Panel" tab that no longer sit in
 * the nav) rather than an explanation of how to play. This one teaches the loop:
 * draft, score, swap, and the roster rule everyone gets wrong.
 *
 * Built to the same shape as `SwapSheet` — fixed header, scrolling body, sticky
 * footer — so the Next button is always under a thumb on a phone.
 */
export default function HowToPlayWalkthrough({
  open,
  onClose,
  persists = true,
}: HowToPlayWalkthroughProps) {
  const [index, setIndex] = useState(0);
  const slides = buildSlides();

  // Reset to the first slide whenever it reopens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setIndex(0);
  }

  if (!open) return null;

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div
      className="sfl-walkthrough"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sfl-wt-title"
    >
      <header className="sfl-wt-head">
        <div className="sfl-wt-dots" role="presentation">
          {slides.map((s, i) => (
            <span
              key={s.kicker}
              className={`sfl-wt-dot${i === index ? " active" : ""}${i < index ? " done" : ""}`}
            />
          ))}
        </div>
        <button className="sfl-wt-skip" onClick={onClose}>
          {isLast ? "Close" : "Skip"}
        </button>
      </header>

      <div className="sfl-wt-scroll">
        <p className="sfl-wt-kicker">{slide.kicker}</p>
        <h2 className="sfl-wt-title" id="sfl-wt-title">
          {slide.title}
        </h2>
        <div className="sfl-wt-body">{slide.body}</div>
      </div>

      <footer className="sfl-wt-foot">
        {!persists && (
          <p className="sfl-wt-devnote">
            Dev build — this won't be marked as seen, so it'll show again on reload.
          </p>
        )}
        <div className="sfl-wt-actions">
          <button
            className="sfl-btn ghost"
            onClick={() => setIndex((i) => i - 1)}
            disabled={index === 0}
          >
            Back
          </button>
          <button
            className="sfl-btn block"
            onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
          >
            {isLast ? "Got it — let's play" : "Next"}
          </button>
        </div>
        <p className="sfl-wt-count">
          {index + 1} of {slides.length}
        </p>
      </footer>
    </div>
  );
}
