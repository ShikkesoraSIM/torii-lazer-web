import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const SHIGETIRO_PORTABLE_URL =
  "https://github.com/shigetiro/osu/releases/latest/download/osulazer-win-Portable.zip";

const INJECTOR_RELEASES_URL =
  "https://github.com/MingxuanGame/LazerAuthlibInjection/releases/latest";

const SERVER_HOST = "lazer-api.shikkesora.com";
const API_URL = "https://lazer-api.shikkesora.com";
const WEBSITE_URL = "https://lazer.shikkesora.com";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // fallback: select + execCommand
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 900);
      } finally {
        document.body.removeChild(ta);
      }
    }
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
      aria-label="Copy to clipboard"
      title="Copy"
    >
      {copied ? "Copied" : "Copy"}
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
    <div
      className={cx(
        "mt-3 rounded-2xl border bg-black/30 p-4",
        accent === "fuchsia" && "border-fuchsia-400/20",
        accent === "violet" && "border-violet-400/20"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wider text-white/40">
          {label}
        </div>
        <CopyButton value={value} accent={accent} />
      </div>

      <code
        className={cx(
          "block select-text break-all rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm",
          accent === "fuchsia" && "text-fuchsia-200",
          accent === "violet" && "text-violet-200"
        )}
      >
        {value}
      </code>

      <div className="mt-2 text-[11px] text-white/35">
        Tip: you can also click-drag to select.
      </div>
    </div>
  );
}

