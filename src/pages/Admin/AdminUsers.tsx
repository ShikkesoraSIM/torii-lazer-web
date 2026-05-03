import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import type { User } from '../../types';
import AdminUserEditModal from './AdminUserEditModal';

// Country list used to come from `useAvailableCountries('osu')` (rankings
// scrape). The admin modal now bundles its own canonical ISO list, so this
// page no longer needs to fetch anything country-related.

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Quick stats above the table — total / active / banned / staff. Cheap
  // to derive client-side; mirrors the StatTile pattern used in the new
  // AdminBeatmapBlacklist redesign so the admin panel reads cohesively.
  const stats = {
    total: users.length,
    banned: users.filter((u) => u.is_restricted).length,
    staff: users.filter((u) => u.is_admin || u.is_gmt || u.is_qat).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search by username or ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-[240px] px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 placeholder:text-white/40"
          />
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-xl font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl px-4 py-3 border border-white/10 bg-white/5">
          <div className="text-[11px] uppercase tracking-wider text-white/55">Total users</div>
          <div className="text-2xl font-bold text-white tabular-nums">{stats.total.toLocaleString()}</div>
        </div>
        <div className="rounded-xl px-4 py-3 border border-white/10 bg-red-500/10">
          <div className="text-[11px] uppercase tracking-wider text-white/55">Banned</div>
          <div className="text-2xl font-bold text-white tabular-nums">{stats.banned.toLocaleString()}</div>
        </div>
        <div className="rounded-xl px-4 py-3 border border-white/10 bg-purple-500/10">
          <div className="text-[11px] uppercase tracking-wider text-white/55">Staff (admin / GMT / QAT)</div>
          <div className="text-2xl font-bold text-white tabular-nums">{stats.staff.toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">ID</th>
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Username</th>
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Country</th>
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Status</th>
                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Roles</th>
                <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    {searchTerm ? `No users match "${searchTerm}".` : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{user.id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-8 h-8 rounded-full ring-1 ring-white/10"
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
                            className="w-8 h-8 rounded-full ring-1 ring-white/10"
                          />
                        )}
                        <span className="font-medium text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {user.country_code && (
                          <img
                            src={`/image/flag/${user.country_code.toLowerCase()}.svg`}
                            alt={user.country_code}
                            className="w-5 h-4 rounded-sm"
                          />
                        )}
                        <span className="text-gray-300 text-sm">{user.country_code || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {user.is_restricted ? (
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-red-500/15 text-red-300 border-red-500/40">
                          Banned
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.is_admin && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-purple-500/15 text-purple-300 border-purple-500/40">
                            Admin
                          </span>
                        )}
                        {user.is_gmt && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-blue-500/15 text-blue-300 border-blue-500/40">
                            GMT
                          </span>
                        )}
                        {user.is_qat && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40">
                            QAT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-lg transition-colors text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleWipe(user.id)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-xs font-medium"
                          title="Wipe user statistics"
                        >
                          Wipe
                        </button>
                        {user.is_restricted ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs font-medium"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(user.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs font-medium"
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
          onClose={handleCloseEdit}
        />
      )}
    </div>
  );
};

export default AdminUsers;

