import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

// GitHub releases. /releases/latest only ever resolves to the newest
// non-prerelease, which is our stable -torii build, so that's what the stable
// card points at. Nova ships as a prerelease and GitHub has no equivalent
// "latest prerelease" URL, so the card resolves it at runtime (see novaUrl) and
// falls back to the full releases list. Do NOT use `?q=nova`: that searches
// release titles, not tags, and returns "No results".
const TORII_STABLE_URL =
  "https://github.com/ShikkesoraSIM/torii-osu/releases/latest";
const TORII_NOVA_URL =
  "https://github.com/ShikkesoraSIM/torii-osu/releases";

const SERVER_HOST = "lazer-api.shikkesora.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Platform detection ──────────────────────────────────────────────────────

type Platform = {
  os: "windows" | "mac" | "linux" | "android" | "ios" | "unknown";
  arch: "x64" | "arm64";
};

// Best effort from the browser. Apple Silicon vs Intel can't be read from the
// user agent (Safari says "Intel" on every Mac), so the WebGL renderer string is
// the tell: Apple GPUs report as "Apple M1/M2/..." or "Apple GPU".
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const uaLow = ua.toLowerCase();

  if (/android/.test(uaLow)) return { os: "android", arch: "arm64" };
  if (/iphone|ipad|ipod/.test(uaLow) || (/macintosh/.test(uaLow) && navigator.maxTouchPoints > 1)) return { os: "ios", arch: "arm64" };

  const armHint = /aarch64|arm64|armv8/.test(uaLow);

  if (/windows/.test(uaLow)) return { os: "windows", arch: armHint ? "arm64" : "x64" };

  if (/macintosh|mac os x/.test(uaLow)) {
    let appleSilicon = true;
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      const renderer = info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      if (/intel|amd|radeon|nvidia/i.test(renderer) && !/apple/i.test(renderer)) appleSilicon = false;
    } catch {
      /* sin webgl: asumimos apple silicon, que es lo que tiene casi todo el mundo hoy */
    }
    return { os: "mac", arch: appleSilicon ? "arm64" : "x64" };
  }

  if (/linux|x11|cros/.test(uaLow)) return { os: "linux", arch: armHint ? "arm64" : "x64" };

  return { os: "unknown", arch: "x64" };
}

// The exact release asset for a platform, and how to call it on the button.
function assetFor(platform: Platform, stream: "torii" | "nova"): { file: string; label: string; note?: string } | null {
  switch (platform.os) {
    case "windows":
      return platform.arch === "arm64"
        ? { file: "install-win-arm64.exe", label: "Download for Windows (ARM64)" }
        : { file: "install-win-x64.exe", label: "Download for Windows" };
    case "mac":
      return platform.arch === "arm64"
        ? { file: "Torii-macOS-AppleSilicon.zip", label: "Download for Mac (Apple Silicon)", note: "Unzip, then double-click \"Install Torii.command\"." }
        : { file: "Torii-macOS-Intel.zip", label: "Download for Mac (Intel)", note: "Unzip, then double-click \"Install Torii.command\"." };
    case "linux":
      return platform.arch === "arm64"
        ? { file: "torii-linux-arm64.AppImage", label: "Download AppImage for Linux (ARM64)" }
        : { file: "torii-linux-x64.AppImage", label: "Download AppImage for Linux" };
    case "android":
      // el apk solo sale en nova
      return stream === "nova" ? { file: "torii.apk", label: "Download APK for Android" } : null;
    default:
      return null;
  }
}

const RELEASE_DOWNLOAD = (tag: string, file: string) =>
  `https://github.com/ShikkesoraSIM/torii-osu/releases/download/${tag}/${file}`;

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

// ─── Download streams ─────────────────────────────────────────────────────────

