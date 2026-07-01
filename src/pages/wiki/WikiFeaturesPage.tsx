import { Link } from "react-router-dom";
import { WikiShell, Section, Callout } from "./WikiShell";

// The Features catalog. Every entry was checked against the client source so
// stock osu!lazer features are not claimed as Torii's, and the descriptions
// carry the real hotkeys, settings paths and values. The heavy cosmetics list
// sits last on purpose so the meatier sections come first.

interface Feature {
  name: string;
  description: string;
}
interface Group {
  category: string;
  icon: string;
  features: Feature[];
}

const GROUPS: Group[] = [
  {
    category: "Gameplay & pp",
    icon: "🎯",
    features: [
      { name: "Torii pp (pp-dev)", description: "Torii ranks your plays with its own server-side pp system instead of the standard one. There is nothing to switch on, it just applies while you are online and connected to Torii." },
      { name: "Mania Sunny rework", description: "osu!mania star rating is calculated with the Sunny rework instead of stock lazer's mania algorithm, so every mania map's difficulty here comes from it." },
      { name: "Confirm Retry/Quit", description: "After about 60 seconds into a map, Retry and Quit want a second click within 5 seconds so a stray press does not throw away a long run. Continue is never gated. Settings > Gameplay > Torii > Gameplay, off by default." },
      { name: "Mid-map break skip", description: "A SKIP button during breaks fast-forwards to the end of one without touching your score, since breaks have no notes. Press Space or click it; by default it needs a second press within 2.5s. Single-press is an option in Settings > Gameplay > Torii > Gameplay." },
    ],
  },
  {
    category: "Performance",
    icon: "⚡",
    features: [
      { name: "Potato Mode", description: "A low-end preset ('Potato mode', Settings > Torii > Graphics) that strips almost every effect: triangles, beat-sync pulsing, storyboards, blur, hit lighting, kiai flashes, fountains, parallax, seasonal backgrounds, auras and cursor trails, and switches to the legacy audio engine. It reads once at startup and leaves your own graphics settings alone, so it restarts the game." },
      { name: "Thread rate (Hz)", description: "Sets how fast the input, audio and update threads run: 500, 1000, 2000, 4000 or 8000 Hz. Higher suits a high-polling mouse but costs CPU, and 2000 is the default. In Settings > Torii > Graphics (and Graphics > Renderer), applies instantly. Weaker machines start lower on their own." },
      { name: "Dangerous thread uncap", description: "The experimental Unlimited frame limiter is stock lazer; what Torii adds is a checkbox ('I am stupid, I ignore warnings and want no limits', Settings > Graphics > Renderer) that also uncaps the update, input and audio threads, not just rendering. It can cause audio pops and heat, and Torii greys it out on Deferred renderers where it would leak memory and crash." },
      { name: "Low-latency audio (Oboe)", description: "Android only (Settings > Torii > Android). Routes audio through Google's Oboe library for much lower latency, roughly 15 to 30 ms on supported devices, and falls back to OpenSL ES on older phones. Applies instantly, and turning it off is a safe escape hatch." },
    ],
  },
  {
    category: "Client & quality of life",
    icon: "🧰",
    features: [
      { name: "Daily Briefing", description: "On login, a card comparing this session to your last: global and country rank, pp, recalc gains and losses on your top scores, unread chat, and snipe and leaderboard events. Reopen or refresh it in Settings > Torii > Briefing." },
      { name: "Recalculation replay", description: "Re-shows the per-score pp gains and losses from the last server-side mass recalc, each top play listed as old pp to new pp. Settings > Torii > Briefing, 'Replay last recalc'." },
      { name: "Legacy song select", description: "Makes song select look like osu!stable: the skinnable stable footer, with the modern filter bar and info wedges hidden. Settings > Torii > Song Select." },
      { name: "Legacy footer", description: "Just the stable-style footer over the normal lazer song select. Settings > Torii > Song Select, and only changeable while full legacy song select is off." },
      { name: "Unslanted song select", description: "Re-renders the slanted song-select panels as straight rectangles. 'Strictly vertical UI (no slant)' in Settings > Torii > Song Select. Takes effect next time you enter song select." },
      { name: "Auto-hide toolbar", description: "Hides the top toolbar and reveals it when the cursor reaches the top edge of the screen, then tucks it away after about 1.5s. Settings > Torii > Menus." },
      { name: "Key debounce", description: "Drops a gameplay key press that fires too soon after that same key's last release, filtering chatter from rapid-trigger or hall-effect keyboards and worn switches. Settings > Input, 'Filter double-taps', with a threshold slider (15ms to start). Gameplay keys only, never typing." },
      { name: "Migration wizard", description: "On first launch it finds an existing osu!lazer data folder and offers to link to it so you reuse your maps, skins, scores and collections right away, or keep Torii portable. Linking needs a restart." },
      { name: "Data-source switch", description: "Switch the client's data between its own portable Torii folder and a linked osu!lazer one. Settings > Torii, 'Manage Torii data source'; applies after a restart. Ships pointed at the portable folder." },
      { name: "Restriction notice", description: "If your account is restricted, you get a panel explaining the reason and whether or when it lifts, with a Discord button to appeal, instead of just bouncing off the login form." },
      { name: "NEW badges", description: "A small NEW tag on a setting Torii just added, so it is easy to find. It clears for good after you use that control three times." },
    ],
  },
  {
    category: "Social & profile",
    icon: "👥",
    features: [
      { name: "Live server pulse", description: "A toolbar pill showing how many people are playing right now, with a dot that pulses and flashes when someone submits a score. Click it for plays per minute, online counts, a sparkline, the top map and live plays. Toggle under Settings > Torii > Menus." },
      { name: "Torii / Torii Nova badge", description: "Online users on a verified Torii build get a small badge by their name: vermillion 'torii' for stable, amber 'nova' for the preview stream, plus a platform icon when the server knows their OS. Hover reads 'Playing on Torii client'." },
      { name: "NSFW media preference", description: "Settings > Torii > Menus, 'Show NSFW profile media': whether you see avatars and covers from profiles flagged NSFW. It saves to your account so it matches the website, and the server swaps flagged images for placeholders." },
    ],
  },
  {
    category: "Customization & skinning",
    icon: "🎨",
    features: [
      { name: "Custom UI hue", description: "Retint the whole client to any hue with the 'Custom UI hue' toggle and 'UI hue' picker in Settings > Torii > Menus. It covers menus, overlays and the settings panel together." },
      { name: "Custom accent UI hue", description: "A second hue just for highlights, hovers and accents ('Separate accent hue', Settings > Torii > Menus). Locked until you own the unlock; clicking the LOCKED pill opens the store." },
      { name: "Grayscale UI theme", description: "A 'Grayscale by fsyori' option in the 'UI theme' dropdown (Settings > Skin, or Torii > Menus) that strips saturation from the UI and mounts a stable-style stats panel in song select. Restarts the game. Chrome only, not gameplay skins." },
      { name: "Per-combo-colour hitcircles", description: "On legacy skins, ship hitcircle1.png, hitcircle2.png and so on (up to 8) next to the normal hitcircle.png and the circle and number art changes with the current combo colour. Skins without the numbered files look exactly like stock lazer." },
      { name: "Torii skin components", description: "In the skin layout editor, Torii's own pieces are gathered into a 'Torii Exclusive Components' section pinned at the top, each marked with a torii-gate icon and a vermillion name." },
      { name: "Mania ratio counter", description: "A skinnable mania ratio counter you add from the skin editor: toggle and edit the header label, pick the font and weight, set the value and label colours, choose 1 to 3 decimals, and turn the per-judgement flash on or off." },
      { name: "Skin pinning", description: "Pin a skin in Settings > Skin and it sorts to the top of the dropdown with a heart prefix. Turn on 'Cycle through favourites only' and the normal skin-cycle keybind steps through just your pinned skins instead of every skin you have." },
      { name: "Cursor-size preview", description: "Change cursor size anywhere with Ctrl+Shift+scroll or Ctrl+Shift+Plus / Ctrl+Shift+Minus, and a small overlay shows your actual cursor at the new size with a readout like 1.20x, fading out after about 1.4s." },
    ],
  },
  {
    category: "Cosmetics & currency",
    icon: "🪙",
    features: [
      { name: "Torii points", description: "An in-game currency you only earn by playing, never with real money. Every earn and spend is written to a server-side ledger you open from the coin pill in the toolbar." },
      { name: "Top play reward", description: "Setting a new personal best on a map is the main way points come in. The amount, the daily cap and a top-play-history requirement are decided server-side. Exact numbers are on the Points & Economy page." },
      { name: "Daily play bonus + streak", description: "Your first pass each day gives a small bonus, and a day-over-day streak adds more up to a cap, resetting if you skip a day. It shows up as a 'Daily play' entry." },
      { name: "Daily Challenge reward", description: "Completing the daily challenge pays out points once per day, granted server-side." },
      { name: "Medal reward", description: "Earning a new medal grants a few points, shown as a 'Medal' entry and rolled into the post-play card." },
      { name: "Cosmetic Store", description: "Open it from the Store icon in the toolbar. The Store tab has a daily featured rotation that is the same for everyone with a countdown; the Inventory tab holds what you own and equips with one click. Every item has a live preview before you buy." },
      { name: "Cursor trails", description: "The main store item: 36 of them across Basic, Special and Premium tiers, from solid and gradient ribbons to particle effects (stars, hearts, sakura, snow, flames, galaxy dust) and connected ribbons (comet, rainbow, neon, nebula). An equipped trail replaces your skin's trail." },
      { name: "Username colours", description: "6 solid and 4 gradient name colours you buy and equip. Your name then shows in that colour anywhere the client tints usernames." },
      { name: "Role name colours", description: "If you are in a server group with a colour (admin, supporter, and so on) you get it free, drawn as a soft glow around the letters. These are never sold." },
      { name: "User auras", description: "A particle effect behind your name everywhere it appears. Most come from a role or group; if you have more than one, pick which to show in Settings > Torii (User Aura), or turn the effect off there." },
      { name: "Buyable & seasonal auras", description: "The Summer 2026 aura is the one currently on sale (3000 points) and can also be earned through the summer event. Stardust sits in the gallery but is not on sale right now. Every other aura is earned." },
      { name: "Trail customisation unlock", description: "A one-time 100-point unlock that turns on length, size and density sliders for every cursor trail you own. Until then a trail uses its default look." },
      { name: "Custom accent-hue unlock", description: "A one-time 5000-point unlock for the second UI accent hue, which touches highlights and accents only. It used to be a supporter perk." },
      { name: "Redeem & access codes", description: "Staff hand out codes that grant points and sometimes a cosmetic. Redeem one with the 'Redeem' pill in the store header. Each code has a use limit set when it is made." },
      { name: "Gifts", description: "Staff can send you points and/or a cosmetic with a note. It shows up after a play, back at the menu, as a wrapped present you click to open." },
      { name: "Points pill + earn summary", description: "The coin pill in the toolbar is your balance, and clicking it opens your history. After a play, everything you earned is combined into one card with a per-source breakdown and your new balance." },
      { name: "Points history", description: "Every earn and spend, newest first, with the reason, the amount (green for gains, red for spends) and your running balance. It loads 50 at a time." },
    ],
  },
];

export default function WikiFeaturesPage() {
  return (
    <WikiShell
      title="Features"
      icon="✨"
      accent="violet"
      intro={
        <>
          Torii is a custom osu!lazer build, so it carries a pile of things stock osu! does not.
          Here is what is in it.
        </>
      }
    >
      {GROUPS.map((group) => (
        <Section key={group.category} title={`${group.icon}  ${group.category}`}>
          {group.category === "Cosmetics & currency" && (
            <Callout tone="info" title="The economy is still being tuned">
              The points and the store work, but the numbers are placeholder and the whole economy gets
              wiped before the public launch, so whatever you pile up now will not carry over. Exact
              amounts are on the{" "}
              <Link to="/wiki/economy" className="text-amber-200 underline hover:text-amber-100">Points &amp; Economy</Link> page.
            </Callout>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {group.features.map((f) => (
              <div key={f.name} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 backdrop-blur">
                <h3 className="mb-1 text-sm font-bold text-white">{f.name}</h3>
                <p className="text-xs text-white/55 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </WikiShell>
  );
}
