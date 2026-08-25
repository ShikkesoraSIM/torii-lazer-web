import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Avatar from '../UI/Avatar';
import CountryFlag from '../UI/CountryFlag';
import GameModeSelector from '../UI/GameModeSelector';
import RankHistoryChart from '../UI/RankHistoryChart';
import LevelProgress from '../UI/LevelProgress';
import { type User, type GameMode, type BestScore } from '../../types';
import FriendStats from './FriendStats';
import UserRecentActivity from './UserRecentActivity';
import UserPinnedScores from './UserPinnedScores';
import UserBestScores from './UserBestScores';
import UserRecentScores from './UserRecentScores';
import UserPageDisplay from './UserPageDisplay';
import RestrictedBanner from './RestrictedBanner';
import SuspiciousBanner from './SuspiciousBanner';
import DailyChallengeStatsCard from './DailyChallengeStatsCard';
import Badges from './Badges';
import { UserTitleBadges } from './TitleBadge';
import Achievements from './Achievements';
import UserMostPlayedBeatmaps from './UserMostPlayedBeatmaps';
import UserMappedBeatmaps from './UserMappedBeatmaps';
import MatchmakingStatsCard from './MatchmakingStatsCard';
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../../hooks/useAuth';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useProfileColor } from '../../contexts/ProfileColorContext';
import { isDefaultUserCoverUrl, pickBestUserCoverUrl } from '../../utils/profileMedia';
import { getScoreClientDisplayMode } from '../../utils/clientVersion';
import { formatRelativeTime } from '../../utils/format';

interface UserProfileLayoutProps {
  user: User;
  selectedMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onUserUpdate?: (user: User) => void;
  initialBestScores?: BestScore[] | null;
  initialBestScoresKey?: string | null;
}

const formatPlayTime = (seconds: number | undefined): string => {
  if (!seconds) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
};