// Two download streams. Same server, same account — they differ in the engine
// underneath and who each one is for. Accent colours line up with the in-client
// badges: rojo estable, ámbar Nova.
const STREAMS = [
  {
    key: "torii",
    icon: "🎌",
    title: "Torii",
    tagline: "The stable version. If you are not sure which one to grab, this is it.",
    badge: "Recommended",
    accent: {
      border: "border-rose-400/30 hover:border-rose-400/60",
      bg: "from-rose-950/60 via-red-950/40 to-black/40",
      badgePill: "border-rose-400/40 bg-rose-500/15 text-rose-200",
      btn: "border-rose-400/40 bg-rose-500/15 group-hover:bg-rose-500/25 group-hover:border-rose-400/60",
      glow: "0 0 60px rgba(244,63,94,0.10) inset",
    },
    points: [
      ".NET 8, tested and solid",
      "Every Torii feature turned on",
      "The one most people run",
    ],
    href: TORII_STABLE_URL,
    cta: "Download Torii",
    available: true,
  },
  {
    key: "nova",
    icon: "🌙",
    title: "Nova",
    tagline: "The bleeding-edge channel. New things land here first.",
    badge: "Preview",
    accent: {
      border: "border-amber-400/30 hover:border-amber-400/60",
      bg: "from-amber-950/60 via-orange-950/30 to-black/40",
      badgePill: "border-amber-400/40 bg-amber-500/15 text-amber-200",
      btn: "border-amber-400/40 bg-amber-500/15 group-hover:bg-amber-500/25 group-hover:border-amber-400/60",
      glow: "0 0 60px rgba(251,191,36,0.10) inset",
    },
    points: [
      ".NET 10, Deferred renderer and D3D12",
      "Experimental features before they hit stable",
      "Can break now and then",
    ],
    href: TORII_NOVA_URL,
    cta: "Download Nova",
    available: true,
  },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export default function HowToJoinPage() {
  const featuresRef = useRef<HTMLDivElement>(null);
  const toriiSetupRef = useRef<HTMLDivElement>(null);

  // Nova ships as a prerelease and GitHub has no "latest prerelease" URL, so we
  // ask the API which -nova tag is newest. The static href stays as the fallback
  // if the call fails or we get rate limited.
  const [novaUrl, setNovaUrl] = useState<string | null>(null);
  // por stream: las releases mas nuevas con sus assets, para linkear SOLO a una que
  // de verdad tenga el archivo (un build en curso o una release vieja no lo tienen).
  const [releasesByStream, setReleasesByStream] = useState<Record<"torii" | "nova", Array<{ tag: string; assets: string[] }>>>({ torii: [], nova: [] });
  const [platform] = useState<Platform>(() => detectPlatform());

  useEffect(() => {
    let cancelled = false;

    fetch("https://api.github.com/repos/ShikkesoraSIM/torii-osu/releases?per_page=30")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((releases: Array<{ tag_name: string; html_url: string; draft: boolean; prerelease: boolean; assets: Array<{ name: string }> }>) => {
        if (cancelled) return;
        const live = releases.filter((r) => !r.draft);
        const newestNova = live.find((r) => r.tag_name.endsWith("-nova"));
        if (newestNova) setNovaUrl(newestNova.html_url);
        const pack = (rs: typeof live) => rs.slice(0, 8).map((r) => ({ tag: r.tag_name, assets: r.assets.map((a) => a.name) }));
        setReleasesByStream({
          torii: pack(live.filter((r) => !r.prerelease)),
          nova: pack(live.filter((r) => r.tag_name.endsWith("-nova"))),
        });
      })
      .catch(() => { /* se queda con los links estaticos */ });

    return () => { cancelled = true; };
  }, []);

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
      {/* Background blobs. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-64 -left-72 h-[560px] w-[560px] rounded-full bg-fuchsia-500/15 blur-[150px]" />
        <div className="absolute top-1/3 -right-56 h-[640px] w-[640px] rounded-full bg-violet-500/20 blur-[150px]" />
        <div className="absolute bottom-[-260px] left-1/3 h-[640px] w-[640px] rounded-full bg-sky-400/10 blur-[160px]" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#030014] via-[#030014]/95 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-32 pt-24 md:pt-28">

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
            Join Torii Server
          </h1>
          <p className="mx-auto max-w-2xl text-white/60 text-lg">
            Torii is played on the{" "}
            <span className="text-fuchsia-300 font-medium">Torii client</span>. Grab
            any of these three versions. They all connect to the same server and
            share your account, so pick whichever runs best on your PC.
          </p>
        </motion.div>

        {/* ── Two download streams ──────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {STREAMS.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.1 }}
              className={cx(
                "relative rounded-3xl border bg-gradient-to-br p-8 backdrop-blur transition group flex flex-col",
                s.accent.border,
                s.accent.bg
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: s.accent.glow }}
              />

              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold mb-3", s.accent.badgePill)}>
                    {s.badge}
                  </span>
                  <h2 className="text-2xl font-bold text-white leading-tight">{s.title}</h2>
                </div>
                <div className="text-4xl select-none">{s.icon}</div>
              </div>

              <p className="text-white/65 mb-5 leading-relaxed text-sm">{s.tagline}</p>

              <ul className="mb-6 space-y-2">
                {s.points.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-white/60 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {(() => {
                  const asset = assetFor(platform, s.key);
                  const withAsset = asset ? releasesByStream[s.key].find((r) => r.assets.includes(asset.file)) : undefined;
                  const direct = withAsset && asset ? RELEASE_DOWNLOAD(withAsset.tag, asset.file) : null;
                  const fallback = s.key === "nova" ? (novaUrl ?? s.href) : s.href;
                  const installLine =
                    platform.os === "mac"
                      ? `curl -fsSL https://lazer.shikkesora.com/install-mac.sh | bash${s.key === "nova" ? " -s -- nova" : ""}`
                      : platform.os === "linux"
                        ? `curl -fsSL https://lazer.shikkesora.com/install-linux.sh | bash${s.key === "nova" ? " -s -- nova" : ""}`
                        : null;

                  return (
                    <>
                      <a
                        href={direct ?? fallback}
                        target="_blank"
                        rel="noreferrer"
                        className={cx(
                          "flex items-center justify-center gap-2 w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-white transition",
                          s.accent.btn,
                          !s.available && "opacity-70"
                        )}
                      >
                        <span>{direct && asset ? asset.label : s.cta}</span>
                        <span aria-hidden>{s.available ? (direct ? "⤓" : "↗") : "…"}</span>
                      </a>

                      {direct && asset?.note && (
                        <p className="mt-2 text-xs text-white/45 text-center">{asset.note}</p>
                      )}

                      {platform.os === "android" && s.key === "torii" && (
                        <p className="mt-2 text-xs text-white/45 text-center">The Android APK ships on the Nova channel.</p>
                      )}

                      {platform.os === "ios" && (
                        <p className="mt-2 text-xs text-white/45 text-center">No iOS build yet. Grab it on a PC, Mac, Linux or Android.</p>
                      )}

                      {installLine && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-2.5">
                          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-white/40">or paste in Terminal (installs and keeps it updated)</div>
                          <div className="flex items-center gap-2">
                            <code className="min-w-0 flex-1 truncate text-xs text-white/80">{installLine}</code>
                            <CopyButton value={installLine} accent={s.key === "nova" ? "violet" : "fuchsia"} />
                          </div>
                        </div>
                      )}

                      <p className="mt-2 text-xs text-white/30 text-center">
                        {direct ? (
                          <>Not your platform? <a className="underline hover:text-white/60" href={fallback} target="_blank" rel="noreferrer">All downloads ↗</a></>
                        ) : s.available ? (
                          <>Opens the releases page with every platform.</>
                        ) : (
                          <>Not out yet. The link takes you to the releases page.</>
                        )}
                      </p>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Features showcase ─────────────────────────────────────────── */}
        <div ref={featuresRef} className="scroll-mt-32 mt-28">
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
        <div ref={toriiSetupRef} className="scroll-mt-32 mt-24">
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
                      <a className="break-all text-fuchsia-300 underline text-sm" href={TORII_STABLE_URL} target="_blank" rel="noreferrer">
                        {TORII_STABLE_URL}
                      </a>
                      <CopyButton value={TORII_STABLE_URL} accent="fuchsia" />
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
                    <p className="text-sm mb-3 text-white/55">The wizard asks if you want to import from an existing osu! install. Point it at your current <a href="https://osu.ppy.sh/wiki/en/Client/Release_stream/Lazer/File_storage" target="_blank" rel="noopener noreferrer" className="text-osu-pink hover:underline">osu! Data folder</a>. It migrates maps, skins, and settings automatically.</p>
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

      </div>
    </div>
  );
}
