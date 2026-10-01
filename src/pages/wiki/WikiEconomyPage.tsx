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
    body: `A top play is a score that becomes your new pp-best on a map: your first pp score there, or a higher-pp score than your previous best on it. Each mode keeps its own list of top plays, and relax and autopilot count as their own modes.

The reward has two parts. Both depend on where the play lands among your best plays in that mode and on how many top plays you already have there (your tenure).

- Rank base: a new #1 pays the most (250), then top 5 (120), top 25 (45), top 50 (20) and top 100 (8). Below #100 the base is zero. With fewer than 500 top plays in the mode the base is roughly half of that (120 for a #1, 60 for a top 5, and so on).
- pp bonus: the pp the play added to your weighted total in that mode, one point per pp, capped at 150 (60 under 500 top plays). A 1200pp play that moves your total by 3pp pays 3 here, not 1200.
- A PB that adds less than 1pp to your total pays no rank base, only the pp bonus. Beating your own #1 by 0.01pp is not a reward.

Gates and limits:

- You need 50 top plays in that mode before top plays pay anything beyond crumbs (3 to 8 points).
- Daily soft cap: once you have earned 500 top-play points in a UTC day, further top plays pay only their pp bonus, no rank base. The in-game points card tells you when this happens.
- Daily hard cap: 800 top-play points per UTC day, counted across all modes together. Past it, top plays pay zero until midnight UTC.
- Relax and autopilot plays pay 40% of the normal amount, because pp there is cheap.
- Plays outside your main mode pay 60% of the normal amount. See the next section.`,
  },
  {
    heading: "Your main mode and the other modes",
    body: `Your main mode is the mode where you have the most pp, with relax and autopilot counted as separate modes. It is not a setting: it follows your pp and can change over time. If two modes are tied, the mode you just played counts as main.

A top play in any other mode pays 60% of what the same play would pay in your main mode. Both the rank base and the pp bonus are scaled. The in-game points card says so when it applies ("not your main mode"), and your points history shows the percentage next to the award.

Why: every mode has its own top-play list, so in a mode you barely play almost any decent score is a new #1 or top 5, and your pp total there moves a lot with each play. That rewards being new to something, not being good at it. Before this rule, the player with the most points ever had earned 89% of them in modes that were not their main one. Playing several modes still pays more than playing one, just not several times more.

Relax and autopilot stack with this: a relax play outside your main mode pays 40% of 60%.`,
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
