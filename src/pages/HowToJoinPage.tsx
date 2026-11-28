import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FolderSync,
  Gauge,
  Glasses,
  Layers,
  Lock,
  Palette,
  Sliders,
  TrendingUp,
  Volume2,
  Zap,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

// GitHub releases. /releases/latest only ever resolves to the newest
// non-prerelease, which is our stable -torii build, so that's what the stable
// card points at. Nova ships as a prerelease and GitHub has no equivalent
// "latest prerelease" URL, so the card resolves it at runtime (see novaUrl) and
// falls back to the full releases list. Do NOT use `?q=nova`: that searches
// release titles, not tags, and returns "No results".
const TORII_STABLE_URL =
  "https://github.com/ShikkesoraSIM/torii/releases/latest";
const TORII_NOVA_URL =
  "https://github.com/ShikkesoraSIM/torii/releases";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Platform detection ──────────────────────────────────────────────────────

type Platform = {
  os: "windows" | "mac" | "linux" | "android" | "quest" | "ios" | "unknown";
  arch: "x64" | "arm64";
};

// Best effort from the browser. Apple Silicon vs Intel can't be read from the
// user agent (Safari says "Intel" on every Mac), so the WebGL renderer string is
// the tell: Apple GPUs report as "Apple M1/M2/..." or "Apple GPU".
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const uaLow = ua.toLowerCase();

  if (/oculusbrowser|quest/.test(uaLow)) return { os: "quest", arch: "arm64" };
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
        ? { file: "Torii-macOS-AppleSilicon.zip", label: "Download for Mac (Apple Silicon)", note: "Unzip and run \"Install Torii.command\". If macOS blocks it, paste the Terminal line below instead: it skips the quarantine dance entirely." }
        : { file: "Torii-macOS-Intel.zip", label: "Download for Mac (Intel)", note: "Unzip and run \"Install Torii.command\". If macOS blocks it, paste the Terminal line below instead: it skips the quarantine dance entirely." };
    case "linux":
      return platform.arch === "arm64"
        ? { file: "torii-linux-arm64.AppImage", label: "Download AppImage for Linux (ARM64)" }
        : { file: "torii-linux-x64.AppImage", label: "Download AppImage for Linux" };
    case "android":
      // el apk solo sale en nova
      return stream === "nova" ? { file: "torii.apk", label: "Download APK for Android" } : null;
    case "quest":
      return stream === "torii" ? { file: "torii-vr.apk", label: "Download APK for Meta Quest" } : null;
    default:
      return null;
  }
}

const RELEASE_DOWNLOAD = (tag: string, file: string) =>
  `https://github.com/ShikkesoraSIM/torii/releases/download/${tag}/${file}`;

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

// ─── Feature card data ────────────────────────────────────────────────────────

interface CompactFeature {
  icon: React.ReactNode;
  title: string;
  tag: string;
  accent: string;
  description: string;
}

