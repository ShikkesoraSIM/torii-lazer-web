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

const HeroSection: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col justify-center">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#030014]" />
        <div className="absolute -top-40 left-1/2 h-[640px] w-[980px] -translate-x-1/2 rounded-full bg-[#8a2be2]/16 blur-[140px]" />
        <div className="absolute top-24 -left-48 h-[520px] w-[520px] rounded-full bg-[#ff007f]/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[560px] w-[560px] rounded-full bg-[#4f46e5]/10 blur-[160px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.25)_1px,transparent_0)] [background-size:22px_22px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-24 pb-16">
        <motion.div variants={container} initial="hidden" animate="show">
          {/* Top badge row */}
          <motion.div variants={item} className="flex justify-center mb-6">
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
            <h1 className="font-heading text-5xl md:text-7xl font-extrabold tracking-[-0.03em] text-white leading-[1.05]">
              Shikkesora
              <br />
              <span className="bg-gradient-to-r from-[#c084fc] via-[#ff5bbd] to-[#ff007f] bg-clip-text text-transparent">
                lazer server
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-white/65 font-body leading-relaxed">
              A clean, modern home for lazer players — built around community, fast iteration, and an experience that feels premium.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-semibold text-white shadow-lg shadow-fuchsia-500/15 hover:shadow-fuchsia-500/25 transition-all active:scale-[0.98]"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(192,132,252,0.95) 0%, rgba(255,0,127,0.95) 100%)',
                    }}
                  >
                    Get started
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
              accent="from-yellow-400/25 to-transparent"
              title="Rate Change and Difficulty Adjust"
              desc="Play at 1.1x, 1.2x, your desired speed, adjust AR, OD, CS, and still gain PP!"
            />
            <FeatureCard
              icon={<FiActivity />}
              accent="from-pink-400/25 to-transparent"
              title="Custom Clients"
              desc="We support and develop Custom Clients!"
            />
            <FeatureCard
              icon={<FiLayers />}
              accent="from-purple-400/25 to-transparent"
              title="Unranked map support"
              desc="Every map is ranked here! Go on and have fun <3"
            />
            <FeatureCard
              icon={<FiCpu />}
              accent="from-blue-400/25 to-transparent"
              title="Active development"
              desc="Lazer-first updates and quick iterations based on community feedback."
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
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-all hover:bg-white/[0.06]">
      <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${accent}`} />
      <div className="relative">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/85">
          {icon}
        </div>
        <h3 className="font-heading text-sm font-bold tracking-[-0.01em] text-white mb-2">{title}</h3>
        <p className="font-body text-xs leading-relaxed text-white/60">{desc}</p>
      </div>
    </div>
  );
}

export default HeroSection;