export default function HowToJoinPage() {
  const portableRef = useRef<HTMLDivElement>(null);
  const injectorRef = useRef<HTMLDivElement>(null);

  // Fix the “harsh top edge under navbar” by ensuring the document background matches this page.
  useEffect(() => {
    const prevBodyBg = document.body.style.background;
    const prevHtmlBg = document.documentElement.style.background;

    document.body.style.background = "#030014";
    document.documentElement.style.background = "#030014";

    return () => {
      document.body.style.background = prevBodyBg;
      document.documentElement.style.background = prevHtmlBg;
    };
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Card = ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <div
      onClick={onClick}
      className={cx(
        "rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur",
        onClick && "cursor-pointer transition hover:bg-white/10",
        className
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      {children}
    </div>
  );

  const CTAButton = ({
    children,
    accent = "neutral",
  }: {
    children: React.ReactNode;
    accent?: "neutral" | "fuchsia" | "violet";
  }) => (
    <div className="mt-6">
      <div
        className={cx(
          "inline-flex w-full items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition",
          "border-white/10 bg-black/30 text-white hover:border-white/20 hover:bg-black/40",
          accent === "fuchsia" && "hover:border-fuchsia-400/30",
          accent === "violet" && "hover:border-violet-400/30"
        )}
      >
        {children}
      </div>
    </div>
  );

  const Title = useMemo(
    () => ({
      title: "Join Shikkesora (osu!lazer private server)",
      subtitle:
        "Pick a method. The Shigetiro portable client is a separate performance-focused build. The injector method uses your normal osu!lazer install so you keep all your maps, skins and data — and you can switch back anytime.",
    }),
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030014]">
      {/* Shikkesora-style background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 -left-56 h-[640px] w-[640px] rounded-full bg-fuchsia-500/20 blur-[150px]" />
        <div className="absolute top-1/3 -right-56 h-[640px] w-[640px] rounded-full bg-violet-500/20 blur-[150px]" />
        <div className="absolute bottom-[-260px] left-1/3 h-[640px] w-[640px] rounded-full bg-sky-400/10 blur-[160px]" />

        {/* Soft top fade to avoid any harsh banding near the navbar area */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#030014] via-[#030014]/80 to-transparent" />
      </div>

      {/* Slightly more top padding so it never feels “cut” under nav */}
      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-24">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center text-4xl font-bold tracking-tight text-white md:text-5xl"
        >
          {Title.title}
        </motion.h1>

        <p className="mx-auto mb-14 max-w-3xl text-center text-white/70">
          {Title.subtitle}
        </p>

        {/* Two big option cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Portable (Shigetiro) */}
          <Card
            onClick={() => scrollTo(portableRef)}
            className="flex h-full flex-col hover:border-fuchsia-400/40"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold leading-tight text-white">
                Shigetiro portable custom client
              </h2>
              <span className="shrink-0 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
                Performance build
              </span>
            </div>

            <p className="mb-5 text-white/70">
              Standalone portable build by Shigetiro. Best if you want the extra
              performance features and don’t mind using a separate install.
            </p>

            <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="mb-3 text-sm font-semibold text-white">Features</p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• Unlimited FPS (no artificial cap)</li>
                <li>• NVIDIA Reflex support</li>
                <li>• AMD Anti-Lag 2 support</li>
                <li>• Portable install (runs from its own folder)</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-red-400/20 bg-red-500/5 p-5">
              <p className="mb-3 text-sm font-semibold text-white">
                Downsides / things to know
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="text-red-300">
                  • You won’t have your existing maps, skins, settings, or local
                  data by default (it’s a separate install).
                </li>
                <li className="text-red-300">
                  • If you want your maps/skins here too, you’ll need to
                  import/copy them manually.
                </li>
                <li className="text-red-300">
                  • This build may not always be perfectly in-sync with the
                  latest official osu!lazer features/updates.
                </li>
              </ul>
            </div>

            {/* Push CTA + hint to the bottom so both cards align */}
            <div className="mt-auto pt-6">
              <CTAButton accent="fuchsia">Choose portable</CTAButton>
              <p className="mt-3 text-xs text-white/40">
                Click to view setup steps ↓
              </p>
            </div>
          </Card>

          {/* Injector */}
          <Card
            onClick={() => scrollTo(injectorRef)}
            className="flex h-full flex-col hover:border-violet-400/40"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold leading-tight text-white">
                Injector (keep your normal osu!lazer install)
              </h2>
              <span className="shrink-0 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
                Official-like
              </span>
            </div>

            <p className="mb-5 text-white/70">
              Connect using an injector with your existing osu!lazer. This keeps
              your maps, skins, settings and data, and works with the latest
              official builds.
            </p>

            <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="mb-3 text-sm font-semibold text-white">
                What you get
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  • Keeps all your maps, skins, settings and local data (no
                  separate install)
                </li>
                <li>
                  • Works with the most up-to-date official osu!lazer versions
                </li>
                <li>
                  • Switch between Shikkesora and the official servers whenever
                  you want
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
              <p className="mb-3 text-sm font-semibold text-white">Tradeoffs</p>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="text-amber-200">
                  • You don’t get the portable-client-only performance
                  toggles/features
                </li>
              </ul>
            </div>

            <div className="mt-auto pt-6">
              <CTAButton accent="violet">Choose injector</CTAButton>
              <p className="mt-3 text-xs text-white/40">
                Click to view setup steps ↓
              </p>
            </div>
          </Card>
        </div>

        {/* Portable instructions */}
        <section ref={portableRef} className="mt-28 scroll-mt-28">
          <h3 className="mb-6 text-3xl font-semibold text-white">
            Portable client setup (Shigetiro build)
          </h3>

          <Card>
            <p className="mb-6 text-white/70">
              This method uses a separate portable build. You ONLY need to set
              the Server Address — you do NOT need to set a Website URL for this
              method.
            </p>

            <ol className="space-y-5 text-white/70">
              <li>
                <span className="font-semibold text-white">
                  1) Download the portable build
                </span>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    className="break-all text-fuchsia-300 underline"
                    href={SHIGETIRO_PORTABLE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {SHIGETIRO_PORTABLE_URL}
                  </a>
                  <CopyButton value={SHIGETIRO_PORTABLE_URL} accent="fuchsia" />
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  2) Extract and launch
                </span>
                <div className="mt-2 text-sm text-white/60">
                  Unzip it anywhere you like and run osu!lazer from that folder.
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  3) Set the server address
                </span>
                <div className="mt-2 text-sm text-white/60">
                  In the connection/server settings, set Server Address to the
                  value below.
                </div>

                <CodeBox
                  label="Server Address"
                  value={SERVER_HOST}
                  accent="fuchsia"
                />

                <div className="mt-3 text-sm text-white/60">
                  Portable method: Website is NOT required — only Server Address.
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  4) Apply + restart
                </span>
                <div className="mt-2 text-sm text-white/60">
                  Press Apply, then fully restart osu!lazer for the change to
                  take effect.
                </div>
              </li>
            </ol>

            <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/5 p-6">
              <p className="mb-2 text-sm font-semibold text-white">
                Why do I not see my maps/skins?
              </p>
              <p className="text-sm text-white/70">
                Because portable is a separate install with its own data folder.
                It won’t automatically include your existing osu!lazer
                maps/skins/settings unless you import them.
              </p>
            </div>
          </Card>
        </section>

        {/* Injector instructions */}
        <section ref={injectorRef} className="mt-28 scroll-mt-28">
          <h3 className="mb-6 text-3xl font-semibold text-white">
            Injector setup (recommended for most people)
          </h3>

          <Card>
            <p className="mb-6 text-white/70">
              This method keeps your normal osu!lazer installation and data.
              You’ll download the injector, place the .dll into your osu! folder,
              restart, then set API + Website and restart once more.
            </p>

            <ol className="space-y-5 text-white/70">
              <li>
                <span className="font-semibold text-white">
                  1) Download the injector (.dll)
                </span>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    className="break-all text-violet-300 underline"
                    href={INJECTOR_RELEASES_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {INJECTOR_RELEASES_URL}
                  </a>
                  <CopyButton value={INJECTOR_RELEASES_URL} accent="violet" />
                </div>

                <div className="mt-2 text-sm text-white/60">
                  Download the latest release from the project page, then grab
                  the .dll from the release assets.
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  2) Open your osu! folder
                </span>
                <div className="mt-2 text-sm text-white/60">
                  Open osu!lazer, then use the menu option “Open osu! folder”.
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  3) Place the .dll into the ruleset folder
                </span>
                <div className="mt-2 text-sm text-white/60">
                  Inside the osu! folder, find the “ruleset” folder and put the
                  .dll file there.
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/40">
                      Folder
                    </div>
                    <code className="select-text font-mono">ruleset</code>
                  </div>
                  <CopyButton value={"ruleset"} accent="violet" />
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  4) Restart osu!lazer (first restart)
                </span>
                <div className="mt-2 text-sm text-white/60">
                  Completely close osu!lazer and open it again so the injector
                  loads.
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  5) Open Settings → Rulesets → API + Website
                </span>
                <div className="mt-2 text-sm text-white/60">
                  Go to Rulesets and set the API and Website URLs exactly like
                  below.
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <CodeBox label="API" value={API_URL} accent="violet" />
                  <CodeBox label="Website" value={WEBSITE_URL} accent="violet" />
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">6) Press Apply</span>
                <div className="mt-2 text-sm text-white/60">
                  Press Apply to save the values (this step matters both to
                  connect AND to disconnect).
                </div>
              </li>

              <li>
                <span className="font-semibold text-white">
                  7) Restart osu!lazer (second restart)
                </span>
                <div className="mt-2 text-sm text-white/60">
                  Restart again to ensure the connection settings fully apply.
                </div>
              </li>
            </ol>

            {/* Safety notice */}
            <div className="mt-8 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-6">
              <p className="mb-2 text-sm font-semibold text-white">
                Important notice (account safety)
              </p>
              <p className="text-sm text-white/70">
                You’re NOT going to get banned from osu! and your account isn’t
                at risk. osu! explicitly allows custom rulesets. This is simply
                osu!lazer connecting to a different server, and you can switch
                back to the official servers at any time.
              </p>
            </div>

            {/* Switch back */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6">
              <p className="mb-2 text-sm font-semibold text-white">
                Switching back to the official osu! servers
              </p>
              <p className="mb-4 text-sm text-white/70">
                To go back to the normal osu! servers, remove the custom values
                you set and apply the change.
              </p>

              <ol className="space-y-3 text-sm text-white/70">
                <li>
                  1) Clear the fields you changed (set them back to
                  empty/default):
                  <ul className="ml-6 mt-2 list-disc text-white/60">
                    <li>API</li>
                    <li>Website</li>
                  </ul>
                </li>
                <li>2) Press Apply.</li>
                <li>3) Restart osu!lazer.</li>
              </ol>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