const COMPACT_FEATURES: CompactFeature[] = [
  {
    icon: <Sliders className="h-4 w-4 text-rose-300" />,
    title: "Exclusive Mods",
    tag: "Gameplay",
    accent: "border-rose-400/25 bg-rose-500/10 text-rose-200",
    description:
      "Amplify (AM) scales note spacing while keeping patterns playable, Pitch Adjust (PA) shifts pitch without changing speed, Score V2 (SV2), and more.",
  },
  {
    icon: <Gauge className="h-4 w-4 text-amber-300" />,
    title: "Performance & Satori GC",
    tag: "Speed",
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-200",
    description:
      "Packed with client optimizations, the latest Satori GC, up to 8000 Hz input and audio polling, Potato Mode, and more.",
  },
  {
    icon: <Volume2 className="h-4 w-4 text-cyan-300" />,
    title: "Custom Audio Engine",
    tag: "Nova",
    accent: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
    description:
      "Nova runs our own native audio engine with low latency, low CPU overhead, and clean audio transitions, and more.",
  },
  {
    icon: <TrendingUp className="h-4 w-4 text-fuchsia-300" />,
    title: "Torii pp & Sunny Rework",
    tag: "Ranking",
    accent: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200",
    description:
      "Standard plays in torii use server-side pp-dev, torii keys runs on the Sunny rework, and more.",
  },
  {
    icon: <Zap className="h-4 w-4 text-sky-300" />,
    title: "In-game Quality of Life",
    tag: "QoL",
    accent: "border-sky-400/25 bg-sky-500/10 text-sky-200",
    description:
      "Skip long breaks, protect runs with Confirm Retry/Quit after 60s, use beatmap theme music, and more.",
  },
  {
    icon: <FolderSync className="h-4 w-4 text-violet-300" />,
    title: "Data Folder Wizard",
    tag: "Setup",
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-200",
    description:
      "Start fresh or point Torii at an existing compatible folder in place without duplicating your maps.",
  },
];

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
      ".NET 10 with Satori GC",
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
      "Experimental .NET 11 with Satori GC",
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
  const [vrHelpOpen, setVrHelpOpen] = useState(false);
  const [vrTab, setVrTab] = useState<"quest" | "pcvr">("quest");

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "torii_github_releases_v1";
    const applyReleases = (releases: Array<{ tag_name: string; html_url: string; draft: boolean; prerelease: boolean; assets: Array<{ name: string }> }>) => {
      if (cancelled || !Array.isArray(releases)) return;
      const live = releases.filter((r) => !r.draft);
      const newestNova = live.find((r) => r.tag_name.endsWith("-nova"));
      if (newestNova) setNovaUrl(newestNova.html_url);
      const pack = (rs: typeof live) => rs.slice(0, 8).map((r) => ({ tag: r.tag_name, assets: r.assets.map((a) => a.name) }));
      setReleasesByStream({
        torii: pack(live.filter((r) => !r.prerelease)),
        nova: pack(live.filter((r) => r.tag_name.endsWith("-nova"))),
      });
    };

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { ts: number; data: any[] };
        if (parsed && Date.now() - parsed.ts < 5 * 60 * 1000 && Array.isArray(parsed.data)) {
          applyReleases(parsed.data);
          return () => { cancelled = true; };
        }
      }
    } catch {
      /* Ignore storage/JSON parse issues */
    }

    const controller = new AbortController();
    fetch("https://api.github.com/repos/ShikkesoraSIM/torii/releases?per_page=30", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((releases) => {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: releases }));
        } catch {
          /* Ignore quota errors */
        }
        applyReleases(releases);
      })
      .catch(() => { /* se queda con los links estaticos */ });

    return () => {
      cancelled = true;
      controller.abort();
    };
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
      {/* Lightweight radial-gradient ambient backdrops (no large CSS filter:blur pass). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(560px circle at 10% 30%, rgba(217, 70, 239, 0.14), transparent 70%), radial-gradient(640px circle at 88% 42%, rgba(139, 92, 246, 0.18), transparent 70%), radial-gradient(640px circle at 50% 95%, rgba(56, 189, 248, 0.10), transparent 70%)",
        }}
      >
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
            either of these two versions. They both connect to the same server and
            share your account, so pick whichever runs best on your device.
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-white/70">
            Torii is an independent community project, not an official osu! client or service.
            It is not affiliated with, endorsed by, or supported by ppy Pty Ltd.
            osu! is a trademark of ppy Pty Ltd. References to osu! identify the upstream project and compatibility only.
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
                        {s.available ? (
                          direct ? (
                            <Download className="h-4 w-4" aria-hidden />
                          ) : (
                            <ExternalLink className="h-4 w-4" aria-hidden />
                          )
                        ) : (
                          <span aria-hidden>...</span>
                        )}
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
                          <>Not your platform? <a className="inline-flex items-center gap-1 underline hover:text-white/60" href={fallback} target="_blank" rel="noreferrer">All downloads <ExternalLink className="h-3 w-3" aria-hidden /></a></>
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

        {/* ── Understated VR card (Meta Quest & SteamVR) ────────────────── */}
        {(() => {
          const vrRelease =
            releasesByStream.torii.find((r) => r.assets.includes("torii-vr.apk")) ??
            releasesByStream.nova.find((r) => r.assets.includes("torii-vr.apk"));
          const vrApkHref = vrRelease ? RELEASE_DOWNLOAD(vrRelease.tag, "torii-vr.apk") : TORII_STABLE_URL;

          return (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="mb-8 rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-4 backdrop-blur"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10">
                    <Glasses className="h-4 w-4 text-violet-300" aria-hidden />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">Torii for VR</span>
                      <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-200/90">
                        Quest 2 / Pro / 3 / 3S · SteamVR
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/50">
                      Standalone OpenXR build for Meta Quest (passthrough + controller/pen tracking) or PCVR via SteamVR.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={vrApkHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3.5 py-2 text-xs font-semibold text-violet-100 transition hover:border-violet-400/50 hover:bg-violet-500/20"
                  >
                    <span>{vrRelease ? "Download torii-vr.apk" : "Quest APK (Releases)"}</span>
                    {vrRelease ? <Download className="h-3.5 w-3.5" aria-hidden /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden />}
                  </a>
                  <button
                    type="button"
                    onClick={() => setVrHelpOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs font-medium text-white/65 transition hover:border-white/20 hover:text-white/90"
                  >
                    <span>How to install</span>
                    {vrHelpOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
                  </button>
                </div>
              </div>

              {vrHelpOpen && (
                <div className="mt-4 border-t border-white/10 pt-4 text-xs text-white/65">
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVrTab("quest")}
                      className={cx(
                        "rounded-lg border px-2.5 py-1 font-semibold transition",
                        vrTab === "quest"
                          ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                          : "border-white/10 bg-black/20 text-white/50 hover:text-white/80"
                      )}
                    >
                      Meta Quest (Standalone)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVrTab("pcvr")}
                      className={cx(
                        "rounded-lg border px-2.5 py-1 font-semibold transition",
                        vrTab === "pcvr"
                          ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                          : "border-white/10 bg-black/20 text-white/50 hover:text-white/80"
                      )}
                    >
                      PCVR (SteamVR)
                    </button>
                  </div>

                  {vrTab === "quest" ? (
                    <div className="space-y-2.5 leading-relaxed">
                      <ol className="list-decimal list-inside space-y-1.5 text-white/60">
                        <li>Enable <span className="text-white/85 font-medium">Developer Mode</span> once in the Meta Horizon mobile app (Devices <ArrowRight className="inline h-3 w-3 text-white/45" aria-hidden /> Headset Settings <ArrowRight className="inline h-3 w-3 text-white/45" aria-hidden /> Developer Mode).</li>
                        <li>Download <code className="text-violet-200 bg-violet-500/10 rounded px-1 py-0.5">torii-vr.apk</code> above and install it via <span className="text-white/85 font-medium">SideQuest</span> (drag &amp; drop), <span className="text-white/85 font-medium">Meta Quest Developer Hub</span>, or ADB:</li>
                      </ol>
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                        <code className="min-w-0 flex-1 truncate font-mono text-xs text-violet-200">adb install -r torii-vr.apk</code>
                        <CopyButton value="adb install -r torii-vr.apk" accent="violet" />
                      </div>
                      <p className="text-white/45">
                        Open it from <span className="text-white/75">App Library <ArrowRight className="inline h-3 w-3 text-white/45" aria-hidden /> Unknown Sources <ArrowRight className="inline h-3 w-3 text-white/45" aria-hidden /> Torii VR</span>. Runs side-by-side with the phone APK without overwriting it.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 leading-relaxed text-white/60">
                      <p>Install the regular <span className="text-white/85 font-medium">Torii</span> PC client and start <span className="text-white/85 font-medium">SteamVR</span> before launching Torii. It will offer to switch to VR mode automatically, or you can toggle it in Settings.</p>
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                        <code className="min-w-0 flex-1 truncate font-mono text-xs text-violet-200">torii.exe --vr</code>
                        <CopyButton value="torii.exe --vr" accent="violet" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ── Features showcase ─────────────────────────────────────────── */}
        <div ref={featuresRef} className="scroll-mt-32 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
                Built into Torii
              </span>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-white md:text-4xl">
                What you get in the client
              </h2>
            </div>
            <p className="max-w-md text-sm text-white/55">
              Everything below ships out of the box on Windows, macOS, Linux, Android, and Meta Quest.
            </p>
          </motion.div>

          {/* Featured bento row: 3 clean cards */}
          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex flex-col justify-between rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-950/35 via-white/[0.02] to-black/30 p-6 backdrop-blur"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/15">
                    <Palette className="h-4 w-4 text-fuchsia-300" />
                  </div>
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-fuchsia-200">
                    Colors
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">Custom Hue for UI and Accents</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  Pick any 360-degree color for menus, overlays, and UI accents, and tune it to match your setup.
                </p>
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-black/35 p-3.5">
                <div className="mb-2 flex items-center justify-between text-[11px] text-white/55">
                  <span>UI &amp; Accent Hue</span>
                  <span className="font-mono text-fuchsia-200">0° - 360°</span>
                </div>
                <div
                  className="h-2 w-full rounded-full"
                  style={{ background: "linear-gradient(to right, #f43f5e, #f59e0b, #10b981, #06b6d4, #6366f1, #d946ef, #f43f5e)" }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="flex flex-col justify-between rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-950/30 via-white/[0.02] to-black/30 p-6 backdrop-blur"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15">
                    <Layers className="h-4 w-4 text-sky-300" />
                  </div>
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-200">
                    Themes
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">Multiple UI Themes</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  Switch between clean UI themes including Torii Glass, Torii Classic, Midnight, Grayscale, and more.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/35 p-3.5 text-[11px]">
                {["Torii Glass", "Torii Classic", "Midnight", "Grayscale"].map((theme, idx) => (
                  <span
                    key={theme}
                    className={cx(
                      "rounded-lg border px-2.5 py-1 font-medium",
                      idx === 0
                        ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                        : "border-white/10 bg-white/[0.04] text-white/65"
                    )}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col justify-between rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/35 via-white/[0.02] to-black/30 p-6 backdrop-blur"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15">
                    <Lock className="h-4 w-4 text-violet-300" />
                  </div>
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-200">
                    Profiles
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">Locked Training Profiles</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  Make separate profiles to force specific rules like Low AR or DT. Each profile locks you out of other mods and tracks its own stats and pp.
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/35 p-3.5 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-violet-300/80">Active Profile</div>
                  <div className="mt-0.5 font-semibold text-white">Low AR Practice</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[11px] font-medium text-violet-200">
                  <Lock className="h-3 w-3" aria-hidden />
                  <span>Locked</span>
                </span>
              </div>
            </motion.div>
          </div>

          {/* Compact 6-card grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMPACT_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                    {f.icon}
                  </div>
                  <span className={cx("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", f.accent)}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">{f.description}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA below features */}
          <div className="mt-8 text-center">
            <button
              onClick={() => scrollTo(toriiSetupRef)}
              className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/15 px-7 py-3 text-sm font-semibold text-white transition hover:border-fuchsia-400/60 hover:bg-fuchsia-500/25"
            >
              <span>Quick setup guide</span>
              <ArrowDown className="h-4 w-4 text-fuchsia-300" aria-hidden />
            </button>
          </div>
        </div>

        {/* ── Torii client setup ────────────────────────────────────────── */}
        <div ref={toriiSetupRef} className="scroll-mt-32 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
                4 steps
              </span>
              <h3 className="mt-1 text-3xl font-bold tracking-tight text-white">Quick setup</h3>
              <p className="mt-1 text-sm text-white/50">Download, pick your data folder, and log in. Nothing else to configure.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  step: "1",
                  title: "Grab the download for your device",
                  body: "Use the Torii or Nova button at the top of this page. It detects your OS and picks the right installer, AppImage, Mac zip, or APK.",
                },
                {
                  step: "2",
                  title: "Run the installer or app",
                  body: "On Windows run the setup .exe. On macOS or Linux you can also paste the Terminal one-liner on the card to install and keep it updated.",
                },
                {
                  step: "3",
                  title: "Choose your data folder",
                  body: "In the first-run wizard, start a fresh Torii folder or point it at an existing compatible folder. Sharing an existing folder uses it in place without copying, so back it up first.",
                },
                {
                  step: "4",
                  title: "Log in and play",
                  body: "Sign in with your Torii account or create one right inside the client. Connection is built in, with no server URLs to enter.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fuchsia-400/35 bg-fuchsia-500/15 text-xs font-bold text-fuchsia-200">
                      {item.step}
                    </span>
                    <h4 className="text-base font-semibold text-white">{item.title}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-white/60">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-2xl border border-sky-400/20 bg-sky-500/5 px-5 py-3.5 text-xs text-white/60">
              <span className="font-semibold text-sky-200">Tip:</span>
              <span>Skipped the folder wizard? Open it anytime from</span>
              <span className="inline-flex items-center gap-1 font-medium text-white/85">
                Settings <ArrowRight className="h-3 w-3 text-white/50" aria-hidden /> Torii <ArrowRight className="h-3 w-3 text-white/50" aria-hidden /> Manage Torii data source
              </span>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
