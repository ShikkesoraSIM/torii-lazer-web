import React from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface RankHistoryData {
  data: number[];
}

interface RankHistoryChartProps {
  rankHistory?: RankHistoryData;
  isUpdatingMode?: boolean;
  selectedModeColor?: string;
  title?: string;
  delay?: number;
  height?: string | number;
  showTitle?: boolean;
  fullBleed?: boolean; // whether to stretch edge to edge
  bare?: boolean; // render without the outer card (for embedding in another panel)
}

type Pt = { x: number; y: number; rank: number; idx: number };

// Fritsch-Carlson monotone cubic interpolation -> a smooth curve with no
// overshoot, matching what recharts produced with type="monotone". Doing it
// by hand lets us drop recharts (~330KB) from the profile bundle entirely.
function buildMonotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const ddx = pts[i + 1].x - pts[i].x;
    dx[i] = ddx;
    slope[i] = ddx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / ddx;
  }

  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (m[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
    d += `C${c1x},${c1y} ${c2x},${c2y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

// Lightweight ResizeObserver hook so the SVG fills its container in px space
// (no preserveAspectRatio stretching of the stroke).
function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const RankHistoryChart: React.FC<RankHistoryChartProps> = ({
  rankHistory,
  isUpdatingMode = false,
  selectedModeColor = '#e91e63',
  delay = 0.4,
  height = '16rem',
  fullBleed = true,
  bare = false,
}) => {
  const { t } = useTranslation();
  const accent = selectedModeColor || '#e91e63';
  const fillId = React.useId();
  const [wrapRef, { width: W, height: H }] = useElementSize<HTMLDivElement>();
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  // Preprocess data: drop 0 (treated as missing), keep chronological order
  const chartData = React.useMemo(() => {
    const src = rankHistory?.data ?? [];
    if (src.length === 0) return [] as Array<{ idx: number; rank: number }>;

    const validData = src
      .map((rank, originalIdx) => ({ originalIdx, rank: rank === 0 ? null : rank }))
      .filter((d) => d.rank !== null) as Array<{ originalIdx: number; rank: number }>;

    return validData.map((item, newIdx) => ({ idx: newIdx, rank: item.rank }));
  }, [rankHistory?.data]);

  const total = chartData.length;

  // Map rank values into pixel-space points. Lower rank (better) sits on top,
  // with 5% padding above/below so peaks aren't clipped (mirrors the old
  // recharts yDomain padding).
  const { points, linePath, areaPath } = React.useMemo(() => {
    if (W === 0 || H === 0 || chartData.length === 0) {
      return { points: [] as Pt[], linePath: '', areaPath: '' };
    }
    const padX = 3;
    const padTop = 10;
    const padBot = 10;
    const values = chartData.map((d) => d.rank);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const pad = Math.max(1, Math.round((dataMax - dataMin) * 0.05));
    const domMin = dataMin - pad;
    const span = dataMax + pad - domMin || 1;
    const innerW = Math.max(1, W - 2 * padX);
    const innerH = Math.max(1, H - padTop - padBot);

    const pts: Pt[] = chartData.map((d, i) => ({
      x: total === 1 ? W / 2 : padX + (i / (total - 1)) * innerW,
      y: padTop + ((d.rank - domMin) / span) * innerH,
      rank: d.rank,
      idx: d.idx,
    }));

    const line = buildMonotonePath(pts);
    const area =
      pts.length >= 2
        ? `${line}L${pts[pts.length - 1].x},${H}L${pts[0].x},${H}Z`
        : '';
    return { points: pts, linePath: line, areaPath: area };
  }, [chartData, total, W, H]);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - x);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };

  const hover = hoverIdx !== null ? points[hoverIdx] : null;
  const daysAgo = hover ? total - 1 - hover.idx : 0;
  const hoverLabel = hover
    ? daysAgo === 0
      ? t('profile.rankHistory.justNow')
      : t('profile.rankHistory.daysAgo', { count: daysAgo })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={bare ? 'relative isolate' : 'relative isolate overflow-hidden rounded-[22px] bg-[rgba(15,20,52,0.62)] p-6 backdrop-blur-xl shadow-[0_16px_44px_rgba(0,0,0,0.38)] outline-none focus:outline-none ring-0 focus:ring-0'}
      style={{ outline: 'none' }}
    >
      {!bare && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(152deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02)_38%,rgba(8,12,34,0.34))]" />
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(120% 82% at 76% 8%, ${accent}22 0%, transparent 46%),
                radial-gradient(92% 70% at 88% 92%, rgba(80,180,255,0.12) 0%, transparent 54%),
                radial-gradient(70% 70% at 56% 58%, rgba(255,255,255,0.04) 0%, transparent 62%)
              `,
            }}
          />
          <div className="absolute inset-y-0 right-[16%] w-[26%] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent blur-2xl opacity-35" />
        </div>
      )}

      <div className={`relative z-10 ${fullBleed && !bare ? '-mx-6' : ''}`} style={{ height }}>
        {isUpdatingMode ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-center" style={{ color: 'var(--text-muted)' }}>
              <FiBarChart2 className="mx-auto text-4xl mb-2" />
              <p>{t('profile.rankHistory.loading')}</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div
            ref={wrapRef}
            className="relative h-full w-full"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setHoverIdx(null)}
          >
            {W > 0 && H > 0 && points.length > 0 && (
              <svg width={W} height={H} className="block overflow-visible">
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.26" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {areaPath && <path d={areaPath} fill={`url(#${fillId})`} />}

                {points.length === 1 ? (
                  <circle cx={points[0].x} cy={points[0].y} r={4} fill={accent} />
                ) : (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={accent}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 2px 6px ${accent}55)` }}
                  />
                )}

                {hover && (
                  <g pointerEvents="none">
                    <line
                      x1={hover.x}
                      y1={0}
                      x2={hover.x}
                      y2={H}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={1}
                    />
                    <circle cx={hover.x} cy={hover.y} r={6} fill={accent} fillOpacity={0.25} />
                    <circle
                      cx={hover.x}
                      cy={hover.y}
                      r={3.5}
                      fill={accent}
                      stroke="var(--bg-primary)"
                      strokeWidth={1.5}
                    />
                  </g>
                )}
              </svg>
            )}

            {hover && (
              <div
                className="pointer-events-none absolute z-20 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm shadow-lg"
                style={{
                  left: hover.x,
                  top: hover.y,
                  transform: `translate(${
                    hover.x < 60 ? '0' : hover.x > W - 60 ? '-100%' : '-50%'
                  }, calc(-100% - 12px))`,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {hoverLabel}
                </div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  #{hover.rank}{' '}
                  <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                    {t('profile.rankHistory.globalRank')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FiBarChart2 className="mx-auto text-4xl mb-2" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>{t('profile.rankHistory.noData')}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RankHistoryChart;
