import React from "react";
import { Link } from "react-router-dom";
import { WikiShell } from "./WikiShell";

// Quick answers to the questions people actually ask. Each answer points at
// the deeper page so this stays short.

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Why did my score give 0pp?",
    a: (
      <>
        Usually one of three things: a Relax/Autopilot score under 75% accuracy, a Flashlight score with
        non-default settings, or a mod that does not earn pp. Full list on the{" "}
        <Link to="/wiki/scoring" className="text-fuchsia-300 hover:text-fuchsia-200 underline">Scoring & pp</Link> page.
        The score still submitted and still ranks by total score, it just gave no pp.
      </>
    ),
  },
  {
    q: "My friends (or country) leaderboard is empty. Is it broken?",
    a: (
      <>
        No, it is not broken. Those boards only show scores from your friends, or from your country, so an
        empty one just means nobody in that group has set a score on that map yet.
      </>
    ),
  },
  {
    q: "Do unranked / graveyard maps count?",
    a: (
      <>
        Yes. On Torii, unranked, graveyard and loved maps give pp and have leaderboards. On official osu!
        standard those give no pp at all, so this is a real difference.
      </>
    ),
  },
  {
    q: "Are Relax and Autopilot ranked?",
    a: (
      <>
        Yes, both are fully ranked here, each with its own leaderboards.
      </>
    ),
  },
  {
    q: "Can I use custom Double Time / Half Time rates?",
    a: (
      <>
        Yes. Custom rate variants of DT, NC, HT, DC and Easy still earn pp on Torii, unlike official osu!.
      </>
    ),
  },
  {
    q: "Did I get auto-banned?",
    a: (
      <>
        No. Nothing on Torii auto-bans you and no score is auto-rejected. Every restriction is a manual
        staff decision. See{" "}
        <Link to="/wiki/restrictions" className="text-amber-300 hover:text-amber-200 underline">Restrictions & Appeals</Link>.
      </>
    ),
  },
  {
    q: "How do I appeal a restriction?",
    a: (
      <>
        Open a ticket in the Discord and wait about a month before appealing. Details on the{" "}
        <Link to="/wiki/restrictions" className="text-amber-300 hover:text-amber-200 underline">Restrictions & Appeals</Link> page.
      </>
    ),
  },
  {
    q: "I found a map giving crazy pp. It looks broken.",
    a: (
      <>
        Report it in Discord instead of farming it. Because unranked maps give pp here, a broken map can
        hand out absurd pp, and knowingly farming one without reporting it is bannable.
      </>
    ),
  },
];

export default function WikiFaqPage() {
  return (
    <WikiShell
      title="FAQ"
      icon="❓"
      accent="emerald"
      intro={<>Short answers to the questions that come up most. Each one links to the full version.</>}
    >
      <div className="space-y-4">
        {FAQ.map((item, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
            <h2 className="mb-2 text-base font-bold text-white">{item.q}</h2>
            <p className="text-sm text-white/65 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </WikiShell>
  );
}
