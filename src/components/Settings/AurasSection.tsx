import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FiCheck, FiSlash, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { aurasAPI } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import UserAura from '../Auras/UserAura';
import { AURA_PRESETS } from '../Auras/registry';
import type { AuraCatalog, AuraCatalogEntry } from '../../types/aura';

/**
 * Settings card grid for picking a per-user aura cosmetic.
 *
 * Layout:
 *   - "Default (auto)" tile, always shown — picks the highest-priority
 *     aura the user is entitled to. Selected by default for new users.
 *   - "None" tile, always shown — explicit opt-out.
 *   - One tile per `catalog.available[]` entry, with a live preview
 *     rendering the actual particle preset behind the user's username.
 *
 * Picking a tile PATCHes the server immediately. Failures bubble up via
 * toast and the catalog is re-fetched so we land on the truth.
 */
const AurasSection: React.FC = () => {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<AuraCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<string | null>(null);

  const username = user?.username ?? 'Preview';

  const refresh = useCallback(async () => {
    try {
      const data = await aurasAPI.getCatalog();
      setCatalog(data);
    } catch (err) {
      // Auras only meaningful for logged-in users — if the GET fails
      // (e.g. 401 because session expired), surface once and let the
      // user log in again rather than spamming retries.
      console.error('Failed to load aura catalog', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const equip = useCallback(
    async (auraId: string | null) => {
      if (equipping) return; // single-flight, ignore double-clicks
      setEquipping(auraId ?? '__null__');
      try {
        const updated = await aurasAPI.setEquippedAura(auraId);
        setCatalog(updated);
        toast.success('Aura updated');
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        toast.error(
          status === 403
            ? "You don't have access to that aura."
            : (detail ?? 'Failed to update aura'),
        );
        // Pull fresh state so the UI reflects what the server actually has.
        void refresh();
      } finally {
        setEquipping(null);
      }
    },
    [equipping, refresh],
  );

  const currentSetting = catalog?.current_setting ?? null;
  const sentinelDefault = catalog?.sentinel_default ?? 'default';
  const sentinelNone = catalog?.sentinel_none ?? 'none';

  // The "default" effective preview should be whichever aura the server
  // says is currently active when default is selected — that's the
  // effective_aura_id when current_setting is "default" or null.
  const defaultPreviewAuraId = useMemo(() => {
    if (!catalog) return null;
    if (currentSetting == null || currentSetting === sentinelDefault) {
      return catalog.effective_aura_id;
    }
    // User has picked something specific — for the Default card preview,
    // resolve what they would see if they picked Default. The server
    // already gave us the prioritized list in catalog.available; the
    // first entry is the highest-priority one.
    return catalog.available[0]?.id ?? null;
  }, [catalog, currentSetting, sentinelDefault]);

  if (loading) {
    return (
      <div className="text-sm text-gray-400 py-3">Loading auras…</div>
    );
  }

  if (!catalog) {
    return (
      <div className="text-sm text-gray-400 py-3">Couldn't load aura catalog.</div>
    );
  }

  const tiles: Array<{ key: string; element: React.ReactNode }> = [];

  // Tile factory keeps card markup consistent across Default / None /
  // entitled auras. `previewAuraId` drives the UserAura inside the tile.
  const makeTile = (opts: {
    key: string;
    title: string;
    subtitle: string;
    icon?: React.ReactNode;
    previewAuraId: string | null;
    serverValue: string | null;
    matchesCurrent: boolean;
  }) => {
    const isEquipping = equipping === (opts.serverValue ?? '__null__');
    return (
      <button
        key={opts.key}
        onClick={() => equip(opts.serverValue)}
        disabled={isEquipping}
        className={[
          'group relative flex flex-col items-stretch rounded-lg border bg-black/30 p-4 text-left transition',
          opts.matchesCurrent
            ? 'border-osu-pink shadow-lg shadow-osu-pink/20'
            : 'border-white/10 hover:border-white/30 hover:bg-black/40',
          isEquipping ? 'opacity-60 cursor-wait' : '',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            {opts.icon}
            <span>{opts.title}</span>
          </div>
          {opts.matchesCurrent && <FiCheck className="text-osu-pink" />}
        </div>
        <div className="text-xs text-gray-400 mb-3 min-h-[2lh]">{opts.subtitle}</div>
        <div className="relative h-24 rounded bg-black/80 flex items-center justify-center overflow-hidden">
          {/* Bumped from h-16 → h-24: gives particles more vertical space
              to be visible (admin sparks rise ~1x text height, leaves drift
              around it). Pure black plate for max contrast against the
              additive-blend particles. */}
          <UserAura auraId={opts.previewAuraId}>
            <span className="text-lg font-semibold text-white">{username}</span>
          </UserAura>
        </div>
      </button>
    );
  };

  tiles.push({
    key: '__default__',
    element: makeTile({
      key: '__default__',
      title: 'Default',
      subtitle: 'Use whichever aura your highest-priority group grants automatically.',
      icon: <FiZap />,
      previewAuraId: defaultPreviewAuraId,
      serverValue: sentinelDefault,
      matchesCurrent: currentSetting == null || currentSetting === sentinelDefault,
    }),
  });

  tiles.push({
    key: '__none__',
    element: makeTile({
      key: '__none__',
      title: 'None',
      subtitle: 'Hide your aura entirely. Your name renders plain everywhere.',
      icon: <FiSlash />,
      previewAuraId: null,
      serverValue: sentinelNone,
      matchesCurrent: currentSetting === sentinelNone,
    }),
  });

  catalog.available.forEach((entry: AuraCatalogEntry) => {
    const presetKnown = entry.id in AURA_PRESETS;
    tiles.push({
      key: entry.id,
      element: makeTile({
        key: entry.id,
        title: entry.display_name,
        subtitle: presetKnown
          ? entry.description
          : `${entry.description} (preview unavailable in this build)`,
        previewAuraId: presetKnown ? entry.id : null,
        serverValue: entry.id,
        matchesCurrent: currentSetting === entry.id,
      }),
    });
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">User Aura</h3>
        <p className="text-sm text-gray-400">
          Pick the particle effect that plays behind your username everywhere
          it appears. Other people see your choice in chat, profile and
          leaderboards.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(t => t.element)}
      </div>
    </div>
  );
};

export default AurasSection;
