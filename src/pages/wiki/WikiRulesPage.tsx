import { Link } from "react-router-dom";
import { WikiShell, Section, RuleList, Callout, Toc } from "./WikiShell";

// The Rules page. The guiding idea is good faith, stated up top. The detail
// below follows the official Torii ruleset, reorganised by activity.

const TOC = [
  { id: "conduct", label: "Respect & conduct" },
  { id: "accounts", label: "Accounts" },
  { id: "cheating", label: "Cheating & exploits" },
  { id: "maps", label: "Maps & farming" },
  { id: "profile", label: "Profile content" },
  { id: "enforcement", label: "Enforcement" },
];

const DISCORD_INVITE = "https://discord.gg/fZXsZFT5Xv";

export default function WikiRulesPage() {
  return (
    <WikiShell
      title="Rules"
      icon="📜"
      accent="rose"
      intro={<>The short version: play in good faith and you are fine. You really do not need to memorize this page.</>}
    >
      <Callout tone="good" title="The one that actually matters: good faith">
        If you play fair and you are not trying to abuse anything, you will never have a problem on Torii,
        whether or not you have read a single rule below. And if something ever feels wrong, broken, or
        like it should not be possible, take that as your cue to report it. That is genuinely how this
        works. The rest of the page is just detail.
      </Callout>

      <div className="mt-8 flex gap-10">
        <Toc items={TOC} />

        <div className="flex-1 min-w-0">
          <Section id="conduct" title="1. Respect & conduct">
            <RuleList
              items={[
                "Be respectful. Harassment, severe insults, discrimination, doxxing, threats and targeted abuse are not allowed.",
                "Do not impersonate staff or other players.",
                "Keep chat usable. No spam, and no advertising other servers.",
              ]}
            />
          </Section>

          <Section id="accounts" title="2. Accounts">
            <RuleList
              items={[
                "One account per person. Using alternate accounts for an advantage, for ban evasion, or to manipulate rankings is prohibited.",
                "No account sharing. You are responsible for everything that happens on your account.",
                "Ban or suspension evasion (making or using other accounts to get around a sanction) may lead to an immediate permanent ban.",
                "No buying, selling, trading or boosting accounts.",
              ]}
            />
          </Section>

          <Section id="cheating" title="3. Cheating & exploits">
            <RuleList
              items={[
                "No cheat tools, unauthorized client manipulation, bug abuse, or score manipulation of any kind.",
                "Do not tamper with replays, scores or mods before they reach the server.",
                "Confirmed cheating gets you banned.",
              ]}
            />
          </Section>

          <Section id="maps" title="4. Maps & farming">
            <p>
              On Torii, unranked and graveyard maps give pp, and submitted maps are ranked right away. That
              also means a broken or abusable map can pay out unfair pp.
            </p>
            <RuleList
              items={[
                "Abusing anything in bad faith for unfair gain is bannable. That covers broken or abusable maps, pp farms, bugs and exploits, not one specific case.",
                "If you find something abusable (a map, a bug, an exploit), report it. Hiding it so you can farm it quietly is the bad-faith part, and that is what gets you in trouble.",
                "Staff can disqualify abused maps and the scores set on them.",
              ]}
            />
            <Callout tone="warn" title="Found something broken? Report it">
              Report it in{" "}
              <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="text-amber-200 underline hover:text-amber-100">Discord</a>.
              Reporting is always the safe move. Quietly farming it is not.
            </Callout>
          </Section>

          <Section id="profile" title="5. Profile content">
            <RuleList
              items={[
                "If your avatar or banner is NSFW or suggestive and it is not flagged as NSFW, you will get a warning.",
                "Illegal or extreme content is strictly prohibited and may result in immediate, severe sanctions.",
              ]}
            />
          </Section>

          <Section id="enforcement" title="6. Enforcement">
            <p>
              There is no rigid strike count. Staff use their judgement. Acting in bad faith (cheating,
              abusing something on purpose, evading a ban) gets you banned, sometimes after a single
              heads-up and sometimes not. Usually the first time someone abuses something without reporting
              it, they get one warning that it cannot happen again. If it happens again, that is it.
            </p>
            <p>
              Staff can also restrict an account as a precaution while they look into something, with no
              notice and no explanation up front. If that happens, you will notice the next time you try to
              log in. Come talk to us in Discord and we will explain.
            </p>
            <RuleList
              items={[
                "Bans and restrictions are always a manual staff decision. Nothing auto-bans you.",
                "If you are restricted, open a ticket in the Discord to ask about it or appeal.",
                "Lying or destroying evidence while staff look into something only makes it worse.",
              ]}
            />
            <p className="text-sm text-white/50">
              What a restriction looks like in the client and how to appeal it is on the{" "}
              <Link to="/wiki/restrictions" className="text-amber-300 hover:text-amber-200 underline">Restrictions & Appeals</Link> page.
            </p>
          </Section>

          <Callout tone="info" title="Not sure about something?">
            If a rule here is unclear or clashes with what the client actually does, ask in Discord.
          </Callout>
        </div>
      </div>
    </WikiShell>
  );
}
