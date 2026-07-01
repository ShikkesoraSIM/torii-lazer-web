import { WikiShell, Section, Prose, Callout } from "./WikiShell";

// Points & Economy. The exact earning algorithm, documented so nobody can
// argue about how points work. Amounts are current values and will reset
// before launch (called out up top).

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What points are",
    body: `Points are earned by playing. There is no way to buy them with money, and paying never grants or speeds them up.

Every point change is written to a ledger, which is the real record. The number on your profile is a running balance kept in sync with that ledger. Each earning event is keyed so it cannot pay out twice.`,
  },
  {
    heading: "Top plays",
    body: `A top play is a score that becomes your new pp-best on a map, either your first pp score there or a higher-pp score than your previous best on it.

- Reward: 100 points per new top play.
- Requirement: you need at least 50 top plays in that mode before any new top play starts paying. This stops fresh accounts from farming their first scores.
- Daily cap: at most 5 top-play awards per day, rolling over at UTC midnight.

So the most you can get from top plays in a day is 500 points, and only once you are past the 50 top-play mark.`,
  },
  {
    heading: "Daily play and streak",
    body: `Your first passed play of the day (UTC) pays a daily bonus, and a streak builds the more consecutive days you show up.

- Base: 15 points.
- Streak bonus: +5 points per consecutive day on top of the base, capped at +30.

So day 1 is 15, day 2 is 20, day 3 is 25, and it tops out at 45 per day from day 7 onward. The streak is read from the previous day's award; miss a day and it resets to 1. It pays once per UTC day, and only a passed score triggers it.`,
  },
  {
    heading: "Daily challenge",
    body: `Completing the daily challenge pays a flat 30 points, once per day (UTC). The score has to pass.

This is separate from your daily-challenge streak counter. That streak does not add points; only the flat 30 is paid for completing the challenge.`,
  },
  {
    heading: "Medals",
    body: `Each new medal you unlock pays 10 points.

Medals do not unlock on locally-uploaded maps, so those pay nothing. Which medals need a ranked status is covered on the Scoring & pp page.`,
  },
  {
    heading: "Redeem codes",
    body: `Staff can issue codes that grant points, and sometimes a cosmetic. Redeem one from your points page.

- Each code can be redeemed once per user. That is a hard guarantee, not a soft check.
- A code can expire and has a maximum number of total uses across everyone.
- Redeeming is rate-limited to 10 attempts per 10 minutes.

Codes look like TORII- followed by 6 characters. A code's value can be anything up to 1,000,000 points, and a value of 0 is used for codes that only grant a cosmetic.`,
  },
  {
    heading: "Gifts",
    body: `Staff can send gifts. A gift can carry points, a cosmetic, or both. You claim it from your gifts, and a gift can only be claimed once. If it carries points, claiming it credits them.`,
  },
  {
    heading: "Spending: the cosmetic store",
    body: `The store is currently client-side only. The server does not have a purchase system yet, so buying a cosmetic deducts from a balance tracked in the client and saves what you own in the client, not on the server. Everything here is placeholder and not final.

One-time unlocks (placeholder prices):

- Adjustable trail length and size: 100 points. Turns on the length and size sliders for every trail you own.
- Adjustable trail density: 100 points.
- Custom accent hue: 5000 points. A one-time unlock for a second UI accent colour, which used to be supporter-only.

What you can buy: cursor trails (around three dozen, tiered Basic, Special and Premium), name colours (solids and gradients; role and group colours are earned, not sold), and the Summer aura. The shop rotates its featured picks once per day by UTC. Exact per-item prices are shown in the store and are still placeholder, so they are not pinned down here.`,
  },
];

export default function WikiEconomyPage() {
  return (
    <WikiShell
      title="Points & Economy"
      icon="🪙"
      accent="amber"
      intro={
        <>
          How you earn Torii points and what you can do with them, spelled out exactly so there is
          nothing to argue about.
        </>
      }
    >
      <Callout tone="warn" title="About these numbers">
        The amounts here are the current values. They are still being tuned and can change, and the whole
        economy (every balance included) is reset before the public launch. So today's numbers are not
        promises, and old amounts will not carry over.
      </Callout>

      <div className="mt-8" />

      {SECTIONS.map((s) => (
        <Section key={s.heading} title={s.heading}>
          <Prose body={s.body} />
        </Section>
      ))}
    </WikiShell>
  );
}
