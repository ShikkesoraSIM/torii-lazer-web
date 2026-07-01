import { Link } from "react-router-dom";
import { WikiShell, Section, BotQuote } from "./WikiShell";

// ToriiHalo: the in-game PM bot. The quotes here are the real messages the
// server sends, so the wiki matches what shows up in chat.

export default function WikiToriiHaloPage() {
  return (
    <WikiShell
      title="ToriiHalo"
      icon="🤖"
      accent="violet"
      intro={
        <>
          ToriiHalo is the bot that messages you in-game. When a score gives 0pp or your account
          status changes, it is the one that tells you.
        </>
      }
    >
      <Section title="When a score gives 0pp">
        <p>
          If a play submits but earns no pp, ToriiHalo PMs you the reason. The three you might see:
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

      <Section title="When your account is restricted">
        <p>
          If your account gets restricted, ToriiHalo sends a PM, and it is re-sent every time you
          reconnect so you do not miss it:
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