/** Cover image: lazy-loaded with a blur-up transition. */
const CoverImage: React.FC<{ src?: string; alt?: string; isExpanded: boolean }> = ({ src, alt = 'cover', isExpanded }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const defaultCover = '/image/backgrounds/layered-waves-haikei.svg';
  const displaySrc = (!src || error) ? defaultCover : src;

  useEffect(() => {
    if (!ref.current) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // Dynamic cover height. Collapsed keeps a slim band (not h-0) so the hero
  // always reads as intentional and the avatar always has cover to overlap.
  const heightClass = isExpanded
    ? 'h-[200px] md:h-[320px]'
    : 'h-[120px] md:h-[150px]';

  return (
    <div ref={ref} className={`relative w-full overflow-hidden transition-all duration-300 ${heightClass}`}>
      <div className="absolute inset-0 cover-bg">
        <div className="h-full w-full" style={{ background: 'transparent' }} />
      </div>

      {inView && displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition duration-500 ${loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (displaySrc !== defaultCover) {
              setError(true);
            }
          }}
        />
      )}

      {/* Scrim so the floating controls + the avatar overlap stay readable on any cover. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/10" />
    </div>
  );
};

/**
 * Section — the single glass card used for every block on the profile,
 * replacing the old edge-to-edge `bg-card` stripes. The `.glass` material is
 * perf-mode aware (global `html.perf-mode` rules flatten it to an opaque
 * surface), so the hardware-accelerated "rich glass" and the no-accel "clean
 * solid" versions come from one class — no duplicated markup.
 */
const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`glass rounded-3xl p-4 md:p-6 ${className}`}>{children}</section>
);

/** Team flag with a graceful fallback: shows the flag image, but if the team
 *  has no flag (or it fails to load) it shows a small short-name chip instead
 *  of a broken image or nothing at all. */
const TeamFlag: React.FC<{ team: { id: number; name: string; short_name?: string; flag_url?: string } }> = ({ team }) => {
  const [broken, setBroken] = useState(!team.flag_url);
  return (
    <Link
      to={`/teams/${team.id}`}
      className="block transition-transform hover:scale-105"
      data-tooltip-id="team-tooltip"
      data-tooltip-content={team.name}
    >
      {broken ? (
        <span className="inline-flex h-[26px] items-center rounded-md bg-white/10 px-2 text-xs font-bold uppercase tracking-wide text-white/85 ring-1 ring-white/15">
          {team.short_name || team.name}
        </span>
      ) : (
        <img
          src={team.flag_url}
          alt=""
          className="h-[26px] w-auto rounded-md object-cover shadow-sm ring-1 ring-white/10"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </Link>
  );
};

const UserProfileLayout: React.FC<UserProfileLayoutProps> = ({
  user,
  selectedMode,
  onModeChange,
  onUserUpdate,
  initialBestScores,
  initialBestScoresKey,
}) => {
  const { t } = useTranslation();
  const { refreshUser, user: currentUser } = useAuth();
  const { preferences, updatePreference } = useUserPreferences();
  const { profileColor, setProfileColorLocal, resetProfileColor } = useProfileColor();
  const scoreClientDisplayMode = getScoreClientDisplayMode(preferences.extra);

  // Cross-component refresh refs.
  const pinnedScoresRefreshRef = useRef<(() => void) | null>(null);
  const bestScoresRefreshRef = useRef<(() => void) | null>(null);
  const pinActionRef = useRef<{
    handlePin: (score: any) => void;
    handleUnpin: (scoreId: number) => void;
  } | null>(null);
  const bestScoresActionRef = useRef<{
    updatePinStatus: (scoreId: number, isPinned: boolean) => void;
  } | null>(null);

  const stats =
    user.statistics_rulesets?.[selectedMode] ??
    user.statistics;
  const gradeCounts = stats?.grade_counts ?? { ssh: 0, ss: 0, sh: 0, s: 0, a: 0 };
  const levelProgress = stats?.level?.progress ?? 0;
  const levelCurrent = stats?.level?.current ?? 0;
  const playTime = formatPlayTime(stats?.play_time);
  const user_achievements = Array.isArray(user.user_achievements)
    ? user.user_achievements.filter(
        (a): a is { achievement_id: number; achieved_at: string } =>
          typeof a === 'object' &&
          a !== null &&
          typeof (a as any).achievement_id === 'number' &&
          typeof (a as any).achieved_at === 'string'
      )
    : undefined;

  const medalCount = user_achievements ? new Set(user_achievements.map((a) => a.achievement_id)).size : 0;
  const avgHitsPerPlay =
    stats?.play_count && stats.play_count > 0 ? Math.round((stats.total_hits ?? 0) / stats.play_count) : 0;

  const coverUrl = pickBestUserCoverUrl(user) || (isDefaultUserCoverUrl(user.cover_url) ? "/image/backgrounds/bgcover.jpg" : user.cover_url);
  const [isUpdatingMode] = useState(false);

  // Only the owner may edit their own page.
  const canEdit = currentUser?.id === user.id;

  // Apply the viewed user's accent colour on enter, restore on leave.
  useEffect(() => {
    const getViewedUserColor = () => {
      // Own page: prefer the locally-saved colour to avoid an API-latency flash.
      if (currentUser?.id === user.id) {
        try {
          const storedColor = localStorage.getItem('user_profile_color');
          if (storedColor) return storedColor;
        } catch (e) {
          console.error('Failed to read from localStorage:', e);
        }
      }
      const rawColor = user.profile_colour || 'ED8EA6';
      return rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    };

    const viewedColor = getViewedUserColor();
    setProfileColorLocal(viewedColor);

    return () => {
      resetProfileColor();
    };
  }, [user.profile_colour, user.id, currentUser?.id, setProfileColorLocal, resetProfileColor]);

  const [isCoverExpanded, setIsCoverExpanded] = useState(() => {
    return preferences.profile_cover_expanded ?? false;
  });

  useEffect(() => {
    if (preferences.profile_cover_expanded !== undefined) {
      setIsCoverExpanded(preferences.profile_cover_expanded);
    }
  }, [preferences.profile_cover_expanded]);

  const handleAvatarUpdate = async () => {
    // Delay the refresh so the server has finished processing the upload.
    setTimeout(async () => {
      await refreshUser();
    }, 3000);
  };

  const handleToggleCover = async () => {
    const newExpandedState = !isCoverExpanded;
    setIsCoverExpanded(newExpandedState);
    if (canEdit) {
      await updatePreference('profile_cover_expanded', newExpandedState);
    }
  };

  return (
    <main className="torii-profile relative mx-auto w-full max-w-6xl px-3 md:px-6 py-5 md:py-9">
      {/* One restrained profile-color glow up top, replacing the old four-blob soup. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[460px]"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${profileColor}24 0%, ${profileColor}0b 36%, transparent 72%)` }}
      />

      <div className="space-y-4">
        {/* Admin-only alert banners (each self-hides when not applicable). */}
        {user.is_restricted && currentUser?.is_admin && <RestrictedBanner />}
        <SuspiciousBanner
          is_suspicious={user.is_suspicious}
          trust_score={user.trust_score}
          suspicious_reasons={user.suspicious_reasons}
          open_alert_count={user.open_suspicious_alert_count}
        />

        {/* ───────────────────────────── Hero ───────────────────────────── */}
        <section className="glass overflow-hidden rounded-[28px]">
          <div className="relative">
            <CoverImage src={coverUrl} alt={`${user.username} cover`} isExpanded={isCoverExpanded} />

            {/* Cover expand / collapse toggle. */}
            <div className="absolute right-3 top-3 z-20">
              <button
                onClick={handleToggleCover}
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-black/35 text-sm text-white ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55"
                aria-label={isCoverExpanded ? t('profile.userPage.collapseCover') : t('profile.userPage.expandCover')}
                data-tooltip-id="cover-toggle-tooltip"
                data-tooltip-content={isCoverExpanded ? t('profile.userPage.collapseCover') : t('profile.userPage.expandCover')}
              >
                {isCoverExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>
          </div>

          {/* Identity — only the AVATAR overlaps the cover; the name + badges sit
              on the solid card below it so they stay readable over any cover art. */}
          <div className="relative px-4 pb-6 pt-4 md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:gap-6">
              {/* Positioning only — the ring/rounding/clip all live on the Avatar's
                  own element so the border hugs the image with no sub-pixel gap. */}
              <div className="-mt-14 w-fit shrink-0 self-start md:-mt-16">
                <Avatar
                  userId={user.id}
                  username={user.username}
                  avatarUrl={user.avatar_url}
                  size="xl"
                  shape="rounded"
                  editable={false}
                  className="!h-24 !w-24 !min-h-24 !min-w-24 ring-2 ring-white/15 shadow-[0_12px_34px_rgba(0,0,0,0.5)] md:!h-32 md:!w-32 md:!min-h-32 md:!min-w-32"
                  onAvatarUpdate={handleAvatarUpdate}
                />
              </div>

              <div className="min-w-0 flex-1 md:pb-1">
                <h1 className="font-heading text-2xl font-bold tracking-wide text-white md:text-3xl">{user.username}</h1>

                {(user as any).groups?.length > 0 && (
                  <div className="mt-1.5">
                    <UserTitleBadges groups={(user as any).groups} size="md" />
                  </div>
                )}

                <div className="mt-2">
                  <Badges badges={user.badges} />
                </div>

                {/* Flags only (no PG/EASY text). Names live in the tooltips. */}
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  {user.country?.code && (
                    <Link
                      to={`/rankings?tab=users&mode=${selectedMode}&country=${encodeURIComponent(user.country.code)}`}
                      className="block transition-transform hover:scale-105"
                    >
                      <CountryFlag
                        code={user.country.code}
                        name={user.country.name}
                        className="h-[26px] ring-1 ring-white/10"
                        rounded="rounded-md"
                      />
                    </Link>
                  )}

                  {user.team && <TeamFlag team={user.team} />}
                </div>

                {(user.join_date || user.last_visit) && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
                    {user.join_date && (
                      <span className="inline-flex items-center gap-1.5" title={new Date(user.join_date).toLocaleString()}>
                        <svg className="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Joined {formatRelativeTime(user.join_date)}</span>
                      </span>
                    )}
                    {user.last_visit && (
                      <span className="inline-flex items-center gap-1.5" title={new Date(user.last_visit).toLocaleString()}>
                        <svg className="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Last seen {formatRelativeTime(user.last_visit)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Mode selector — on the solid card now (was a busy pill over the cover). */}
              <div className="self-start md:ml-auto">
                <GameModeSelector selectedMode={selectedMode} onModeChange={onModeChange} variant="compact" />
              </div>
            </div>
          </div>
        </section>

        {/* Performance — rank graph + grades + every stat in one dense card
            (was three airy cards). The graph is embedded bare so there's no
            card-in-card. Rich glass + a soft profile-colour wash; perf-mode
            flattens .glass to opaque and keeps the wash, so it reads cleanly
            without hardware acceleration too. */}
        <div className="glass relative overflow-hidden rounded-3xl p-4 md:p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(120% 80% at 90% -10%, ${profileColor}1c 0%, transparent 55%)` }}
          />
          <div className="relative space-y-4">
            {/* Rank headline — osu-style, inline (replaces the big marquee tiles). */}
            <div className="flex flex-wrap items-end gap-x-7 gap-y-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">{t('profile.info.globalRank')}</div>
                <div className="font-heading text-2xl font-bold tabular-nums text-primary md:text-[28px]">
                  {stats?.global_rank ? `#${stats.global_rank.toLocaleString()}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">{t('profile.info.countryRank')}</div>
                <div className="font-heading text-2xl font-bold tabular-nums text-white md:text-[28px]">
                  {stats?.country_rank ? `#${stats.country_rank.toLocaleString()}` : '—'}
                </div>
              </div>
              <div className="ml-auto flex items-end gap-6">
                <div className="text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">pp</div>
                  <div className="font-heading text-xl font-bold tabular-nums text-white">{Math.round(stats?.pp ?? 0).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">{t('profile.stats.accuracy')}</div>
                  <div className="font-heading text-xl font-bold tabular-nums text-white">{(stats?.hit_accuracy ?? 0).toFixed(2)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">{t('profile.stats.playTime')}</div>
                  <div className="font-heading text-xl font-bold tabular-nums text-white">{playTime}</div>
                </div>
              </div>
            </div>

            <RankHistoryChart
              rankHistory={user.rank_history}
              isUpdatingMode={isUpdatingMode}
              selectedModeColor={profileColor}
              delay={0.2}
              height="6rem"
              fullBleed
              bare
            />

            <div className="h-px bg-white/10" />

            {/* Stats — dense grid, up to 4 columns */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm md:grid-cols-4">
              {[
                { label: t('profile.stats.medals'), value: medalCount.toLocaleString() },
                { label: t('profile.stats.rankedScore'), value: (stats?.ranked_score ?? 0).toLocaleString() },
                { label: t('profile.stats.playCount'), value: (stats?.play_count ?? 0).toLocaleString() },
                { label: t('profile.stats.totalScore'), value: (stats?.total_score ?? 0).toLocaleString() },
                { label: t('profile.stats.totalHits'), value: (stats?.total_hits ?? 0).toLocaleString() },
                { label: t('profile.stats.hitsPerPlay'), value: avgHitsPerPlay.toLocaleString() },
                { label: t('profile.stats.maxCombo'), value: (stats?.maximum_combo ?? 0).toLocaleString() },
                { label: t('profile.stats.replaysWatched'), value: (stats?.replays_watched_by_others ?? 0).toLocaleString() },
              ].map((s) => (
                <div
                  key={String(s.label)}
                  className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2"
                >
                  <span className="truncate text-white/55">{s.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-white">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Friends + level, folded into the bottom of the card (osu-style) so it
                isn't a near-empty standalone strip. */}
            <div className="h-px bg-white/10" />
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <FriendStats user={user} />
              <LevelProgress levelCurrent={levelCurrent} levelProgress={levelProgress} className="flex-1 min-w-[140px]" tint={profileColor} />
              {/* Grades — clean pills, tucked to the right of the level bar (was a full row). */}
              <div className="flex items-center gap-2.5">
                {[
                  { src: '/image/grades/SS-Silver.svg', alt: 'SSH', count: gradeCounts.ssh },
                  { src: '/image/grades/SS.svg', alt: 'SS', count: gradeCounts.ss },
                  { src: '/image/grades/S-Silver.svg', alt: 'SH', count: gradeCounts.sh },
                  { src: '/image/grades/S.svg', alt: 'S', count: gradeCounts.s },
                  { src: '/image/grades/A.svg', alt: 'A', count: gradeCounts.a },
                ].map((g) => (
                  <div key={g.alt} className="flex items-center gap-1" title={g.alt}>
                    <img src={g.src} alt={g.alt} className="h-[18px] w-auto" loading="lazy" decoding="async" />
                    <span className="text-xs font-bold tabular-nums text-white/90">{g.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────────────────── Body ───────────────────────────── */}
        <Section>
          <UserPageDisplay user={user} onUserUpdate={onUserUpdate} />
        </Section>

        <Section>
          <UserRecentActivity userId={user.id} />
        </Section>

        <Section>
          <UserPinnedScores
            userId={user.id}
            selectedMode={selectedMode}
            user={user}
            clientDisplayMode={scoreClientDisplayMode}
            refreshRef={pinnedScoresRefreshRef}
            onPinActionRef={pinActionRef}
            bestScoresActionRef={bestScoresActionRef}
          />
        </Section>

        <Section>
          <UserBestScores
            userId={user.id}
            selectedMode={selectedMode}
            user={user}
            initialScores={initialBestScores}
            initialScoresKey={initialBestScoresKey}
            clientDisplayMode={scoreClientDisplayMode}
            refreshRef={bestScoresRefreshRef}
            onPinnedListRefresh={() => pinnedScoresRefreshRef.current?.()}
            pinActionRef={pinActionRef}
            bestScoresActionRef={bestScoresActionRef}
          />
        </Section>

        <Section>
          <UserMostPlayedBeatmaps userId={user.id} user={user} />
        </Section>

        {/* Matchmaking — self-hides for users who never queued. */}
        <Section className="empty:hidden">
          <MatchmakingStatsCard userId={user.id} />
        </Section>

        {/* Daily Challenge — self-hides for users who never engaged. */}
        <Section className="empty:hidden">
          <DailyChallengeStatsCard stats={user.daily_challenge_user_stats} />
        </Section>

        <Section>
          <UserRecentScores
            userId={user.id}
            selectedMode={selectedMode}
            user={user}
            clientDisplayMode={scoreClientDisplayMode}
            onPinnedListRefresh={() => {
              pinnedScoresRefreshRef.current?.();
              bestScoresRefreshRef.current?.();
            }}
          />
        </Section>

        <Section>
          <UserMappedBeatmaps userId={user.id} user={user} />
        </Section>

        <Section>
          <Achievements userAchievements={user.user_achievements} />
        </Section>
      </div>

      {/* Profile-only tooltip anchors (country-tooltip is mounted globally in Layout). */}
      <Tooltip id="team-tooltip" />
      <Tooltip id="cover-toggle-tooltip" />
    </main>
  );
};

export default UserProfileLayout;
