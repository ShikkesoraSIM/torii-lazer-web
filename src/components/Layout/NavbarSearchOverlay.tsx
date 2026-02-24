import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronRight, FiSearch, FiX } from 'react-icons/fi';
import type { Beatmapset } from '../../types/beatmap';
import { beatmapAPI, searchAPI, userAPI } from '../../utils/api';
import type { NavbarSearchTeam, NavbarSearchUser } from '../../utils/api/search';

interface NavbarSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_BEATMAP_RESULTS = 6;
const MAX_USER_RESULTS = 6;
const MAX_TEAM_RESULTS = 6;

const getBeatmapCover = (beatmapset: Beatmapset): string => {
  return (
    beatmapset?.covers?.card ||
    beatmapset?.covers?.list ||
    beatmapset?.covers?.cover ||
    '/default.jpg'
  );
};

const NavbarSearchOverlay: React.FC<NavbarSearchOverlayProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [beatmaps, setBeatmaps] = useState<Beatmapset[]>([]);
  const [users, setUsers] = useState<NavbarSearchUser[]>([]);
  const [teams, setTeams] = useState<NavbarSearchTeam[]>([]);
  const [directorySearchUnavailable, setDirectorySearchUnavailable] = useState(false);

  const resetResults = () => {
    setBeatmaps([]);
    setUsers([]);
    setTeams([]);
  };

  const handleClose = () => {
    setQuery('');
    resetResults();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setIsLoading(false);
      resetResults();
      return;
    }

    const fetchId = ++fetchIdRef.current;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const [searchResult, beatmapResult] = await Promise.allSettled([
          searchAPI.navbarSearch(trimmedQuery, MAX_USER_RESULTS, MAX_TEAM_RESULTS),
          beatmapAPI.searchBeatmaps({
            q: trimmedQuery,
            s: 'leaderboard',
            sort: 'relevance_desc',
          }),
        ]);

        if (fetchId !== fetchIdRef.current) return;

        let nextUsers: NavbarSearchUser[] = [];
        let nextTeams: NavbarSearchTeam[] = [];
        let searchUnavailable = false;

        if (searchResult.status === 'fulfilled') {
          nextUsers = searchResult.value.users ?? [];
          nextTeams = searchResult.value.teams ?? [];
        } else {
          const error = searchResult.reason as { response?: { status?: number } } | undefined;
          searchUnavailable = error?.response?.status === 404;
          // Backward-compatible fallback: exact username lookup.
          try {
            const exactUser = await userAPI.getUser(trimmedQuery);
            if (exactUser?.id && exactUser?.username) {
              nextUsers = [
                {
                  id: exactUser.id,
                  username: exactUser.username,
                  avatar_url: exactUser.avatar_url || '/default.jpg',
                  country_code: exactUser.country_code || 'XX',
                  is_online: Boolean(exactUser.is_online),
                  team_id: exactUser.team?.id ?? null,
                },
              ];
            }
          } catch {
            // Ignore fallback errors and keep empty results.
          }
        }

        const nextBeatmaps =
          beatmapResult.status === 'fulfilled'
            ? (beatmapResult.value?.beatmapsets ?? []).slice(0, MAX_BEATMAP_RESULTS)
            : [];

        setDirectorySearchUnavailable(searchUnavailable);
        setUsers(nextUsers);
        setTeams(nextTeams);
        setBeatmaps(nextBeatmaps);
      } catch (error) {
        if (fetchId === fetchIdRef.current) {
          resetResults();
          setDirectorySearchUnavailable(false);
        }
        console.error('Navbar search failed:', error);
      } finally {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  const hasResults = beatmaps.length > 0 || users.length > 0 || teams.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-[3px] px-4 pt-24 pb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={handleClose}
        >
          <motion.div
            className="mx-auto w-full max-w-6xl rounded-3xl bg-[rgba(20,20,38,0.76)] backdrop-blur-xl shadow-[0_30px_100px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(140,125,255,0.08)] overflow-hidden"
            initial={{ opacity: 0, y: -14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 bg-white/[0.015]">
              <div className="flex items-center gap-4">
                <FiSearch className="text-white/75 flex-shrink-0" size={27} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('common.search') || 'Search'}
                  className="w-full bg-transparent border-0 border-b border-violet-300/20 pb-2 text-3xl md:text-4xl font-semibold text-white placeholder:text-white/40 focus:outline-none focus:border-violet-300/40"
                />
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#8754ff] to-[#6d3cff] text-white font-semibold hover:brightness-110 transition"
                >
                  <FiX size={16} />
                  <span>{t('common.close') || 'Close'}</span>
                </button>
              </div>
            </div>

            <div className="max-h-[66vh] overflow-y-auto px-6 py-5 space-y-8">
              {query.trim().length < 2 && (
                <div className="text-white/60 text-lg">
                  Type at least 2 characters to search users, beatmaps, and teams.
                </div>
              )}

              {query.trim().length >= 2 && isLoading && (
                <div className="text-white/70 text-lg">Searching...</div>
              )}

              {query.trim().length >= 2 && !isLoading && !hasResults && (
                <div className="text-white/65 text-lg">{t('common.noDataFound') || 'No data found'}</div>
              )}

              {query.trim().length >= 2 && !isLoading && directorySearchUnavailable && (
                <div className="text-white/55 text-sm">
                  User/team quick-search is not available on this API version yet.
                </div>
              )}

              {beatmaps.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">Beatmap Results</h3>
                  <div className="space-y-2">
                    {beatmaps.map((beatmapset) => (
                      <button
                        key={beatmapset.id}
                        type="button"
                        className="w-full text-left flex items-center gap-3 rounded-2xl p-2.5 bg-white/[0.03] hover:bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)] transition"
                        onClick={() => {
                          navigate(`/beatmapsets/${beatmapset.id}`);
                          handleClose();
                        }}
                      >
                        <img
                          src={getBeatmapCover(beatmapset)}
                          alt={beatmapset.title}
                          className="w-14 h-14 rounded-xl object-cover shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)]"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-lg leading-tight truncate">
                            {beatmapset.title}
                          </p>
                          <p className="text-white/70 text-sm truncate">
                            {beatmapset.artist} • mapped by {beatmapset.creator}
                          </p>
                        </div>
                        <FiChevronRight className="text-white/45 flex-shrink-0" />
                      </button>
                    ))}
                    <button
                      type="button"
                      className="w-full text-left flex items-center justify-between rounded-2xl p-3 bg-white/[0.02] hover:bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)] transition text-white/85"
                      onClick={() => {
                        navigate(`/beatmaps?q=${encodeURIComponent(query.trim())}`);
                        handleClose();
                      }}
                    >
                      <span>Open full beatmap search</span>
                      <FiChevronRight />
                    </button>
                  </div>
                </section>
              )}

              {users.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">Player Results</h3>
                  <div className="space-y-2">
                    {users.map((searchUser) => (
                      <button
                        key={searchUser.id}
                        type="button"
                        className="w-full text-left flex items-center gap-3 rounded-2xl p-2.5 bg-white/[0.03] hover:bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)] transition"
                        onClick={() => {
                          navigate(`/users/${searchUser.id}`);
                          handleClose();
                        }}
                      >
                        <img
                          src={searchUser.avatar_url || '/default.jpg'}
                          alt={searchUser.username}
                          className="w-12 h-12 rounded-xl object-cover shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)]"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-lg leading-tight truncate">{searchUser.username}</p>
                          <p className="text-white/70 text-sm truncate flex items-center gap-2">
                            <img
                              src={`/image/flag/${(searchUser.country_code || 'xx').toLowerCase()}.svg`}
                              alt={searchUser.country_code}
                              className="w-4 h-3 rounded-sm"
                              loading="lazy"
                            />
                            <span>{searchUser.is_online ? 'Online' : 'Offline'}</span>
                          </p>
                        </div>
                        <FiChevronRight className="text-white/45 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {teams.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">Team Results</h3>
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        className="w-full text-left flex items-center gap-3 rounded-2xl p-2.5 bg-white/[0.03] hover:bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)] transition"
                        onClick={() => {
                          navigate(`/teams/${team.id}`);
                          handleClose();
                        }}
                      >
                        {team.flag_url ? (
                          <img
                            src={team.flag_url}
                            alt={team.name}
                            className="w-12 h-12 rounded-xl object-cover shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/10 shadow-[inset_0_0_0_1px_rgba(125,125,170,0.16)] text-white font-bold flex items-center justify-center">
                            {team.short_name?.slice(0, 2) || team.name.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-lg leading-tight truncate">{team.name}</p>
                          <p className="text-white/70 text-sm truncate">
                            [{team.short_name}] • {team.member_count} {t('common.members') || 'members'}
                          </p>
                        </div>
                        <FiChevronRight className="text-white/45 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NavbarSearchOverlay;
