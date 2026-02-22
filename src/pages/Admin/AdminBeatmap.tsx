import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import LazyBackgroundImage from '../../components/UI/LazyBackgroundImage';
import { Tooltip } from 'react-tooltip';
import { useProfileColor } from '../../contexts/ProfileColorContext';

interface Beatmap {
  id: number;
  version: string;
  difficulty_rating: number;
  mode: string | null;
}

interface Beatmapset {
  id: number;
  title: string;
  artist: string;
  creator: string;
  rank_status: string | null;
  covers?: {
    cover?: string;
    card?: string;
    list?: string;
    slimcover?: string;
    "cover@2x"?: string;
    "card@2x"?: string;
    "list@2x"?: string;
    "slimcover@2x"?: string;
  };
  cover_url?: string;
  beatmaps: Beatmap[];
}

interface BeatmapsResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  beatmapsets: Beatmapset[];
}

const AdminBeatmap: React.FC = () => {
  const [beatmaps, setBeatmaps] = useState<BeatmapsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBeatmapset, setSelectedBeatmapset] = useState<Beatmapset | null>(null);
  const [newRankStatus, setNewRankStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { profileColor } = useProfileColor();

  useEffect(() => {
    loadBeatmaps();
  }, [currentPage, searchQuery]);

  const loadBeatmaps = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getBeatmaps(currentPage, 25, searchQuery);
      setBeatmaps(data);
    } catch (error) {
      console.error('Failed to load beatmaps:', error);
      toast.error('Failed to load beatmaps');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadBeatmaps();
  };

  const handleBeatmapClick = async (beatmapsetId: number) => {
    try {
      const beatmap = await adminAPI.getBeatmap(beatmapsetId);
      setSelectedBeatmapset(beatmap);
      setNewRankStatus(beatmap.rank_status || '');
    } catch (error) {
      console.error('Failed to load beatmap details:', error);
      toast.error('Failed to load beatmap details');
    }
  };

  const handleUpdateRankStatus = async () => {
    if (!selectedBeatmapset || !newRankStatus) return;

    try {
      await adminAPI.updateRankStatus(selectedBeatmapset.id, newRankStatus);
      toast.success('Rank status updated successfully');
      setSelectedBeatmapset(null);
      loadBeatmaps();
    } catch (error) {
      console.error('Failed to update rank status:', error);
      toast.error('Failed to update rank status');
    }
  };

  const handleBanBeatmap = async () => {
    if (!selectedBeatmapset) return;
    if (!confirm(`Are you sure you want to ban this beatmapset? This will remove all scores.`)) return;

    try {
      await adminAPI.banBeatmap(selectedBeatmapset.id);
      toast.success('Beatmapset banned and scores removed');
      setSelectedBeatmapset(null);
      loadBeatmaps();
    } catch (error) {
      console.error('Failed to ban beatmap:', error);
      toast.error('Failed to ban beatmap');
    }
  };

  // Beatmap Card Component following UserProfileLayout pattern
  const BeatmapCard: React.FC<{ beatmapset: Beatmapset; index: number }> = ({ beatmapset, index }) => {
    const coverUrl = beatmapset.cover_url || beatmapset.covers?.card || beatmapset.covers?.list || '';
    const tooltipId = `beatmap-${beatmapset.id}-${index}`;

    // Convert theme color to RGB for gradient overlay
    const hexToRgb = (hex: string): string => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    };

    const themeRgb = hexToRgb(profileColor);

    return (
      <LazyBackgroundImage
        src={coverUrl}
        className="relative overflow-hidden border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
      >
        {/* Gradient overlay for readability with theme color */}
        <div
          className="absolute inset-0 bg-gradient-to-r"
          style={{
            background: `linear-gradient(to right, rgba(${themeRgb}, 0.15) 0%, rgba(${themeRgb}, 0.08) 50%, rgba(${themeRgb}, 0.03) 100%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/75 to-white/60 dark:from-gray-800/90 dark:via-gray-800/75 dark:to-gray-800/60" />

        <div className="relative bg-transparent hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors duration-150 group">
          {/* Desktop layout */}
          <div className="hidden sm:block">
            <div className="flex items-center h-12 pl-5 pr-24">
              {/* Beatmap Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col -space-y-0.5">
                  {/* Title and Artist */}
                  <div className="flex items-baseline gap-1 text-sm leading-tight">
                    <span
                      className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors cursor-pointer"
                      title={`${beatmapset.artist} - ${beatmapset.title}`}
                      data-tooltip-id={tooltipId}
                      data-tooltip-content={`${beatmapset.beatmaps.length} beatmap${beatmapset.beatmaps.length !== 1 ? 's' : ''} • Click to view details`}
                      onClick={() => handleBeatmapClick(beatmapset.id)}
                    >
                      {beatmapset.title}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-xs flex-shrink-0">
                      by
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
                      {beatmapset.artist}
                    </span>
                  </div>

                  {/* Creator and Stats */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      {beatmapset.creator}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {beatmapset.beatmaps.length} beatmap{beatmapset.beatmaps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side status and actions */}
              <div className="absolute right-0 top-0 h-full flex items-center justify-center pr-2 gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  beatmapset.rank_status === 'ranked' 
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : beatmapset.rank_status === 'approved'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : beatmapset.rank_status === 'qualified'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : beatmapset.rank_status === 'loved'
                    ? 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {beatmapset.rank_status || 'pending'}
                </span>
                <button
                  onClick={() => handleBeatmapClick(beatmapset.id)}
                  className="px-2 py-1 bg-osu-pink text-white rounded hover:bg-osu-pink/80 transition-colors text-xs"
                >
                  View
                </button>
                <button
                  onClick={() => setSelectedBeatmapset(beatmapset)}
                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleBanBeatmap()}
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
                >
                  Delete
                </button>
              </div>
          </div>

          {/* Mobile layout */}
          <div className="block sm:hidden p-4">
            <div className="flex-1">
              {/* Title and Artist */}
              <div className="flex items-baseline gap-1 text-sm leading-tight mb-1">
                <span
                  className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors cursor-pointer"
                  title={`${beatmapset.artist} - ${beatmapset.title}`}
                  data-tooltip-id={tooltipId}
                  data-tooltip-content={`${beatmapset.beatmaps.length} beatmap${beatmapset.beatmaps.length !== 1 ? 's' : ''} • Click to view details`}
                  onClick={() => handleBeatmapClick(beatmapset.id)}
                >
                  {beatmapset.title}
                </span>
                <span className="text-gray-600 dark:text-gray-400 text-xs flex-shrink-0">
                  by
                </span>
                <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
                  {beatmapset.artist}
                </span>
              </div>

              {/* Creator, Status and Actions */}
              <div className="flex items-center justify-between gap-2 text-xs mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {beatmapset.creator}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {beatmapset.beatmaps.length} beatmap{beatmapset.beatmaps.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    beatmapset.rank_status === 'ranked' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : beatmapset.rank_status === 'approved'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : beatmapset.rank_status === 'qualified'
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : beatmapset.rank_status === 'loved'
                      ? 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {beatmapset.rank_status || 'pending'}
                  </span>
                  <button
                    onClick={() => handleBeatmapClick(beatmapset.id)}
                    className="px-2 py-1 bg-osu-pink text-white rounded hover:bg-osu-pink/80 transition-colors text-xs"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setSelectedBeatmapset(beatmapset)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleBanBeatmap()}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Tooltip id={tooltipId} place="top" />
      </LazyBackgroundImage>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Beatmap Management</h2>
        <button
          onClick={loadBeatmaps}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Artist, Title, or ID..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

        {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Beatmap List */}
          <div className="bg-card rounded-lg overflow-hidden border border-card">
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {beatmaps?.beatmapsets.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No beatmaps found
                </div>
              ) : (
                beatmaps?.beatmapsets.map((beatmapset, index) => (
                  <BeatmapCard 
                    key={beatmapset.id} 
                    beatmapset={beatmapset} 
                    index={index}
                  />
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {beatmaps && beatmaps.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing page {beatmaps.page} of {beatmaps.total_pages} ({beatmaps.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(beatmaps.total_pages, p + 1))}
                  disabled={currentPage >= beatmaps.total_pages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Beatmap Details Modal */}
      {selectedBeatmapset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Background Card */}
            {selectedBeatmapset.cover_url && (
              <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                <img
                  src={selectedBeatmapset.cover_url}
                  alt={`${selectedBeatmapset.artist} - ${selectedBeatmapset.title}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedBeatmapset.title}</h2>
                  <p className="text-white/90">{selectedBeatmapset.artist}</p>
                </div>
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                {!selectedBeatmapset.cover_url && (
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Beatmap Details: {selectedBeatmapset.title}
                  </h2>
                )}
                <button
                  onClick={() => setSelectedBeatmapset(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Artist</label>
                  <p className="text-gray-900 dark:text-white">{selectedBeatmapset.artist}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Creator</label>
                  <p className="text-gray-900 dark:text-white">{selectedBeatmapset.creator}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Status</label>
                  <p className="text-gray-900 dark:text-white">{selectedBeatmapset.rank_status || 'pending'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Beatmaps</label>
                  <div className="space-y-2">
                    {selectedBeatmapset.beatmaps.map((beatmap) => (
                      <div key={beatmap.id} className="bg-gray-50 dark:bg-slate-700 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{beatmap.version}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Mode: {beatmap.mode || 'N/A'} | Difficulty: {beatmap.difficulty_rating?.toFixed(2) || 'N/A'}★
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update Rank Status
                  </label>
                  <select
                    value={newRankStatus}
                    onChange={(e) => setNewRankStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select status...</option>
                    <option value="ranked">Ranked</option>
                    <option value="approved">Approved</option>
                    <option value="qualified">Qualified</option>
                    <option value="loved">Loved</option>
                    <option value="pending">Pending</option>
                    <option value="wip">WIP</option>
                    <option value="graveyard">Graveyard</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedBeatmapset(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBanBeatmap}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Ban Beatmap
                  </button>
                  <button
                    onClick={handleUpdateRankStatus}
                    disabled={!newRankStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
    </div>
  );
};

export default AdminBeatmap;
