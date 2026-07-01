import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiInfo, FiAlertTriangle, FiAlertOctagon, FiCheckCircle } from "react-icons/fi";

// Shared chrome + small building blocks for the Torii wiki/rules hub.
// Pages under /wiki import from here so the glass look, the dark full-bleed
// background and the section/rule primitives stay consistent without each
// page re-implementing the shell. Prose lives in the pages; this file is
// layout only.

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

// Sets the page background to the deep navy the rest of the content pages use,
// and restores whatever was there on unmount (same trick HowToJoinPage uses).
function useWikiBackground() {
  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = "#030014";
    document.documentElement.style.background = "#030014";
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, []);
}

export type Accent = "fuchsia" | "violet" | "rose" | "sky" | "emerald" | "amber";

const ACCENT_TEXT: Record<Accent, string> = {
  fuchsia: "text-fuchsia-200",
  violet: "text-violet-200",
  rose: "text-rose-200",
  sky: "text-sky-200",
  emerald: "text-emerald-200",
  amber: "text-amber-200",
};

const ACCENT_BORDER: Record<Accent, string> = {
  fuchsia: "border-fuchsia-400/30",
  violet: "border-violet-400/30",
  rose: "border-rose-400/40",
  sky: "border-sky-400/30",
  emerald: "border-emerald-400/30",
  amber: "border-amber-400/30",
};

const ACCENT_TINT: Record<Accent, string> = {
  fuchsia: "bg-fuchsia-500/10",
  violet: "bg-violet-500/10",
  rose: "bg-rose-500/10",
  sky: "bg-sky-500/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
};

const ACCENT_BAR: Record<Accent, string> = {
  fuchsia: "bg-fuchsia-400",
  violet: "bg-violet-400",
  rose: "bg-rose-400",
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
};

// Page shell: dark full-bleed bg + blobs + a header with an optional "back to
// wiki" breadcrumb. Everything routed under /wiki renders inside this.
export function WikiShell({
  title,
  intro,
  icon,
  accent = "fuchsia",
  showBack = true,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  icon?: string;
  accent?: Accent;
  showBack?: boolean;
  children: React.ReactNode;
}) {
  useWikiBackground();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030014]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-64 -left-72 h-[560px] w-[560px] rounded-full bg-fuchsia-500/15 blur-[150px]" />
        <div className="absolute top-1/3 -right-56 h-[640px] w-[640px] rounded-full bg-violet-500/20 blur-[150px]" />
        <div className="absolute bottom-[-260px] left-1/3 h-[640px] w-[640px] rounded-full bg-sky-400/10 blur-[160px]" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#030014] via-[#030014]/95 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 pb-32 pt-24 md:pt-28">
        {showBack && (
          <Link
            to="/wiki"
            className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white/80 transition mb-6"
          >
            <span aria-hidden>&larr;</span>
            <span>Wiki</span>
          </Link>
        )}

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className={cx("hidden sm:block h-8 w-1.5 shrink-0 rounded-full", ACCENT_BAR[accent])} aria-hidden />
            {icon && <span className="text-3xl select-none" aria-hidden>{icon}</span>}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">{title}</h1>
          </div>
          {intro && <div className="max-w-3xl text-white/60 leading-relaxed">{intro}</div>}
        </motion.div>

        {children}
      </div>
    </div>
  );
}

// Anchored section with a heading. The id lets the Rules page table of
// contents jump straight to it.
export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="scroll-mt-28 mb-10"
    >
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
      <div className="space-y-3 text-white/70 leading-relaxed">{children}</div>
    </motion.section>
  );
}

