import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import type { User } from '../../types';
import AdminUserEditModal from './AdminUserEditModal';
import { useAvailableCountries } from '../../hooks/useAvailableCountries';
import type { GameMode } from '../../types';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { countries } = useAvailableCountries('osu' as GameMode);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await adminAPI.getUsers();
      setUsers(usersData || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: number) => {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
      await adminAPI.banUser(userId);
      toast.success('User banned successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnban = async (userId: number) => {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
      await adminAPI.unbanUser(userId);
      toast.success('User unbanned successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleWipe = async (userId: number) => {
    const mode = prompt('Enter game mode to wipe (osu, taiko, fruits, mania):');
    if (!mode) return;

    if (!confirm(`Are you sure you want to wipe all statistics and scores for mode "${mode}"? This cannot be undone.`)) return;

    try {
      await adminAPI.wipeUserStats(userId, mode);
      toast.success(`User statistics wiped for ${mode}`);
      loadUsers();
    } catch (error) {
      console.error('Failed to wipe user stats:', error);
      toast.error('Failed to wipe user statistics');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    loadUsers();
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toString().includes(searchTerm)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Username</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Country</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Roles</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{user.id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src === 'https://lazer-data.g0v0.top/default.jpg' || target.src.includes('default.jpg')) {
                                target.src = 'https://osuherz.ddns.net/default.jpg';
                              }
                            }}
                          />
                        ) : (
                          <img
                            src="https://osuherz.ddns.net/default.jpg"
                            alt={user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {user.country_code && (
                          <img
                            src={`/image/flag/${user.country_code.toLowerCase()}.svg`}
                            alt={user.country_code}
                            className="w-5 h-4"
                          />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">{user.country_code || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {user.is_restricted ? (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm font-medium">
                          Banned
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-sm font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.is_admin && (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                            Admin
                          </span>
                        )}
                        {user.is_gmt && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                            GMT
                          </span>
                        )}
                        {user.is_qat && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                            QAT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleWipe(user.id)}
                          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
                          title="Wipe user statistics"
                        >
                          Wipe
                        </button>
                        {user.is_restricted ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(user.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <AdminUserEditModal
          user={editingUser}
          countries={countries}
          onClose={handleCloseEdit}
        />
      )}
    </div>
  );
};

export default AdminUsers;

