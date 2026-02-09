import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import AdminUsers from './AdminUsers';
import AdminBeatmapBlacklist from './AdminBeatmapBlacklist';
import AdminBeatmap from './AdminBeatmap';
import AdminBadges from './AdminBadges';
import AdminTeams from './AdminTeams';
import AdminDailyChallenges from './AdminDailyChallenges';


type AdminTab = 'users' | 'beatmaps' | 'beatmap-list' | 'badges' | 'teams' | 'daily-challenges';

interface AdminStats {
  total_users: number;
  online_users: number;
  total_pp: number;
  total_plays: number;
  total_scores: number;
  total_beatmaps: number;
  blacklisted_beatmaps: number;
  performance_server_status: 'online' | 'offline';
  api_server_status: 'online' | 'offline';
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.is_admin) {
      navigate('/');
      return;
    }

    const loadStats = async () => {
      try {
        const statsData = await adminAPI.getStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load admin stats:', error);
        toast.error('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user, navigate]);

  if (!user || !user.is_admin) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Admin</h2>
        <p className="mt-3">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-6">
      {/* Statistics Dashboard - Similar to UserProfileLayout header */}
      <div className="bg-card md:main-card-shadow md:rounded-t-2xl md:rounded-b-2xl overflow-hidden md:border md:border-card mb-6">
        <div className="relative z-10 bg-transparent md:bg-card px-4 md:px-6 py-3 md:py-4 flex items-center justify-between md:rounded-t-2xl border-b border-card">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-osu-pink rounded-full"></div>
            <div className="text-base md:text-lg font-bold">Admin Panel</div>
          </div>
        </div>

        <div className="bg-transparent md:bg-card px-3 md:px-6 py-4 md:py-6 border-b border-card">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink"></div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Server Status Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`flex items-center justify-between p-4 rounded-lg border ${stats.api_server_status === 'online' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${stats.api_server_status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                    <span className="font-semibold text-foreground">API Server</span>
                  </div>
                  <span className={`text-sm font-bold uppercase ${stats.api_server_status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.api_server_status}
                  </span>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-lg border ${stats.performance_server_status === 'online' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${stats.performance_server_status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                    <span className="font-semibold text-foreground">Performance Server</span>
                  </div>
                  <span className={`text-sm font-bold uppercase ${stats.performance_server_status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.performance_server_status}
                  </span>
                </div>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Registered Users */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Registered Users</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {stats.total_users.toLocaleString()}
                  </p>
                </div>

                {/* Online Users */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Online Users</p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                    {stats.online_users.toLocaleString()}
                  </p>
                </div>

                {/* Total PP */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Total PP</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                    {Math.round(stats.total_pp).toLocaleString()}
                  </p>
                </div>

                {/* Total Plays */}
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">Total Plays</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                    {stats.total_plays.toLocaleString()}
                  </p>
                </div>

                {/* Total Scores */}
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 border border-rose-200 dark:border-rose-800">
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Scores</p>
                  <p className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">
                    {stats.total_scores.toLocaleString()}
                  </p>
                </div>

                {/* Listed Beatmaps */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Listed Beatmaps</p>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                    {stats.total_beatmaps.toLocaleString()}
                  </p>
                </div>

                {/* Blacklisted Beatmaps */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Blacklisted Beatmaps</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                    {stats.blacklisted_beatmaps.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Content with Side Panel - Following UserProfileLayout pattern */}
      <div className="max-w-7xl mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Side Panel Navigation - Similar to UserProfileLayout sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-card md:main-card-shadow md:rounded-2xl overflow-hidden md:border md:border-card">
              <div className="bg-transparent md:bg-card px-3 md:px-6 py-3 md:py-4 border-b border-card">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-osu-pink rounded-full"></div>
                  <div className="text-base md:text-lg font-bold">Navigation</div>
                </div>
              </div>
              <nav className="bg-transparent md:bg-card px-3 md:px-6 py-3 md:py-4 space-y-2">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'users'
                      ? 'bg-osu-pink/10 text-osu-pink font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Users</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('beatmaps')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'beatmaps'
                      ? 'bg-osu-pink/10 text-osu-pink font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>Beatmap Blacklist</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('beatmap-list')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'beatmap-list'
                      ? 'bg-osu-pink/10 text-osu-pink font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span>Beatmaps</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('badges')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'badges'
                      ? 'bg-osu-pink/10 text-osu-pink font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span>Badges</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('teams')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'teams'
                      ? 'bg-osu-pink/10 text-osu-pink font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Teams</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('daily-challenges')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'daily-challenges'
                      ? 'bg-osu-pink/10 text-osu-pink font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Daily Challenges</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Content Area - Following UserProfileLayout card pattern */}
          <div className="flex-1">
            <div className="bg-card md:main-card-shadow md:rounded-2xl overflow-hidden md:border md:border-card">
              <div className="bg-transparent md:bg-card px-3 md:px-6 py-3 md:py-4 border-b border-card">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-osu-pink rounded-full"></div>
                  <div className="text-base md:text-lg font-bold">
                    {activeTab === 'users' && 'User Management'}
                    {activeTab === 'beatmaps' && 'Beatmap Blacklist'}
                    {activeTab === 'beatmap-list' && 'Beatmap Management'}
                    {activeTab === 'badges' && 'Badge Management'}
                    {activeTab === 'teams' && 'Team Management'}
                    {activeTab === 'daily-challenges' && 'Daily Challenge Management'}
                  </div>
                </div>
              </div>
              <div className="bg-transparent md:bg-card px-3 md:px-6 py-4 md:py-6">
                {activeTab === 'users' && <AdminUsers />}
                {activeTab === 'beatmaps' && <AdminBeatmapBlacklist />}
                {activeTab === 'beatmap-list' && <AdminBeatmap />}
                {activeTab === 'badges' && <AdminBadges />}
                {activeTab === 'teams' && <AdminTeams />}
                {activeTab === 'daily-challenges' && <AdminDailyChallenges />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminPanel;