// Renders a plain body string into paragraphs and bullet lists. Blocks are
// split on a blank line; inside a block, lines starting with "- " become a
// list (with any lead text above it kept as a paragraph).
export function Prose({ body }: { body: string }) {
  return (
    <>
      {body.split("\n\n").map((block, i) => {
        const lines = block.split("\n");
        const firstBullet = lines.findIndex((l) => l.trimStart().startsWith("- "));
        if (firstBullet === -1) return <p key={i}>{block.trim()}</p>;
        const lead = lines.slice(0, firstBullet).join(" ").trim();
        const bullets = lines.slice(firstBullet).filter((l) => l.trimStart().startsWith("- "));
        return (
          <div key={i} className="space-y-2">
            {lead && <p>{lead}</p>}
            <ul className="list-disc space-y-1.5 pl-5 marker:text-white/30">
              {bullets.map((l, j) => (
                <li key={j}>{l.replace(/^\s*-\s+/, "")}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

// A glass panel for grouping content inside a section.
export function Panel({
  accent = "fuchsia",
  className,
  children,
}: {
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("rounded-2xl border bg-white/[0.02] p-5 backdrop-blur", ACCENT_BORDER[accent], className)}>
      {children}
    </div>
  );
}

// Numbered, citable rule list. Each item can be a string or rich node.
export function RuleList({
  items,
  start = 1,
}: {
  items: React.ReactNode[];
  start?: number;
}) {
  return (
    <ol className="space-y-2.5" start={start}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-white/70 leading-relaxed">
          <span className="mt-0.5 shrink-0 font-mono text-xs text-white/35 tabular-nums">
            {String(start + i).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

// Docs-style admonition: a left accent bar, a vector icon and a bright title.
// Used for warnings / notes / good-to-know.
export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "danger" | "good";
  title?: string;
  children: React.ReactNode;
}) {
  const map = {
    info: { Icon: FiInfo, border: "border-sky-400/20", bg: "bg-sky-500/[0.06]", bar: "bg-sky-400", icon: "text-sky-300", title: "text-sky-100" },
    warn: { Icon: FiAlertTriangle, border: "border-amber-400/25", bg: "bg-amber-500/[0.06]", bar: "bg-amber-400", icon: "text-amber-300", title: "text-amber-100" },
    danger: { Icon: FiAlertOctagon, border: "border-rose-400/30", bg: "bg-rose-500/[0.07]", bar: "bg-rose-400", icon: "text-rose-300", title: "text-rose-100" },
    good: { Icon: FiCheckCircle, border: "border-emerald-400/20", bg: "bg-emerald-500/[0.06]", bar: "bg-emerald-400", icon: "text-emerald-300", title: "text-emerald-100" },
  }[tone];
  const { Icon } = map;

  return (
    <div className={cx("relative overflow-hidden rounded-xl border py-3.5 pl-5 pr-4", map.border, map.bg)}>
      <span className={cx("absolute inset-y-0 left-0 w-[3px]", map.bar)} aria-hidden />
      <div className="flex gap-3">
        <Icon className={cx("mt-px shrink-0", map.icon)} size={17} aria-hidden />
        <div className="min-w-0">
          {title && <p className={cx("mb-0.5 text-sm font-semibold", map.title)}>{title}</p>}
          <div className="text-sm leading-relaxed text-white/70">{children}</div>
        </div>
      </div>
    </div>
  );
}

// A quoted message exactly as ToriiHalo / the client shows it in-game. Using
// the real strings keeps the wiki honest and matches what players see.
export function BotQuote({
  from = "ToriiHalo",
  children,
}: {
  from?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wider text-white/40">
        <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-400" />
        {from} says
      </div>
      <p className="text-sm text-white/80 leading-relaxed">&ldquo;{children}&rdquo;</p>
    </div>
  );
}

// Sticky in-page table of contents (used by the long Rules page). Hidden on
// small screens where the page just scrolls.
export function Toc({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav className="hidden lg:block sticky top-28 self-start w-52 shrink-0">
      <p className="mb-3 text-xs uppercase tracking-wider text-white/35">On this page</p>
      <ul className="space-y-1.5 border-l border-white/10">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className="block border-l-2 border-transparent -ml-px pl-3 py-0.5 text-sm text-white/45 hover:text-white hover:border-fuchsia-400/60 transition"
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Card link used on the hub landing grid.
export function HubCard({
  to,
  title,
  icon,
  accent = "fuchsia",
  external = false,
}: {
  to: string;
  title: string;
  icon: string;
  accent?: Accent;
  external?: boolean;
}) {
  const inner = (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cx(
        "group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border bg-white/[0.02] px-4 py-7 text-center backdrop-blur transition hover:bg-white/[0.05]",
        ACCENT_BORDER[accent]
      )}
    >
      <span className="text-3xl select-none" aria-hidden>{icon}</span>
      <span className="text-sm font-bold text-white sm:text-base">
        {title}
        {external && <span className="ml-1 text-xs opacity-50" aria-hidden>↗</span>}
      </span>
    </motion.div>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className="block h-full">
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className="block h-full">
      {inner}
    </Link>
  );
}

export { ACCENT_TEXT, ACCENT_BORDER, ACCENT_TINT };
