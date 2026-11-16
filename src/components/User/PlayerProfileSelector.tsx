import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { api } from '../../utils/api/client';
import type { GameMode } from '../../types';

interface ProfilesResponse {
  master_user_id: number;
  mode: string;
  profiles: { user_id: number; name: string; is_main: boolean; pp: number; global_rank: number }[];
}

export default function PlayerProfileSelector({ userId, mode }: { userId: number; mode: GameMode }) {
  const navigate = useNavigate();
  const [data, setData] = useState<ProfilesResponse>();

  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    void api.get<ProfilesResponse>(`/api/private/torii/profiles/${userId}`, {
      params: { mode }, signal: controller.signal,
    }).then(response => {
      if (!controller.signal.aborted) setData(response.data);
    }).catch(() => {});
    return () => controller.abort();
  }, [userId, mode]);

  if (!data || data.profiles.length <= 1) return null;
  const selected = data.profiles.some(profile => profile.user_id === userId) ? userId : '';
  return (
    <label className="inline-flex w-fit max-w-full items-center gap-1.5 text-xs text-white/80">
      <UserRound size={14} className="text-white/60" aria-hidden="true" />
      <select
        aria-label="Player profile"
        value={selected}
        onChange={event => navigate(`/users/${event.target.value}?mode=${encodeURIComponent(mode)}`)}
        className="rounded-md border border-white/20 bg-gray-900/90 px-2 py-1 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-osu-pink"
      >
        {selected === '' && <option value="" disabled>Choose profile</option>}
        {data.profiles.map(profile => <option key={profile.user_id} value={profile.user_id}>{profile.name}</option>)}
      </select>
    </label>
  );
}
