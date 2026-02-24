import React, { useEffect, useMemo, useState } from 'react';
import { useProfileColor } from '../../contexts/ProfileColorContext';
import { userAPI, type UserBeatmapsetType } from '../../utils/api';
import type { User } from '../../types';

interface Beatmap {
  id: number;
  mode?: string;
}

interface Beatmapset {
  id: number;
  title: string;
  artist: string;
  creator?: string;
  beatmap_status?: string;
  status?: string;
  beatmaps?: Beatmap[];
  covers?: {
    card?: string;
    cover?: string;
    list?: string;
    slimcover?: string;
  };
}

interface UserMappedBeatmapsProps {
  userId: number;
  user?: User;
  max?: number;
}

const STATUS_TYPES: UserBeatmapsetType[] = ['ranked', 'pending', 'loved', 'graveyard'];

const statusLabel = (status: string | undefined): string => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const statusChipClass = (status: string | undefined): string => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'ranked' || normalized === 'approved') return 'bg-green-600/20 text-green-300 border-green-400/30';
  if (normalized === 'loved') return 'bg-pink-600/20 text-pink-300 border-pink-400/30';
  if (normalized === 'pending' || normalized === 'wip') return 'bg-yellow-600/20 text-yellow-300 border-yellow-400/30';
  if (normalized === 'graveyard') return 'bg-slate-600/30 text-slate-300 border-slate-400/30';
  return 'bg-blue-600/20 text-blue-300 border-blue-400/30';
};

const UserMappedBeatmaps: React.FC<UserMappedBeatmapsProps> = ({ userId, user, max = 10 }) => {
  const { profileColor } = useProfileColor();
  const [items, setItems] = useState<Beatmapset[]>([]);
  const [loading, setLoading] = useState(true);

  const totalMapped = useMemo(() => {
    if (!user) return 0;
    return (
      (user.ranked_beatmapset_count ?? 0) +
      (user.pending_beatmapset_count ?? 0) +
      (user.loved_beatmapset_count ?? 0) +
      (user.graveyard_beatmapset_count ?? 0)
    );
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const responses = await Promise.all(
          STATUS_TYPES.map((type) => userAPI.getUserBeatmapsets(userId, type, Math.max(max, 6), 0)),
        );

        const merged: Beatmapset[] = [];
        for (const response of responses) {
          const rows = Array.isArray(response) ? response : [];
          for (const row of rows) {
            merged.push(row as Beatmapset);
          }
        }

        const uniqueById = new Map<number, Beatmapset>();
        for (const set of merged) {
          if (!uniqueById.has(set.id)) {
            uniqueById.set(set.id, set);
          }
        }

        setItems(Array.from(uniqueById.values()).slice(0, max));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, max]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }} />
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Mapped Beatmaps {totalMapped > 0 ? `(${totalMapped.toLocaleString()})` : ''}
        </h3>
      </div>

      {loading && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading...</div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">No mapped beatmaps yet.</div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((set) => {
            const beatmapId = set.beatmaps?.[0]?.id;
            const href = beatmapId ? `/beatmapsets/${set.id}#osu/${beatmapId}` : `/beatmapsets/${set.id}`;
            const cover = set.covers?.card || set.covers?.cover || set.covers?.list || set.covers?.slimcover;
            const displayStatus = set.status || set.beatmap_status;

            return (
              <a
                key={set.id}
                href={href}
                className="flex items-center gap-3 rounded-lg border border-card px-3 py-2 hover:bg-white/5 transition-colors"
              >
                {cover ? (
                  <img src={cover} alt={set.title} className="w-16 h-10 rounded object-cover" loading="lazy" />
                ) : (
                  <div className="w-16 h-10 rounded bg-slate-700/40" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-100 truncate">{set.title}</div>
                  <div className="text-xs text-gray-400 truncate">{set.artist}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded border ${statusChipClass(displayStatus)}`}>
                  {statusLabel(displayStatus)}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserMappedBeatmaps;
