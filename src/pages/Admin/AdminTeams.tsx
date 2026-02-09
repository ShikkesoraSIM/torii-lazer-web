import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import type { Team } from '../../types';

const AdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getAllTeams();
      setTeams(data || []);
    } catch (error) {
      console.error('Failed to load teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamId: number) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;

    try {
      await adminAPI.deleteTeam(teamId);
      toast.success('Team deleted successfully');
      loadTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast.error('Failed to delete team');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
        <button
          onClick={loadTeams}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              No teams found
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="bg-gray-50 dark:bg-slate-700/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
              >
                {team.cover_url && (
                  <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${team.cover_url})` }} />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {team.flag_url && (
                      <img
                        src={team.flag_url}
                        alt={team.short_name}
                        className="w-8 h-6 rounded"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{team.short_name}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Created: {new Date(team.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/teams/${team.id}/edit`}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTeams;

