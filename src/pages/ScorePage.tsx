import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { beatmapAPI, handleApiError, scoreAPI, userAPI } from '../utils/api';
import type { BestScore } from '../types';
import { formatScoreClientVersion } from '../utils/clientVersion';

const RANK_ICON_MAP: Record<string, string> = {
  XH: '/image/grades/SS-Silver.svg',
  X: '/image/grades/SS.svg',
  SH: '/image/grades/S-Silver.svg',
  S: '/image/grades/S.svg',
  A: '/image/grades/A.svg',
  B: '/image/grades/B.svg',
  C: '/image/grades/C.svg',
  D: '/image/grades/D.svg',
  F: '/image/grades/F.svg',
};

const INNER_THRESHOLD_SEGMENTS = [
  { start: 0, end: 70, color: '#fb7185' }, // D
  { start: 70, end: 80, color: '#d946ef' }, // C
  { start: 80, end: 90, color: '#f59e0b' }, // B
  { start: 90, end: 95, color: '#34d399' }, // A
  { start: 95, end: 100, color: '#22d3ee' }, // S
];

type RingGradientStop = {
  offset: string;
  color: string;
};

type RingGradientConfig = {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  stops: RingGradientStop[];
};

const OUTER_RING_GRADIENTS: Record<string, RingGradientConfig> = {
  // SS Silver: cool metallic + icy highlight.
  XH: {
    x1: '100%',
    y1: '0%',
    x2: '0%',
    y2: '100%',
    stops: [
      { offset: '0%', color: '#f8fafc' },
      { offset: '26%', color: '#dbe5ef' },
      { offset: '56%', color: '#9caec3' },
      { offset: '82%', color: '#e2e8f0' },
      { offset: '100%', color: '#7dd3fc' },
    ],
  },
  // SS: warm gold spectrum.
  X: {
    x1: '0%',
    y1: '100%',
    x2: '100%',
    y2: '0%',
    stops: [
      { offset: '0%', color: '#fef3c7' },
      { offset: '28%', color: '#facc15' },
      { offset: '56%', color: '#f59e0b' },
      { offset: '82%', color: '#fde68a' },
      { offset: '100%', color: '#f97316' },
    ],
  },
  SH: {
    x1: '12%',
    y1: '0%',
    x2: '88%',
    y2: '100%',
    stops: [
      { offset: '0%', color: '#bae6fd' },
      { offset: '45%', color: '#22d3ee' },
      { offset: '100%', color: '#34d399' },
    ],
  },
  S: {
    x1: '0%',
    y1: '0%',
    x2: '100%',
    y2: '100%',
    stops: [
      { offset: '0%', color: '#34d399' },
      { offset: '45%', color: '#67e8f9' },
      { offset: '100%', color: '#38bdf8' },
    ],
  },
  A: {
    x1: '0%',
    y1: '0%',
    x2: '100%',
    y2: '100%',
    stops: [
      { offset: '0%', color: '#86efac' },
      { offset: '48%', color: '#4ade80' },
      { offset: '100%', color: '#22d3ee' },
    ],
  },
  // B: non-linear warm blend so it doesn't look flat.
  B: {
    x1: '8%',
    y1: '0%',
    x2: '92%',
    y2: '100%',
    stops: [
      { offset: '0%', color: '#fde047' },
      { offset: '22%', color: '#facc15' },
      { offset: '52%', color: '#f59e0b' },
      { offset: '74%', color: '#fb923c' },
      { offset: '100%', color: '#fbbf24' },
    ],
  },
  C: {
    x1: '0%',
    y1: '100%',
    x2: '100%',
    y2: '0%',
    stops: [
      { offset: '0%', color: '#f472b6' },
      { offset: '46%', color: '#e879f9' },
      { offset: '100%', color: '#a78bfa' },
    ],
  },
  D: {
    x1: '0%',
    y1: '0%',
    x2: '100%',
    y2: '100%',
    stops: [
      { offset: '0%', color: '#fb7185' },
      { offset: '52%', color: '#f43f5e' },
      { offset: '100%', color: '#ec4899' },
    ],
  },
  F: {
    x1: '0%',
    y1: '0%',
    x2: '100%',
    y2: '100%',
    stops: [
      { offset: '0%', color: '#f43f5e' },
      { offset: '52%', color: '#ef4444' },
      { offset: '100%', color: '#fb7185' },
    ],
  },
};

