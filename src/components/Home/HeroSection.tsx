import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiTrendingUp,
  FiUsers,
  FiDownload,
  FiShield,
  FiZap,
  FiActivity,
  FiLayers,
  FiChevronRight,
  FiCpu,
  FiHeart,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' as any },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' as any, transition: { duration: 0.55, ease: 'easeOut' } },
};

// Small brand mark (same vibe as navbar)
function BrandMark({ size = 76 }: { size?: number }) {
  const inner = Math.max(34, Math.round(size * 0.78));

  return (
    <div
      style={{ width: size, height: size }}
      className={[
        'mx-auto rounded-[28px] border border-white/10',
        'bg-gradient-to-br from-[#c084fc]/28 via-[#ff5bbd]/14 to-[#ff7a18]/12',
        'shadow-[0_0_70px_rgba(255,90,180,0.24)]',
        'flex items-center justify-center',
      ].join(' ')}
    >
      <img
        src="/image/logos/logo.png"
        srcSet="/image/logos/logo.png 1x, /image/logos/logo@2x.png 2x"
        alt="Torii"
        style={{ width: inner, height: inner }}
        className="object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
        draggable={false}
      />
    </div>
  );
}

const HeroSection: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col justify-center">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        {/* IMPORTANT: base goes FIRST so it doesn't cover the blobs */}
        <div className="absolute inset-0 bg-[#030014]" />

        {/* Big soft blobs / highlights */}
        <div className="absolute -top-48 left-1/2 h-[720px] w-[1120px] -translate-x-1/2 rounded-full bg-[#8a2be2]/18 blur-[150px]" />
        <div className="absolute top-24 -left-56 h-[560px] w-[560px] rounded-full bg-[#ff007f]/12 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[620px] w-[620px] rounded-full bg-[#ff7a18]/10 blur-[170px]" />

        {/* extra subtle mid blobs (adds life without screaming) */}
        <div className="absolute top-[38%] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#ff5bbd]/10 blur-[170px]" />
        <div className="absolute top-[55%] left-[16%] h-[440px] w-[440px] rounded-full bg-[#c084fc]/12 blur-[160px]" />

        {/* vignette + noise */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.22)_1px,transparent_0)] [background-size:22px_22px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-24 pb-16">
        <motion.div variants={container} initial="hidden" animate="show">
          {/* Top badge row */}
          <motion.div variants={item} className="flex justify-center mb-7">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] tracking-[0.22em] uppercase text-white/55 backdrop-blur-xl">
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
                Singapore Node
              </span>
              <span className="text-white/20">•</span>
              <span className="text-white/45">osu!lazer private server</span>
            </div>
          </motion.div>

          {/* Hero */}
          <motion.div variants={item} className="text-center">
            <div className="mb-7">
              {/* a bit bigger so it doesn't feel tiny */}
              <BrandMark size={104} />
            </div>

            {/* Fix clipped text: more line-height + gradient span inline-block + padding bottom */}
            <h1 className="font-heading text-5xl md:text-7xl font-extrabold tracking-[-0.03em] leading-[1.10] overflow-visible">
              <span className="text-white drop-shadow-[0_14px_50px_rgba(0,0,0,0.50)]">
                Torii
              </span>
              <br />
              <span
                className={[
                  'inline-block pb-2', // prevents bottom crop
                  'bg-gradient-to-r from-[#c084fc] via-[#ff5bbd] to-[#ff7a18]',
                  'bg-clip-text text-transparent',
                  'text-[0.88em] md:text-[0.86em]', // slightly smaller than "Torii"
                  'drop-shadow-[0_12px_46px_rgba(255,90,180,0.18)]',
                ].join(' ')}
              >
                forged in Shikke’s Dojo
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-white/65 font-body leading-relaxed">
              A community-run lazer server. Simple goal: play maps, grind PP, and hang out with people who actually care.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-semibold text-white shadow-lg shadow-fuchsia-500/15 hover:shadow-fuchsia-500/25 transition-all active:scale-[0.98]"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(192,132,252,0.95) 0%, rgba(255,90,189,0.95) 55%, rgba(255,122,24,0.95) 100%)',
                    }}
                  >
                    Join Torii
                    <FiChevronRight className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    to="/how-to-join"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-8 py-3.5 font-semibold text-white/85 hover:bg-white/10 transition-all active:scale-[0.98]"
                  >
                    Setup guide <FiChevronRight />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/profile"
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-black hover:bg-white/90 transition-all active:scale-[0.98]"
                  >
                    Dashboard <FiChevronRight className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    to="/rankings"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-8 py-3.5 font-semibold text-white/85 hover:bg-white/10 transition-all active:scale-[0.98]"
                  >
                    View rankings <FiChevronRight />
                  </Link>
                </>
              )}

              <a
                href="https://discord.gg/fZXsZFT5Xv"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-8 py-3.5 font-semibold text-white/80 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                Discord
              </a>
            </div>
          </motion.div>

          {/* Dock */}
          <motion.div variants={item} className="mt-14 flex justify-center">
            <div className="w-full max-w-3xl rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 backdrop-blur-2xl shadow-[0_18px_80px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
                <DockLink to="/rankings" icon={<FiTrendingUp />} label="Rankings" />
                <DividerDot />
                <DockLink to="/teams" icon={<FiUsers />} label="Teams" />
                <DividerDot />
                <DockLink to="/beatmaps" icon={<FiDownload />} label="Beatmap mirror" />
                <DividerDot />
                <DockLink to="/how-to-join" icon={<FiShield />} label="Setup" />
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div variants={item} className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              icon={<FiZap />}
              glow="shadow-[0_20px_80px_rgba(255,122,24,0.10)]"
              accent="from-[#ff7a18]/30 via-[#ff7a18]/10 to-transparent"
              title="Rate change + difficulty adjust"
              desc="Speed it up, tweak AR/OD/CS — still earn PP and keep it fun."
            />
            <FeatureCard
              icon={<FiActivity />}
              glow="shadow-[0_20px_80px_rgba(255,90,189,0.10)]"
              accent="from-[#ff5bbd]/30 via-[#ff5bbd]/10 to-transparent"
              title="Custom clients"
              desc="We support custom clients and experimental stuff when it makes sense."
            />
            <FeatureCard
              icon={<FiLayers />}
              glow="shadow-[0_20px_80px_rgba(192,132,252,0.10)]"
              accent="from-[#c084fc]/30 via-[#c084fc]/10 to-transparent"
              title="Unranked maps welcome"
              desc="More maps, less gatekeeping. Play what you want."
            />
            <FeatureCard
              icon={<FiCpu />}
              glow="shadow-[0_20px_80px_rgba(139,92,246,0.12)]"
              accent="from-[#8b5cf6]/30 via-[#8b5cf6]/12 to-transparent"
              title="Active iteration"
              desc="Not perfect, but we ship improvements based on community feedback."
            />
          </motion.div>

          {/* Credit */}
          <motion.div variants={item} className="mt-10 flex justify-center">
            <div className="text-xs text-white/45 font-body">
              Built with <FiHeart className="inline -mt-0.5 mx-1 text-pink-300/70" />
              thanks to <span className="text-white/70 font-semibold">GooGu / g0v0</span> contributors.
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

function DividerDot() {
  return <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-white/15" />;
}

function DockLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      className="group inline-flex items-center gap-2 text-white/65 hover:text-white transition-colors"
      to={to}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 group-hover:bg-white/10 transition">
        <span className="text-[16px] text-white/80">{icon}</span>
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</span>
    </Link>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  accent,
  glow,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  glow?: string;
}) {
  return (
    <div
      className={[
        'relative rounded-3xl border border-white/10',
        'bg-white/[0.035] p-6 transition-all',
        'hover:bg-white/[0.055] hover:border-white/15',
        glow ?? '',
      ].join(' ')}
    >
      {/* stronger color wash so it actually shows */}
      <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${accent} opacity-100`} />

      {/* subtle vignette to keep it clean */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.04] via-transparent to-black/30" />

      {/* tiny inner highlight to make it feel premium */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/[0.06]" />

      <div className="relative">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
          {icon}
        </div>
        <h3 className="font-heading text-sm font-bold tracking-[-0.01em] text-white mb-2">{title}</h3>
        <p className="font-body text-xs leading-relaxed text-white/60">{desc}</p>
      </div>
    </div>
  );
}

export default HeroSection;

