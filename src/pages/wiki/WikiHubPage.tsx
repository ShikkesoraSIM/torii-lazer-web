import { WikiShell, HubCard } from "./WikiShell";

// Landing page for the Torii wiki: a clean grid of icon + title tiles, no
// per-card blurb. Pick a section and go.

const DISCORD_INVITE = "https://discord.gg/fZXsZFT5Xv";

export default function WikiHubPage() {
  return (
    <WikiShell
      title="Torii Wiki"
      icon="📖"
      showBack={false}
      intro={<>How Torii works, and the rules everyone plays by.</>}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <HubCard to="/wiki/rules" icon="📜" accent="rose" title="Rules" />
        <HubCard to="/wiki/features" icon="✨" accent="violet" title="Features" />
        <HubCard to="/wiki/scoring" icon="📊" accent="fuchsia" title="Scoring & pp" />
        <HubCard to="/wiki/economy" icon="🪙" accent="amber" title="Points & Economy" />
        <HubCard to="/wiki/toriihalo" icon="🤖" accent="violet" title="ToriiHalo Bot" />
        <HubCard to="/wiki/restrictions" icon="🚫" accent="amber" title="Restrictions & Appeals" />
        <HubCard to="/wiki/faq" icon="❓" accent="emerald" title="FAQ" />
        <HubCard to="/how-to-join" icon="🎌" accent="fuchsia" title="Getting Started" />
        <HubCard to={DISCORD_INVITE} icon="💬" accent="violet" external title="Discord" />
      </div>
    </WikiShell>
  );
}
