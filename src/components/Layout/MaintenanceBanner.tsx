// Site-wide maintenance banner.
//
// Polls GET /api/v2/server/status (a public, unauthenticated endpoint
// — see g0v0-server/app/router/v2/misc.py) at a low cadence and
// renders a thin amber stripe at the very top of the page when the
// server is in maintenance mode. Score submission is gated server-
// side; this banner is purely the user-facing heads-up.
//
// Polling is intentionally lightweight (one HGET-equivalent on the
// server, single tiny JSON over the wire) and stops while the tab is
// hidden via the visibility API to avoid burning cycles for inactive
// tabs.

import React, { useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { api } from '../../utils/api/client';

const POLL_INTERVAL_MS = 30_000;
const ENDPOINT = '/api/v2/server/status';

interface ServerStatus {
  maintenance: boolean;
  message: string | null;
}

const MaintenanceBanner: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await api.get<ServerStatus>(ENDPOINT);
        if (!cancelled) setStatus(res.data);
      } catch {
        // Swallow — banner is best-effort.
      } finally {
        if (!cancelled && document.visibilityState === 'visible') {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !timer) {
        void tick();
      }
    };

    void tick();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const visible = !!status?.maintenance;

  useEffect(() => {
    const root = document.documentElement;
    const el = bannerRef.current;
    if (!visible || !el) {
      root.style.setProperty('--maintenance-banner-h', '0px');
      return;
    }
    const update = () => root.style.setProperty('--maintenance-banner-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--maintenance-banner-h', '0px');
    };
  }, [visible, status?.message]);

  if (!visible || !status) return null;

  return (
    <div
      ref={bannerRef}
      role="alert"
      aria-label="Server maintenance notice"
      className="fixed left-0 right-0 z-[65] bg-amber-600/95 text-white text-sm shadow-md"
      style={{ top: 'var(--restriction-banner-h, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <FaExclamationTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span className="font-medium">Maintenance mode:</span>
        <span className="opacity-95 truncate">
          {status.message ||
            'Score submission is temporarily disabled. Other features still work.'}
        </span>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