const AccuracyRing: React.FC<{
  accuracyPercent: number;
  rank: string;
  rankIcon: string;
}> = ({ accuracyPercent, rank, rankIcon }) => {
  const ringId = useId().replace(/:/g, '');
  const size = 176;
  const center = size / 2;
  const outerRadius = 75;
  const thresholdRadius = 63;
  const coreRadius = 52;
  const outerStrokeWidth = 12;
  const thresholdStrokeWidth = 4;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const clampedAccuracy = Math.max(0, Math.min(100, accuracyPercent));
  const progress = clampedAccuracy / 100;
  const gradientConfig =
    OUTER_RING_GRADIENTS[(rank || '').toUpperCase()] || OUTER_RING_GRADIENTS.F;

  return (
    <div className="relative w-44 h-44">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full drop-shadow-[0_0_22px_rgba(0,0,0,0.35)]"
        role="img"
        aria-label={`Accuracy ${clampedAccuracy.toFixed(2)} percent`}
      >
        <defs>
          <linearGradient
            id={`acc-progress-${ringId}`}
            x1={gradientConfig.x1}
            y1={gradientConfig.y1}
            x2={gradientConfig.x2}
            y2={gradientConfig.y2}
          >
            {gradientConfig.stops.map((stop) => (
              <stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="rgba(15, 23, 42, 0.62)"
          strokeWidth={outerStrokeWidth}
        />

        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke={`url(#acc-progress-${ringId})`}
          strokeWidth={outerStrokeWidth}
          strokeLinecap="butt"
          strokeDasharray={`${progress * outerCircumference} ${outerCircumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />

        <circle
          cx={center}
          cy={center}
          r={thresholdRadius}
          fill="none"
          stroke="rgba(15, 23, 42, 0.72)"
          strokeWidth={thresholdStrokeWidth}
        />

        <g transform={`rotate(-90 ${center} ${center})`}>
          {INNER_THRESHOLD_SEGMENTS.map((segment) => {
            const segmentLength = ((segment.end - segment.start) / 100) * (2 * Math.PI * thresholdRadius);
            const dashOffset = -((segment.start / 100) * (2 * Math.PI * thresholdRadius));
            return (
              <circle
                key={`${segment.start}-${segment.end}`}
                cx={center}
                cy={center}
                r={thresholdRadius}
                fill="none"
                stroke={segment.color}
                strokeOpacity={0.95}
                strokeWidth={thresholdStrokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${segmentLength} ${2 * Math.PI * thresholdRadius}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </g>

        <circle
          cx={center}
          cy={center}
          r={coreRadius}
          fill="rgba(6, 10, 30, 0.84)"
        />
      </svg>

      <img
        src={rankIcon}
        alt={rank}
        className="pointer-events-none absolute left-1/2 top-1/2 w-20 h-20 object-contain -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
};

const formatMode = (mode?: string) => {
  if (!mode) return 'osu!';
  if (mode === 'osu') return 'osu!';
  return mode;
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const safeInt = (value?: number) => (Number.isFinite(value) ? Number(value) : 0);

const getBeatmapPath = (score: BestScore) => {
  if (score.beatmapset?.id && score.beatmap?.id) {
    const mode = score.beatmap.mode || 'osu';
    return `/beatmapsets/${score.beatmapset.id}#${mode}/${score.beatmap.id}`;
  }
  return score.beatmap?.url || '/beatmaps';
};

const getMods = (score: BestScore) => {
  if (!score.mods || score.mods.length === 0) return 'NM';
  return score.mods.map((mod) => mod.acronym).join('');
};

const getBestScoreCover = (score?: BestScore | null): string | null => {
  const covers = score?.beatmapset?.covers;
  if (!covers) return null;

  return (
    covers['cover@2x'] ||
    covers.cover ||
    covers['card@2x'] ||
    covers.card ||
    covers['slimcover@2x'] ||
    covers.slimcover ||
    covers['list@2x'] ||
    covers.list ||
    null
  );
};

const normalizeHex = (value?: string | null, fallback: string = '#22d3ee') => {
  if (!value) return fallback;
  const raw = value.trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash : fallback;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  const parsed = normalized.slice(1);
  return {
    r: parseInt(parsed.slice(0, 2), 16),
    g: parseInt(parsed.slice(2, 4), 16),
    b: parseInt(parsed.slice(4, 6), 16),
  };
};

const blendHex = (baseHex: string, mixHex: string, ratio: number) => {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = Math.round(base.r * (1 - clamped) + mix.r * clamped);
  const g = Math.round(base.g * (1 - clamped) + mix.g * clamped);
  const b = Math.round(base.b * (1 - clamped) + mix.b * clamped);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const ScorePage: React.FC = () => {
  const { scoreId } = useParams<{ scoreId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [score, setScore] = useState<BestScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingReplay, setDownloadingReplay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCoverUrl, setResolvedCoverUrl] = useState<string | null>(null);
  const [resolvedProfileColor, setResolvedProfileColor] = useState<string | null>(null);
  const [isHitBreakdownOpen, setIsHitBreakdownOpen] = useState(false);

  useEffect(() => {
    const parsedScoreId = Number(scoreId);
    if (!Number.isFinite(parsedScoreId) || parsedScoreId <= 0) {
      setError('Invalid score id');
      setLoading(false);
      return;
    }

    const fetchScore = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await scoreAPI.getScoreById(parsedScoreId);
        const normalized = data as BestScore;
        setScore(normalized);
        setResolvedCoverUrl(getBestScoreCover(normalized));
      } catch (err) {
        console.error('Failed to fetch score details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load score');
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [scoreId]);

  useEffect(() => {
    const preferredCover = getBestScoreCover(score);
    if (preferredCover) {
      setResolvedCoverUrl(preferredCover);
      return;
    }

    const beatmapsetId = score?.beatmapset?.id;
    if (!beatmapsetId) return;

    let cancelled = false;
    const hydrateCover = async () => {
      try {
        const beatmapset = await beatmapAPI.getBeatmapset(beatmapsetId);
        const hydratedCover =
          beatmapset?.covers?.['cover@2x'] ||
          beatmapset?.covers?.cover ||
          beatmapset?.covers?.['card@2x'] ||
          beatmapset?.covers?.card ||
          beatmapset?.covers?.['slimcover@2x'] ||
          beatmapset?.covers?.slimcover ||
          beatmapset?.covers?.['list@2x'] ||
          beatmapset?.covers?.list ||
          null;

        if (!cancelled && hydratedCover) {
          setResolvedCoverUrl(hydratedCover);
        }
      } catch (fetchCoverErr) {
        console.warn('Could not hydrate beatmap cover for score page:', fetchCoverErr);
      }
    };

    hydrateCover();
    return () => {
      cancelled = true;
    };
  }, [score]);

  useEffect(() => {
    const userId = score?.user?.id;
    if (!userId) return;

    const fromScore = score?.user?.profile_colour;
    if (fromScore && String(fromScore).trim().length > 0) {
      setResolvedProfileColor(fromScore);
      return;
    }

    let cancelled = false;
    const hydrateProfileColor = async () => {
      try {
        const mode = score?.beatmap?.mode || 'osu';
        const fullUser = await userAPI.getUser(userId, mode);
        if (!cancelled && fullUser?.profile_colour) {
          setResolvedProfileColor(fullUser.profile_colour);
        }
      } catch (hydrateUserErr) {
        console.warn('Could not hydrate profile color for score page:', hydrateUserErr);
      }
    };

    hydrateProfileColor();
    return () => {
      cancelled = true;
    };
  }, [score?.user?.id, score?.user?.profile_colour, score?.beatmap?.mode]);

  const heroBackground = useMemo(() => {
    if (!resolvedCoverUrl) {
      return 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))';
    }
    return `linear-gradient(110deg, rgba(8,11,30,0.88), rgba(8,11,30,0.56)), url(${resolvedCoverUrl})`;
  }, [resolvedCoverUrl]);

  const accentTheme = useMemo(() => {
    const accent = normalizeHex(resolvedProfileColor || score?.user?.profile_colour, '#22d3ee');
    const accentRgbObj = hexToRgb(accent);
    const accentRgb = `${accentRgbObj.r}, ${accentRgbObj.g}, ${accentRgbObj.b}`;
    const accentSoft = blendHex(accent, '#60a5fa', 0.28);
    const accentDeep = blendHex(accent, '#0ea5e9', 0.42);
    const accuracyColor = blendHex(accent, '#ffffff', 0.14);
    return {
      accent,
      accentRgb,
      accentSoft,
      accentDeep,
      accuracyColor,
    };
  }, [resolvedProfileColor, score?.user?.profile_colour]);

  const handleDownloadReplay = async () => {
    if (!score) return;
    if (!score.has_replay) {
      toast.error('Replay is not available for this score');
      return;
    }

    setDownloadingReplay(true);
    try {
      const blob = await scoreAPI.downloadReplay(score.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `replay_${score.id}.osr`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Replay downloaded');
    } catch (err) {
      handleApiError(err);
    } finally {
      setDownloadingReplay(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-osu-pink" />
      </div>
    );
  }

  if (error || !score) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-500 mb-4">{error || 'Score not found'}</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-osu-pink text-white hover:bg-osu-pink/90 transition-colors"
          >
            {t('beatmap.goBack') || 'Go back'}
          </button>
        </div>
      </div>
    );
  }

  const scoreValue = safeInt(score.total_score || score.classic_total_score).toLocaleString();
  const accuracyValue = (score.accuracy || 0) * 100;
  const accuracy = accuracyValue.toFixed(2);
  const pp = (score.pp || 0).toFixed(0);
  const mode = score.beatmap?.mode || 'osu';
  const beatmapPath = getBeatmapPath(score);
  const globalRank = score.rank_global || score.position || null;
  const countryRank = score.rank_country || null;
  const clientVersionLabel = formatScoreClientVersion(score.client_version);
  const comboText = `${safeInt(score.max_combo).toLocaleString()}${
    score.beatmap?.max_combo ? ` / ${score.beatmap.max_combo.toLocaleString()}` : ''
  }`;

  const hitStats = [
    { label: 'Great', value: safeInt(score.statistics?.great) },
    { label: 'Ok', value: safeInt(score.statistics?.ok) },
    { label: 'Meh', value: safeInt(score.statistics?.meh) },
    { label: 'Miss', value: safeInt(score.statistics?.miss) },
    { label: 'Geki', value: safeInt(score.statistics?.perfect) },
    { label: 'Katu', value: safeInt(score.statistics?.good) },
    { label: 'Slider Tick', value: safeInt(score.statistics?.large_tick_hit) },
    { label: 'Slider End', value: safeInt(score.statistics?.slider_tail_hit) },
  ];

  return (
    <div className="min-h-screen pb-12 select-text torii-page-stage" style={{ userSelect: 'text' }}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-6 space-y-7">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-100 hover:text-white transition-colors px-3 py-2 rounded-xl torii-liquid-soft"
        >
          <span aria-hidden="true">&larr;</span>
          <span>{t('beatmap.goBack') || 'Back'}</span>
        </button>

        <section
          className="relative overflow-hidden rounded-3xl backdrop-blur-[2px] shadow-[0_20px_60px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.06] ring-inset"
          style={{
            backgroundImage: heroBackground,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/35 to-transparent" />
          <div className="absolute -top-20 -left-24 w-64 h-64 rounded-full bg-fuchsia-400/12 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 right-10 w-56 h-56 rounded-full bg-cyan-300/10 blur-3xl pointer-events-none" />
          <div className="relative p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex items-center gap-6 flex-wrap">
                <AccuracyRing
                  accuracyPercent={accuracyValue}
                  rank={score.rank}
                  rankIcon={RANK_ICON_MAP[score.rank] || RANK_ICON_MAP.F}
                />

                <div className="text-white">
                  <p className="text-5xl lg:text-6xl font-light tracking-tight">{scoreValue}</p>
                  <p className="mt-2 text-slate-200">
                    Played by{' '}
                    <Link
                      to={`/users/${score.user.id}?mode=${mode}`}
                      className="font-semibold hover:text-osu-pink transition-colors"
                    >
                      {score.user.username}
                    </Link>
                  </p>
                  <p className="text-sm text-slate-300">Submitted on {formatDateTime(score.ended_at)}</p>
                  {clientVersionLabel && (
                    <p className="text-xs text-slate-300 mt-1">
                      Client: <span className="text-slate-100 font-medium">{clientVersionLabel}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/12 border border-white/20 text-slate-100">
                      {formatMode(mode)}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/12 border border-white/20 text-slate-100">
                      {getMods(score)}
                    </span>
                    {globalRank && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-osu-pink/75 border border-white/20 text-white">
                        GLOBAL #{globalRank.toLocaleString()}
                      </span>
                    )}
                    {countryRank && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/12 border border-white/20 text-slate-100">
                        COUNTRY #{countryRank.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span>
                      Score ID: <span className="text-white font-medium">{score.id}</span>
                    </span>
                    <button
                      onClick={() => handleCopy(String(score.id), 'Score ID')}
                      className="px-2.5 py-1 rounded-lg bg-white/12 border border-white/20 text-slate-100 hover:bg-white/20 transition-colors"
                    >
                      Copy ID
                    </button>
                    <span>
                      Beatmap ID: <span className="text-white font-medium">{score.beatmap_id}</span>
                    </span>
                    <button
                      onClick={() => handleCopy(String(score.beatmap_id), 'Beatmap ID')}
                      className="px-2.5 py-1 rounded-lg bg-white/12 border border-white/20 text-slate-100 hover:bg-white/20 transition-colors"
                    >
                      Copy map ID
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!score.has_replay || downloadingReplay}
                onClick={handleDownloadReplay}
                className="self-start lg:self-center px-6 py-3 rounded-2xl border text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${accentTheme.accentSoft}, ${accentTheme.accentDeep})`,
                  borderColor: `rgba(${accentTheme.accentRgb},0.48)`,
                  boxShadow: `0 14px 30px rgba(${accentTheme.accentRgb},0.32), 0 0 34px rgba(${accentTheme.accentRgb},0.24)`,
                }}
              >
                {downloadingReplay ? 'Downloading...' : 'Download Replay'}
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <section className="xl:col-span-1 self-start rounded-3xl overflow-hidden bg-[linear-gradient(165deg,rgba(20,24,60,0.78),rgba(12,16,40,0.66))] shadow-[0_16px_42px_rgba(0,0,0,0.32)] ring-1 ring-black/35">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-lg font-semibold text-white">Player</h2>
            </div>
            <div className="p-5">
              <Link
                to={`/users/${score.user.id}?mode=${mode}`}
                className="flex items-center gap-4 hover:opacity-90 transition-opacity"
              >
                <img
                  src={score.user.avatar_url}
                  alt={score.user.username}
                  className="w-16 h-16 rounded-xl object-cover border border-white/20"
                />
                <div>
                  <p className="text-white text-lg font-semibold">{score.user.username}</p>
                  <p className="text-slate-400 text-sm">{score.user.country_code}</p>
                </div>
              </Link>
              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="text-slate-400 text-xs uppercase tracking-wide">Beatmap</p>
                <Link
                  to={beatmapPath}
                  className="mt-2 block text-white font-semibold hover:text-osu-pink transition-colors"
                >
                  {score.beatmapset?.title_unicode || score.beatmapset?.title || 'Unknown Beatmap'}
                </Link>
                <p className="text-slate-400 text-sm mt-1">
                  {score.beatmap?.version || '-'} by {score.beatmapset?.creator || '-'}
                </p>
              </div>
            </div>
          </section>

          <section className="xl:col-span-2 self-start rounded-3xl overflow-hidden bg-[linear-gradient(165deg,rgba(20,24,60,0.78),rgba(12,16,40,0.66))] shadow-[0_16px_42px_rgba(0,0,0,0.32)] ring-1 ring-black/35">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-lg font-semibold text-white">Performance</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  className="rounded-xl px-4 py-4 border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))]"
                >
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Accuracy</p>
                  <p
                    className="text-3xl font-semibold"
                    style={{
                      color: accentTheme.accuracyColor,
                      textShadow: `0 0 16px rgba(${accentTheme.accentRgb},0.22)`,
                    }}
                  >
                    {accuracy}%
                  </p>
                </div>
                <div className="rounded-xl px-4 py-4 border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))]">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">PP</p>
                  <p
                    className="text-3xl font-semibold torii-pp-gradient"
                    style={{ textShadow: `0 0 16px rgba(${accentTheme.accentRgb},0.16)` }}
                  >
                    {pp}
                  </p>
                </div>
                <div className="rounded-xl px-4 py-4 border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))]">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Max Combo</p>
                  <p className="text-3xl font-semibold text-white">{comboText}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl px-4 py-3 border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))]">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Score</p>
                  <p className="text-xl font-semibold text-white">{scoreValue}</p>
                </div>
                <div className="rounded-xl px-4 py-3 border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))]">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Global Rank</p>
                  <p className="text-xl font-semibold text-white">
                    {globalRank ? `#${globalRank.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div className="rounded-xl px-4 py-3 border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))]">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Country Rank</p>
                  <p className="text-xl font-semibold text-white">
                    {countryRank ? `#${countryRank.toLocaleString()}` : '-'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsHitBreakdownOpen((open) => !open)}
                  className="w-full px-4 py-3 text-sm text-slate-200 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span>Hit breakdown</span>
                  <motion.span
                    animate={{ rotate: isHitBreakdownOpen ? 90 : 0 }}
                    transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                    className="text-slate-300"
                  >
                    ▶
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isHitBreakdownOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {hitStats.map((stat) => (
                          <div key={stat.label} className="rounded-xl px-4 py-3 border border-white/10 bg-[linear-gradient(165deg,rgba(18,22,53,0.64),rgba(10,13,35,0.56))]">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">{stat.label}</p>
                            <p className="text-xl font-semibold text-white">{stat.value.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ScorePage;
