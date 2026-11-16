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
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setIsError(false);
    void api.get<ProfilesResponse>(`/api/private/torii/profiles/${userId}`, {
      params: { mode }, signal: controller.signal,
    }).then(response => {
      if (!controller.signal.aborted) setData(response.data);
    }).catch(() => {
      if (!controller.signal.aborted) setIsError(true);
    });
    return () => controller.abort();
  }, [userId, mode, attempt]);
  const isPending = !data && !isError;
  if (isPending) return <span className="mt-2 block text-xs text-white/50">Loading player profiles...</span>;
  if (isError) return <button type="button" className="mt-2 text-xs text-white/60 underline" onClick={() => setAttempt(value => value + 1)}>Retry player profiles</button>;
  if (!data) return null;
  const selected = data.profiles.some(profile => profile.user_id === userId) ? userId : '';
  return (
    <label className="mt-3 flex w-fit max-w-full flex-wrap items-center gap-2 text-sm text-white/80">
      <UserRound size={16} aria-hidden="true" />
      <span>Player profile</span>
      <select
        aria-label="Player profile"
        value={selected}
        disabled={data.profiles.length < 2 && selected !== ''}
        onChange={event => navigate(`/users/${event.target.value}?mode=${encodeURIComponent(mode)}`)}
        className="min-w-0 max-w-full rounded-md border border-white/20 bg-gray-900 px-3 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-osu-pink"
      >
        {selected === '' && <option value="" disabled>Choose a profile for this mode</option>}
        {data.profiles.map(profile => <option key={profile.user_id} value={profile.user_id}>{profile.name}</option>)}
      </select>
    </label>
  );
}
