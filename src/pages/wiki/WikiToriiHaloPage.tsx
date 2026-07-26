import { Link } from "react-router-dom";
import { WikiShell, Section, BotQuote, Callout } from "./WikiShell";

// ToriiHalo wears two hats: it PMs you in-game (0pp reasons, restrictions) and
// it runs the slash commands on the Discord server. Both are documented here,
// and every command below is read off the cogs so the page cannot drift.

// One row per slash command. Keeping this as data (rather than hand-written
// markup) means adding a command later is a one-line change.
type Cmd = { name: string; args?: string; desc: string };

const OSU_COMMANDS: Cmd[] = [
  { name: "/profile", args: "[user] [mode]", desc: "Torii profile stats for a player. Leave the user out to see your own linked account." },
  { name: "/top", args: "[user] [mode]", desc: "Someone's best plays, sorted by pp." },
  { name: "/recent", args: "[user] [mode]", desc: "Plays from the last 24 hours, fails included." },
  { name: "/score", args: "<id or url>", desc: "One score in detail. Paste a score link straight from the site." },
  { name: "/beatmap", args: "<id or url>", desc: "Beatmap info plus a peek at its leaderboard." },
  { name: "/rankings", args: "[mode] [country]", desc: "The Torii global rankings." },
];

const ECONOMY_COMMANDS: Cmd[] = [
  { name: "/daily", desc: "Your once-a-day coins. Claiming on consecutive days builds a streak, and the streak bonus grows up to day 7." },
  { name: "/work", desc: "A smaller payout on a short cooldown, so there is always something to do between dailies." },
  { name: "/balance", args: "[member]", desc: "How many coins you are sitting on, your streak, and your linked Torii account." },
  { name: "/coinflip", args: "<amount> <heads|tails>", desc: "Bet coins on a flip. Win and you double the bet, lose and it is gone." },
  { name: "/pay", args: "<member> <amount>", desc: "Send coins to somebody else." },
  { name: "/coins_top", desc: "The richest people on the server." },
];

const LINK_COMMANDS: Cmd[] = [
  { name: "/link", args: "<username or id>", desc: "Point your Discord account at your Torii account, so the osu commands know who you are without typing your name every time." },
  { name: "/whoami", desc: "Check which Torii account you are currently linked to." },
  { name: "/unlink", desc: "Remove the link." },
];

const FUN_COMMANDS: Cmd[] = [
  { name: "/owoify", args: "<text>", desc: "Ruins your text. That is the whole feature." },
  { name: "/ping", desc: "Checks the bot is awake." },
];

function CommandTable({ commands }: { commands: Cmd[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {commands.map((c) => (
            <tr key={c.name} className="border-b border-white/5 last:border-0 align-baseline">
              <td className="whitespace-nowrap py-2.5 pr-4">
                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-violet-200">{c.name}</code>
                {c.args && <span className="ml-2 font-mono text-xs text-white/35">{c.args}</span>}
              </td>
              <td className="py-2.5 text-white/70">{c.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WikiToriiHaloPage() {
  return (
    <WikiShell
      title="ToriiHalo"
      icon="🤖"
      accent="violet"
      intro={
        <>
          ToriiHalo does two jobs. In game it PMs you when a score gives 0pp or your account status
          changes. On the Discord server it runs the slash commands below, from looking up scores to
          the coin economy.
        </>
      }
    >
      <Section title="On Discord: getting started">
        <Callout tone="info" title="These are Discord commands">
          Everything in this section runs on the Torii Discord server, not in the game. Type a slash
          in any channel and Discord will show you the list as you type.
        </Callout>
        <p>
          Start with <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-violet-200">/link</code>.
          It ties your Discord account to your Torii one, which means the other commands already know
          who you are and you can write <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-violet-200">/top</code> instead
          of spelling out your username every time.
        </p>
        <CommandTable commands={LINK_COMMANDS} />
      </Section>

      <Section title="On Discord: scores and profiles">
        <p>
          These read straight from Torii, so what you see on Discord is what the server has. Leave the
          user out of any of them and the bot uses your linked account.
        </p>
        <CommandTable commands={OSU_COMMANDS} />
      </Section>

      <Section title="On Discord: Torii Coins">
        <p>
          Coins are the Discord server's own currency. You collect them by showing up, and they are
          separate from the points you earn in game by playing.
        </p>
        <CommandTable commands={ECONOMY_COMMANDS} />
        <Callout tone="warn" title="Coins are not pp">
          Nothing you do with coins touches your rank, your pp or your scores. They live on Discord.
        </Callout>
      </Section>

      <Section title="On Discord: the rest">
        <CommandTable commands={FUN_COMMANDS} />
        <p className="text-sm text-white/50">
          The bot also posts on its own: recent plays as score cards, o!rdr render notifications and
          the daily challenge. Those need no command.
        </p>
      </Section>

      <Section title="In game: when a score gives 0pp">
        <p>
          If a play submits but earns no pp, ToriiHalo PMs you the reason in game. The three you
          might see:
        </p>
        <div className="space-y-3">
          <BotQuote>
            Your score gave 0pp! Your accuracy was 71.4%. Relax and Autopilot scores need at least 75% accuracy to earn pp.
          </BotQuote>
          <BotQuote>
            Your score gave 0pp! You changed Flashlight settings. Only default Flashlight settings earn pp, set size, delay and combo-based size back to their defaults.
          </BotQuote>
          <BotQuote>
            Your score gave 0pp, it did not meet the requirements to earn pp.
          </BotQuote>
        </div>
        <p className="text-sm text-white/50">
          The full list of what zeroes pp is on the{" "}
          <Link to="/wiki/scoring" className="text-fuchsia-300 hover:text-fuchsia-200 underline">Scoring & pp</Link> page.
        </p>
      </Section>

      <Section title="In game: when your account is restricted">
        <p>
          If your account gets restricted, ToriiHalo sends a PM in game, and it is re-sent every time
          you reconnect so you do not miss it:
        </p>
        <BotQuote>
          You are restricted, please wait 1 month before your appeal through a ticket in the discord server.
        </BotQuote>
        <p className="text-sm text-white/50">
          What a restriction means and how to appeal is on the{" "}
          <Link to="/wiki/restrictions" className="text-amber-300 hover:text-amber-200 underline">Restrictions & Appeals</Link> page.
        </p>
      </Section>

    </WikiShell>
  );
}
