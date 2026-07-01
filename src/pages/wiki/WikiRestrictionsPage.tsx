import { Link } from "react-router-dom";
import { WikiShell, Section, Callout, BotQuote, RuleList } from "./WikiShell";

// Restrictions & Appeals. Quotes the real client overlay + PM wording so a
// restricted player reading this recognises exactly what they saw.

const DISCORD_INVITE = "https://discord.gg/fZXsZFT5Xv";

export default function WikiRestrictionsPage() {
  return (
    <WikiShell
      title="Restrictions & Appeals"
      icon="🚫"
      accent="amber"
      intro={
        <>
          A restriction is staff pressing pause on an account. Here is what it does, what you will
          see, and how to get it lifted.
        </>
      }
    >
      <Section title="What a restriction means">
        <RuleList
          items={[
            "A restricted account cannot log in or submit scores, and is hidden from every leaderboard.",
            "Restrictions are always a manual staff action. Nothing on Torii auto-restricts you.",
            "It is not always permanent and not always a punishment. Sometimes it is precautionary while staff look into something.",
            "If your activity looks suspicious, staff can restrict the account while they investigate, without prior notice and without owing an explanation up front.",
          ]}
        />
        <p className="text-sm text-white/50">
          There is no fixed strike count. A restriction is a staff call, and it can also be precautionary
          while they look into something. How enforcement actually works is on the{" "}
          <Link to="/wiki/rules#enforcement" className="text-rose-300 hover:text-rose-200 underline">Rules</Link> page.
        </p>
      </Section>

      <Section title="What you will see">
        <p>
          When you try to log in on a restricted account, the client shows a full-screen notice titled
          "Your account is restricted", with the reason if there is one, and this line:
        </p>
        <BotQuote from="Torii client">
          This can be a safety measure or simply while staff look into something, and is not necessarily permanent. If you think this is a mistake or want to appeal, reach out to the admins on our Discord.
        </BotQuote>
        <p>
          You will also get this PM, re-sent on every reconnect:
        </p>
        <BotQuote>
          You are restricted, please wait 1 month before your appeal through a ticket in the discord server.
        </BotQuote>
      </Section>

      <Section title="How to appeal">
        <RuleList
          items={[
            <>Join the <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="text-amber-200 underline hover:text-amber-100">Torii Discord</a> and open a ticket.</>,
            "Be honest and specific. Say what you think happened and why you believe the restriction is wrong or should be lifted.",
            "Give it the wait. Appeals are reviewed by a person, not instantly. The standard ask is to wait about a month before appealing.",
          ]}
        />
        <Callout tone="info" title="One account, one appeal path">
          Do not make a new account to get around a restriction. Ban evasion is itself bannable and it
          will not help your appeal. The ticket is the way back.
        </Callout>
      </Section>
    </WikiShell>
  );
}
