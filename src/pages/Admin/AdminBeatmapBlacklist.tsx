import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

interface BlacklistedBeatmap {
  id: number;
  beatmapset_id: number;
  beatmap_id: number;
  beatmapset?: {
    id: number;
    title: string;
    artist: string;
  };
}

const AdminBeatmapBlacklist: React.FC = () => {
  const [blacklistedBeatmaps, setBlacklistedBeatmaps] = useState<BlacklistedBeatmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [beatmapsetId, setBeatmapsetId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getBlacklistedBeatmaps();
      setBlacklistedBeatmaps(data || []);
    } catch (error) {
      console.error('Failed to load blacklist:', error);
      toast.error('Failed to load blacklisted beatmaps');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(beatmapsetId);
    
    if (isNaN(id) || id <= 0) {
      toast.error('Please enter a valid beatmapset ID');
      return;
    }

    setAdding(true);
    try {
      await adminAPI.addBlacklistedBeatmap(id);
      toast.success('Beatmapset added to blacklist');
      setBeatmapsetId('');
      loadBlacklist();
    } catch (error) {
      console.error('Failed to add to blacklist:', error);
      toast.error('Failed to add beatmapset to blacklist');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (beatmapsetId: number) => {
    if (!confirm('Are you sure you want to remove this beatmapset from the blacklist?')) return;

    try {
      await adminAPI.removeBlacklistedBeatmap(beatmapsetId);
      toast.success('Beatmapset removed from blacklist');
      loadBlacklist();
    } catch (error) {
      console.error('Failed to remove from blacklist:', error);
      toast.error('Failed to remove beatmapset from blacklist');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Beatmap Blacklist</h2>

      {/* Add Beatmapset Form */}
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Beatmapset to Blacklist</h3>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="number"
            value={beatmapsetId}
            onChange={(e) => setBeatmapsetId(e.target.value)}
            placeholder="Enter Beatmapset ID"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            required
            min="1"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : 'Add to Blacklist'}
          </button>
        </form>
      </div>

      {/* Blacklist Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Beatmapset ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Artist</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blacklistedBeatmaps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No blacklisted beatmaps
                  </td>
                </tr>
              ) : (
                blacklistedBeatmaps.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono">
                      {item.beatmapset_id}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {item.beatmapset?.title || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {item.beatmapset?.artist || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleRemove(item.beatmapset_id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminBeatmapBlacklist;

