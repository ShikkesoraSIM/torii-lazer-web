import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const TORII_CLIENT_URL =
  "https://github.com/ShikkesoraSIM/torii-osu/releases/latest";

const INJECTOR_RELEASES_URL =
  "https://github.com/MingxuanGame/LazerAuthlibInjection/releases/latest";

const SERVER_HOST = "lazer-api.shikkesora.com";
const API_URL = "https://lazer-api.shikkesora.com";
const WEBSITE_URL = "https://lazer.shikkesora.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function CopyButton({
  value,
  accent = "fuchsia",
  className,
}: {
  value: string;
  accent?: "fuchsia" | "violet";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 900);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cx(
        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition",
        "border-white/10 bg-black/25 text-white/80 hover:border-white/20 hover:bg-black/35",
        accent === "fuchsia" && "hover:border-fuchsia-400/30",
        accent === "violet" && "hover:border-violet-400/30",
        className
      )}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function CodeBox({
  label,
  value,
  accent = "fuchsia",
}: {
  label: string;
  value: string;
  accent?: "fuchsia" | "violet";
}) {
  return (
    <div className={cx("mt-3 rounded-2xl border bg-black/30 p-4", accent === "fuchsia" ? "border-fuchsia-400/20" : "border-violet-400/20")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wider text-white/40">{label}</div>
        <CopyButton value={value} accent={accent} />
      </div>
      <code className={cx("block select-text break-all rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm", accent === "fuchsia" ? "text-fuchsia-200" : "text-violet-200")}>
        {value}
      </code>
    </div>
  );
}

// ─── Feature card data ────────────────────────────────────────────────────────

interface FeatureItem {
  icon: string;
  title: string;
  tag: string;
  tagColor: string;
  description: string;
  preview: React.ReactNode | null;
}

const FEATURES: FeatureItem[] = [
  {
    icon: "📊",
    title: "pp-dev calculations",
    tag: "osu! standard",
    tagColor: "fuchsia",
    description:
      "Torii uses the latest pp-dev algorithm — more up-to-date than what bancho osu! runs. It's the newest version of the pp system, period.",
    preview: null,
  },
  {
    icon: "📋",
    title: "Daily Briefing",
    tag: "exclusive",
    tagColor: "pink",
    description:
      "Every time you open the client, Torii shows a smart daily summary: rank changes, pp gained or lost from recalculations, your top-gaining and worst-losing scores, and more.",
    preview: (
      <div className="mt-3 rounded-xl border border-pink-400/20 bg-black/30 p-3 text-xs">
        <div className="text-[10px] uppercase tracking-widest text-pink-400 mb-1">Rank Pulse</div>
        <div className="text-white font-semibold text-sm mb-0.5">Your rank held steady</div>
        <div className="text-white/50 text-[11px] mb-3">#100 → #100 / 693pp (+0.00pp)</div>
        <div className="text-[10px] uppercase tracking-widest text-pink-400 mb-1">Recalculation Watch</div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 text-[10px]">▲</span>
            <span className="text-green-300 text-[11px]">+17.36pp</span>
            <span className="text-white/40 text-[11px] truncate">Party Favor - Booty Loose...</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 text-[10px]">▼</span>
            <span className="text-red-300 text-[11px]">-9.37pp</span>
            <span className="text-white/40 text-[11px] truncate">Erika - I Don't Know...</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: "🎨",
    title: "Custom UI hue",
    tag: "exclusive",
    tagColor: "pink",
    description:
      "Dial in the exact color you want for the entire client — menus, overlays, song select, settings panel. One slider, full 360° control. Apply it everywhere or just in specific places.",
    preview: (
      <div className="mt-3 rounded-xl border border-purple-400/20 bg-black/30 p-3 text-xs">
        <div className="text-white/50 text-[11px] mb-2">Custom UI hue</div>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }} />
          <span className="text-white font-bold text-sm rounded-lg px-2 py-1" style={{ background: "#7c3aed" }}>280°</span>
        </div>
        <div className="mt-2 text-white/40 text-[10px]">Applied to: menus · overlays · settings panel</div>
      </div>
    ),
  },
  {
    icon: "⚡",
    title: "Performance extras",
    tag: "performance",
    tagColor: "orange",
    description:
      "Unlimited FPS, NVIDIA Reflex support, AMD Anti-Lag 2 — the performance-first extras baked right into the Torii client.",
    preview: (
      <div className="mt-3 rounded-xl border border-orange-400/20 bg-black/30 p-3 text-xs">
        <div className="space-y-1.5 text-[11px]">
          {["Unlimited FPS", "NVIDIA Reflex", "AMD Anti-Lag 2"].map(item => (
            <div key={item} className="flex items-center gap-2">
              <span className="text-orange-400">⚡</span>
              <span className="text-white/70">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: "🎹",
    title: "Mania Sunny rework",
    tag: "osu!mania",
    tagColor: "yellow",
    description:
      "osu!mania pp runs the Sunny algorithm rework — a more accurate model for key-based gameplay that better captures jack, stream, and LN difficulty.",
    preview: (
      <div className="mt-3 rounded-xl border border-yellow-400/20 bg-black/30 p-3 text-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-yellow-500/20 border border-yellow-400/30 px-2 py-0.5 text-yellow-200 text-[11px] font-bold">Mania</span>
          <span className="text-white/40 text-[11px]">Sunny rework active</span>
        </div>
        <div className="text-white/55 text-[11px]">Skill-based weighting for 4K–8K, jack, stream, and LN patterns.</div>
      </div>
    ),
  },
  {
    icon: "🏅",
    title: "User title badges",
    tag: "exclusive",
    tagColor: "violet",
    description:
      "Server groups and roles show up as colored badges next to usernames throughout the client — in chat, leaderboards, and profiles. Each badge has its own color and style.",
    preview: (
      <div className="mt-3 rounded-xl border border-violet-400/20 bg-black/30 p-3 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {([
            { label: "NYA", color: "#f472b6" },
            { label: "DEV", color: "#818cf8" },
            { label: "MOD", color: "#34d399" },
          ] as const).map(({ label, color }) => (
            <span
              key={label}
              className="rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide border"
              style={{ color, borderColor: `${color}55`, background: `${color}18` }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-2 text-white/40 text-[10px]">Visible in chat, leaderboards & profiles.</div>
      </div>
    ),
  },
  {
    icon: "💾",
    title: "Zero-loss migration",
    tag: "setup",
    tagColor: "sky",
    description:
      "The built-in setup wizard detects your existing osu! install and migrates maps, skins, scores, and settings automatically. No manual copying. No starting from scratch.",
    preview: (
      <div className="mt-3 rounded-xl border border-sky-400/20 bg-black/30 p-3 text-xs">
        <div className="space-y-1.5 text-[11px]">
          {["Maps & beatmaps", "Skins", "Settings & keybinds", "Local scores"].map(item => (
            <div key={item} className="flex items-center gap-2">
              <span className="text-green-400 font-bold">✓</span>
              <span className="text-white/60">{item} migrated automatically</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: "🔀",
    title: "Multi-server in one click",
    tag: "exclusive",
    tagColor: "pink",
    description:
      "Switch between Torii, g0v0, vipsu, m1pp and other compatible servers directly from the settings panel. No manual URL editing — just tap and reconnect.",
    preview: (
      <div className="mt-3 rounded-xl border border-blue-400/20 bg-black/30 p-3 text-xs">
        <div className="text-white/50 text-[11px] mb-2">Popular Torii-compatible servers</div>
        <div className="flex flex-wrap gap-1.5">
          {(["Torii", "g0v0", "vipsu", "m1pp"] as const).map((s, i) => (
            <span key={s} className={cx("rounded-full px-3 py-1 text-[11px] font-semibold border", i === 0 ? "bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200" : "bg-white/5 border-white/10 text-white/60")}>{s}</span>
          ))}
        </div>
      </div>
    ),
  },
];

const TAG_COLORS: Record<string, string> = {
  fuchsia: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200",
  pink: "border-pink-400/30 bg-pink-500/10 text-pink-200",
  violet: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  yellow: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  green: "border-green-400/30 bg-green-500/10 text-green-200",
  sky: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  orange: "border-orange-400/30 bg-orange-500/10 text-orange-200",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function HowToJoinPage() {
  const featuresRef = useRef<HTMLDivElement>(null);
  const toriiSetupRef = useRef<HTMLDivElement>(null);
  const injectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = "#030014";
    document.documentElement.style.background = "#030014";
    return () => {
      document.body.style.background = prev;
      document.documentElement.style.background = prevHtml;
    };
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030014]">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 -left-56 h-[640px] w-[640px] rounded-full bg-fuchsia-500/20 blur-[150px]" />
        <div className="absolute top-1/3 -right-56 h-[640px] w-[640px] rounded-full bg-violet-500/20 blur-[150px]" />
        <div className="absolute bottom-[-260px] left-1/3 h-[640px] w-[640px] rounded-full bg-sky-400/10 blur-[160px]" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#030014] via-[#030014]/80 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-32 pt-20 md:pt-24">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-1.5 text-sm text-fuchsia-200 mb-6">
            <span>🎌</span>
            <span>Play on Torii</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Join the Torii server
          </h1>
          <p className="mx-auto max-w-2xl text-white/60 text-lg">
            Pick a method. The{" "}
            <span className="text-fuchsia-300 font-medium">Torii osu! client</span>{" "}
            is recommended — it comes with exclusive features and migrates your existing data automatically. The injector lets you use your current osu!lazer install instead.
          </p>
        </motion.div>

        {/* ── Two option cards ──────────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">

          {/* Torii Client (recommended) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            onClick={() => scrollTo(featuresRef)}
            className="relative cursor-pointer rounded-3xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-950/60 via-purple-950/40 to-black/40 p-8 backdrop-blur transition hover:border-fuchsia-400/60 group flex flex-col"
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") scrollTo(featuresRef); }}
          >
            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: "0 0 60px rgba(232,72,229,0.10) inset" }} />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-1 text-xs font-semibold text-fuchsia-200 mb-3">
                  ✨ Recommended
                </span>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  Torii osu! Client
                </h2>
              </div>
              <div className="text-4xl select-none">🎌</div>
            </div>

            <p className="text-white/65 mb-6 leading-relaxed text-sm">
              A custom build of osu!lazer made for Torii. Comes with exclusive features and a setup wizard that automatically migrates your maps, skins, and settings from your existing osu! install — no starting from scratch.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {["pp-dev calculations", "Daily briefing", "Custom UI hue", "Multi-server", "Mania Sunny rework", "CTB & Taiko RX leaderboards", "Zero-loss migration", "Unlimited FPS"].map(f => (
                <span key={f} className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/5 px-2.5 py-1 text-xs text-fuchsia-200/75">{f}</span>
              ))}
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-center gap-2 w-full rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-fuchsia-500/25 group-hover:border-fuchsia-400/60">
                <span>Explore features & setup</span>
                <motion.span
                  animate={{ y: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="text-fuchsia-300"
                >↓</motion.span>
              </div>
              <p className="mt-2 text-xs text-white/30 text-center">Click to see what's inside</p>
            </div>
          </motion.div>

          {/* Injector */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            onClick={() => scrollTo(injectorRef)}
            className="cursor-pointer rounded-3xl border border-white/8 bg-white/3 p-8 backdrop-blur transition hover:border-violet-400/30 hover:bg-white/5 group flex flex-col"
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") scrollTo(injectorRef); }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200 mb-3">
                  Official-compatible
                </span>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  Injector method
                </h2>
              </div>
              <div className="text-4xl select-none">💉</div>
            </div>

            <p className="text-white/65 mb-6 leading-relaxed text-sm">
              Use an auth injector with your current osu!lazer install. Your maps, skins, settings, and local scores stay exactly where they are. Works with official builds.
            </p>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-5 mb-6">
              <p className="mb-3 text-sm font-semibold text-white">What you get</p>
              <ul className="space-y-2 text-sm text-white/55">
                <li>• Keeps all your existing maps, skins, settings & scores</li>
                <li>• Works with the latest official osu!lazer builds</li>
                <li>• Switch back to official servers any time</li>
              </ul>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-center gap-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white/80 transition group-hover:border-violet-400/25">
                View setup steps ↓
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Features showcase ─────────────────────────────────────────── */}
        <div ref={featuresRef} className="scroll-mt-24 mt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              What's inside the Torii client
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm">
              These are actual features you get from day one — not promises.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur hover:border-white/14 hover:bg-white/5 transition flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-2xl select-none">{f.icon}</span>
                  <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0", TAG_COLORS[f.tagColor])}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{f.title}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{f.description}</p>
                {f.preview}
              </motion.div>
            ))}
          </div>

          {/* CTA below features */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-10 text-center"
          >
            <button
              onClick={() => scrollTo(toriiSetupRef)}
              className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-fuchsia-500/25 hover:border-fuchsia-400/60"
            >
              Set up the Torii client
              <span className="text-fuchsia-300">↓</span>
            </button>
          </motion.div>
        </div>

        {/* ── Torii client setup ────────────────────────────────────────── */}
        <div ref={toriiSetupRef} className="scroll-mt-24 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl select-none">🎌</span>
              <h3 className="text-3xl font-bold text-white">Torii osu! Client — setup</h3>
            </div>
            <p className="text-white/45 mb-8 ml-12">Download, run, done. The wizard handles the rest.</p>

            <div className="rounded-3xl border border-fuchsia-400/15 bg-white/3 p-8 backdrop-blur">
              <ol className="space-y-10 text-white/70">

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 text-sm font-bold text-fuchsia-200">1</span>
                    <span className="font-semibold text-white text-lg">Download the Torii client</span>
                  </div>
                  <div className="ml-11">
                    <p className="text-sm mb-3 text-white/55">Head to the latest GitHub release and grab the Windows portable build.</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-fuchsia-400/20 bg-black/30 p-4">
                      <a className="break-all text-fuchsia-300 underline text-sm" href={TORII_CLIENT_URL} target="_blank" rel="noreferrer">
                        {TORII_CLIENT_URL}
                      </a>
                      <CopyButton value={TORII_CLIENT_URL} accent="fuchsia" />
                    </div>
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 text-sm font-bold text-fuchsia-200">2</span>
                    <span className="font-semibold text-white text-lg">Extract and run</span>
                  </div>
                  <div className="ml-11 text-sm text-white/55">
                    Unzip anywhere and launch <code className="text-fuchsia-200 bg-fuchsia-500/10 rounded px-1.5 py-0.5">osu!.exe</code>. The setup wizard appears on first launch.
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 text-sm font-bold text-fuchsia-200">3</span>
                    <span className="font-semibold text-white text-lg">Follow the setup wizard</span>
                  </div>
                  <div className="ml-11">
                    <p className="text-sm mb-3 text-white/55">The wizard asks if you want to import from an existing osu! install. Point it at your current osu! folder — it migrates maps, skins, and settings automatically.</p>
                    <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4 text-sm">
                      <p className="text-sky-200 font-semibold mb-1">💡 Tip</p>
                      <p className="text-white/55">Skipped the wizard? Run it later from <span className="text-white/75 font-medium">Settings → Torii → Manage Torii data source</span>.</p>
                    </div>
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 text-sm font-bold text-fuchsia-200">4</span>
                    <span className="font-semibold text-white text-lg">Server is pre-configured</span>
                  </div>
                  <div className="ml-11">
                    <p className="text-sm mb-3 text-white/55">The Torii client points to the server by default. If you ever need to set it manually (e.g. switching servers), go to <span className="text-white/75">Settings → Torii → Server</span>:</p>
                    <CodeBox label="Server Address" value={SERVER_HOST} accent="fuchsia" />
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 text-sm font-bold text-fuchsia-200">5</span>
                    <span className="font-semibold text-white text-lg">Log in and play</span>
                  </div>
                  <div className="ml-11 text-sm text-white/55">
                    Log in with your Torii account (or register one) and you're ready. All exclusive features are active by default.
                  </div>
                </li>

              </ol>
            </div>
          </motion.div>
        </div>

        {/* ── Injector setup ────────────────────────────────────────────── */}
        <div ref={injectorRef} className="scroll-mt-24 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl select-none">💉</span>
              <h3 className="text-3xl font-bold text-white">Injector method</h3>
            </div>
            <p className="text-white/45 mb-8 ml-12">Keep your existing osu!lazer. Works with official builds.</p>

            <div className="rounded-3xl border border-white/8 bg-white/3 p-8 backdrop-blur">
              <p className="text-white/55 mb-8 text-sm">
                This patches auth into your existing osu!lazer so it connects to Torii. Your maps, skins, and settings stay exactly as they are. You'll set API + Website URLs in settings, then restart twice.
              </p>

              <ol className="space-y-10 text-white/70">

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30 text-sm font-bold text-violet-200">1</span>
                    <span className="font-semibold text-white text-lg">Download the injector (.dll)</span>
                  </div>
                  <div className="ml-11">
                    <p className="text-sm mb-3 text-white/55">Download the latest release and grab the <code className="text-violet-200 bg-violet-500/10 rounded px-1.5 py-0.5">.dll</code> from the release assets.</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-violet-400/20 bg-black/30 p-4">
                      <a className="break-all text-violet-300 underline text-sm" href={INJECTOR_RELEASES_URL} target="_blank" rel="noreferrer">
                        {INJECTOR_RELEASES_URL}
                      </a>
                      <CopyButton value={INJECTOR_RELEASES_URL} accent="violet" />
                    </div>
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30 text-sm font-bold text-violet-200">2</span>
                    <span className="font-semibold text-white text-lg">Open your osu! folder</span>
                  </div>
                  <div className="ml-11 text-sm text-white/55">
                    Open osu!lazer → hamburger menu → <span className="text-white/75">Open osu! folder</span>.
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30 text-sm font-bold text-violet-200">3</span>
                    <span className="font-semibold text-white text-lg">Place .dll into the rulesets folder</span>
                  </div>
                  <div className="ml-11 text-sm text-white/55">
                    Inside the osu! folder, find <code className="text-violet-200 bg-violet-500/10 rounded px-1.5 py-0.5">rulesets/</code> and drop the .dll file there.
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30 text-sm font-bold text-violet-200">4</span>
                    <span className="font-semibold text-white text-lg">Restart osu!lazer (first restart)</span>
                  </div>
                  <div className="ml-11 text-sm text-white/55">
                    Fully close and reopen osu!lazer so the injector loads.
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30 text-sm font-bold text-violet-200">5</span>
                    <span className="font-semibold text-white text-lg">Set API + Website in Settings → Rulesets</span>
                  </div>
                  <div className="ml-11">
                    <div className="grid gap-3 md:grid-cols-2">
                      <CodeBox label="API" value={API_URL} accent="violet" />
                      <CodeBox label="Website" value={WEBSITE_URL} accent="violet" />
                    </div>
                  </div>
                </li>

                <li>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30 text-sm font-bold text-violet-200">6</span>
                    <span className="font-semibold text-white text-lg">Press Apply, then restart once more</span>
                  </div>
                  <div className="ml-11 text-sm text-white/55">
                    Click Apply to save — then restart osu!lazer a second time for the connection to fully apply.
                  </div>
                </li>
              </ol>

              {/* Safety notice */}
              <div className="mt-10 rounded-2xl border border-violet-400/20 bg-violet-500/8 p-6">
                <p className="mb-2 text-sm font-semibold text-white">Account safety</p>
                <p className="text-sm text-white/55">
                  osu! explicitly permits custom rulesets and custom servers. This is simply osu!lazer connecting to a different server — your osu! account is not at risk. You can switch back to the official servers any time by clearing the fields and pressing Apply.
                </p>
              </div>

              {/* Switch back */}
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-6">
                <p className="mb-2 text-sm font-semibold text-white">Switching back to official osu!</p>
                <ol className="space-y-2 text-sm text-white/55">
                  <li>1) Clear the API and Website fields (leave them empty)</li>
                  <li>2) Press Apply</li>
                  <li>3) Restart osu!lazer</li>
                </ol>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
