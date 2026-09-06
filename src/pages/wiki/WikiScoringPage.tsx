import { WikiShell, Section, Prose } from "./WikiShell";

// Scoring & pp. The precise reference for how pp, ranking, leaderboards and
// medals work. Every value here is what the server actually enforces.

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "How a score earns pp",
    body: `pp is decided entirely on the server. The client cannot grant or change it. When a score is submitted, the server runs a fixed set of gates in order. If a score fails any gate it earns 0pp, but it is still recorded.

The gates, in the order they run:

- Flashlight settings check (osu! standard, Relax and Autopilot only). This runs first, before anything else.
- The score must have passed, the map must be ranked for pp, and every mod in the play must be allowed for pp.
- Relax and Autopilot accuracy floor.
- pp is calculated.`,
  },
  {
    heading: "Relax and Autopilot need 75% accuracy",
    body: `A Relax or Autopilot score below 75% accuracy earns 0pp. This is a hard cutoff checked before pp is calculated, so it applies no matter how high the map's star rating or your score is.

The modes it covers: osu! Relax, Taiko Relax, Catch Relax and osu! Autopilot. There is no Taiko or Catch Autopilot; Autopilot only exists for osu! standard.

75.0% or higher earns pp normally. 74.9% or lower earns nothing. The in-game message is: "Relax and Autopilot scores need at least 75% accuracy to earn pp."`,
  },
  {
    heading: "Relax flow aim (the washing machine) earns less",
    body: `On Relax there is no tapping, so pp leans almost entirely on aim. The catch is that a lot of maps can be cleared without really aiming: you hold one smooth, continuous cursor sweep, a "washing machine", and let the auto-tap catch every note that falls under the path. Wide flowy patterns that keep turning the same way, and evenly spaced streams, are the easiest to wash.

Those now earn less aim pp on Relax. The cut scales with how washable the pattern is: the flowier and more one-directional it is, the harder it drops. Sharp back-and-forth (snap) aim cannot be washed, so it is left at full value, and the nerf fades out on small circles where even a sweep needs real precision.

This is Relax only. Base osu!, Autopilot and normal plays are not touched. It is the same flow-aim model the Torii client uses in-game, so the client and the server agree on it.`,
  },
  {
    heading: "Very low CS and OD earn less pp",
    body: `Tiny circle size paired with very low overall difficulty, the classic Difficulty Adjust CS0 / OD0 setup, is not punished hard enough by the raw pp calculator, so those plays used to farm huge numbers on otherwise easy maps. Torii scales their pp down.

It covers osu! standard, Relax and Autopilot only, and it never touches Easy (Easy is honest and already pays reduced pp). On base, the penalty starts ramping once effective CS drops below 2.5 or OD below 4. Relax widens that to CS 4 and OD 6, because big targets and wide hit windows are far easier to abuse when you are not tapping. A map with normal CS and OD comes out unchanged, and Hard Rock, which raises both, pushes a play back out of the penalty.`,
  },
  {
    heading: "Relax reading is capped to your aim",
    body: `On Relax the only thing you actually do is move the cursor, so the reading (cognition) part of pp only means anything in proportion to that movement. On real plays reading is a tiny slice of aim. A few near-zero-movement spam maps abused this, turning reading into a big pp source while you barely had to aim.

Reading is now capped at half of your aim value on Relax. Those degenerate maps collapse, and every genuine play, already well under the cap, is left exactly as calculated.`,
  },
  {
    heading: "Flashlight must use default settings",
    body: `On osu! standard, Relax and Autopilot, Flashlight only earns pp on its default settings. Change any of these and the whole score earns 0pp:

- Size, default 1.0
- Follow delay, default 1.0
- Combo-based size, default on

Any change past a tiny rounding tolerance, or turning combo-based size off, zeroes the play. The message is: "Only default Flashlight settings earn pp, set size, delay and combo-based size back to their defaults."

Taiko, Catch and Mania apply the same idea through the mod whitelist: Flashlight is only allowed at default size with combo-based size in its default state for that ruleset. Mania's default for combo-based size is off, which is the opposite of standard.`,
  },
  {
    heading: "Mods that never earn pp",
    body: `These bans are enforced in code and cannot be loosened by config:

- Adaptive Speed (AS), every ruleset. The track speed follows you in real time while difficulty is measured once at base rate, so it is off server-wide.
- Magnetised (MG), osu! standard / Relax / Autopilot only. Always 0pp in that family.
- Bloom (BM), every ruleset. Its pp calculation is broken, so it is off server-wide.
- Wind Down (WD), every ruleset. It ramps the song speed down over the map, so the effective rate ends up below base while difficulty is still measured at base rate. That would pay out pp for an easier play, so it is banned everywhere. Wind Up (WU) stays allowed because it only makes a play harder.
- Constant Speed (CS), Taiko and Mania. It removes the scroll speed changes a map was rated with, so the play is easier than its star rating says. Unranked on official osu! for the same reason.
- Mania Difficulty Adjust (DA) with Overall Difficulty 6 or lower. Always 0pp.
- Mania Invert (IN). Always 0pp.`,
  },
  {
    heading: "Mania difficulty uses the Sunny rework",
    body: `osu!mania star rating and pp use the Sunny rework, the same model the Torii client runs in-game. So the pp the client previews for a mania play is the pp the server gives it, one to one. Sunny reads dense jack and long-note patterns more accurately than stock lazer, so those maps are rated fairly instead of being blown out of proportion.`,
  },
  {
    heading: "Mania No Release earns reduced pp",
    body: `No Release (NR) in osu!mania stays ranked, but its pp is cut by 15% (you keep 85%). NR removes the need to time the end of hold notes, so long notes only need a press, which makes the map a bit easier while its difficulty is still measured at full value. A light cut keeps it fair without banning it. It was 30% before mania moved to the Sunny model; now that difficulty is measured properly, 15% is enough.`,
  },
  {
    heading: "Pausing during a play reduces pp",
    body: `Pausing mid-play lets you rest through the hard parts, so each pause takes a bite out of the pp. It is 7% per pause and it compounds: one pause keeps 93%, three keep about 80%, seven keep about 60%. There is no free first pause and no floor, and it applies to every mode. Skipping a break with the in-game skip button is not a pause and does not count.`,
  },
  {
    heading: "Custom rate and Easy variants are allowed",
    body: `Torii ranks custom-rate plays on purpose. These mods skip the usual fixed-value whitelist, so any speed setting still earns pp:

- Double Time (DT)
- Nightcore (NC)
- Half Time (HT)
- Daycore (DC)
- Easy (EZ)

A custom 1.3x DT, a 0.6x HT, a 1.7x NC and so on all earn pp here, and the pp calculator uses the real rate you played at. Standard osu! lazer locks these to fixed values; Torii does not.

For reference, the values they would otherwise be pinned to are HT and DC at 0.75x, DT and NC at 1.5x, and Easy at 2 extra lives (Taiko Easy has no lives lock).`,
  },
  {
    heading: "Beatmap status: pp, leaderboards, and medals",
    body: `Torii can make non-ranked maps count for pp and leaderboards through server overrides. Medals do not follow those overrides. This is the part people get wrong, so here it is in full.

The real osu! statuses are Graveyard, WIP, Pending, Ranked, Approved, Qualified and Loved.

pp and ranked score: a map earns pp if its real status is Ranked or Approved, or if the "all maps give pp" override is on. With that override on, Graveyard, WIP, Pending, Qualified and Loved maps give pp and ranked score too. The mods still have to be pp-eligible.

Leaderboards: a map shows on leaderboards if its real status is Ranked, Approved, Qualified or Loved, or if the "all maps leaderboard" override is on.

Medals: medals always check the map's real status and ignore the overrides completely. So a Graveyard or WIP map that Torii made scoreable and pp-eligible still gives no status-gated medals. The gates per medal type:

- Skill, FC and combo medals: real status must be Ranked or Approved.
- Mod-intro medals: real status must be Ranked, Approved, Qualified or Loved.

Medals are also never awarded on locally-uploaded maps.

For completeness: a lot of grind and joke medals (total hits, key counts, playcount, daily-challenge streaks, most hush-hush secrets) have no status gate at all, so those can unlock on any map including Graveyard, same as on official osu!. The "no medals on non-ranked maps" line only applies to the skill and mod medals above.`,
  },
  {
    heading: "When a play counts toward playtime",
    body: `A passed score always counts toward playtime.

A failed score only counts if all three are true:

- The play lasted longer than 8 seconds, and
- Total score is at least 5000, and
- You hit at least the smaller of (10% of the map's objects) or (20 objects).

A failed play that falls short of that does not add to your playtime.`,
  },
  {
    heading: "Failed plays keep their submitted grade",
    body: `The server does not recompute the letter grade. It keeps whatever rank the client sent, so a failed play is recorded as an F. Failed scores are still saved, but they are left out of pp and out of your best-score lists, which only count passed plays.`,
  },
  {
    heading: "Leaderboards",
    body: `Per-map leaderboards:

- The no-mod Global board merges base, Relax and Autopilot scores into one board for that map. Any other board (a specific mod filter, or a non-global board) shows only that exact mode.
- The Friends board shows scores from people on your friends list, and the Country board shows scores from your country. If one is empty, nobody in that group has a score on the map yet.
- The Team board shows your team.

Restricted users are hidden from every leaderboard and every ranking.`,
  },
  {
    heading: "Auto-banned maps",
    body: `A map whose structure crosses safety limits is auto-banned, and after that every score on it earns 0pp. The limits are structural, for example more than 500000 hit objects (Taiko more than 30000), extreme note density, a slider repeat count over 5000 or control points outside the playfield, heavily overlapping 2B-style objects, or a map spanning more than 24 hours. Once a map is banned it stays banned for all future scores.`,
  },
];

export default function WikiScoringPage() {
  return (
    <WikiShell
      title="Scoring & pp"
      icon="📊"
      accent="fuchsia"
      intro={
        <>
          This is the page you end up on when a score gives 0pp. Leaderboards go by total score, and
          pp is a separate thing that a few specific mods and settings switch off. Everything below is
          what the server actually enforces.
        </>
      }
    >
      {SECTIONS.map((s) => (
        <Section key={s.heading} title={s.heading}>
          <Prose body={s.body} />
        </Section>
      ))}
    </WikiShell>
  );
}
