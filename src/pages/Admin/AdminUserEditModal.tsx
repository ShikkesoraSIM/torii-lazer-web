import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import type { User } from '../../types';
import CountrySelect from '../../components/UI/CountrySelect';

interface AdminUserEditModalProps {
  user: User;
  countries: Array<{ code: string; name: string }>;
  onClose: () => void;
}

const AdminUserEditModal: React.FC<AdminUserEditModalProps> = ({ user, countries, onClose }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    country_code: user.country_code,
    is_qat: user.is_qat || false,
    is_gmt: user.is_gmt || false,
    is_admin: user.is_admin || false,
    selectedBadgeId: null as number | null,
  });
  const [userBadges, setUserBadges] = useState<any[]>(user.badges || []);
  const [loading, setLoading] = useState(false);
  const [availableBadges, setAvailableBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoadingBadges(true);
      const badges = await adminAPI.getBadges();
      setAvailableBadges(badges || []);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleAddBadge = async () => {
    if (!formData.selectedBadgeId) return;
    
    const selectedBadge = availableBadges.find(b => b.id === formData.selectedBadgeId);
    if (!selectedBadge) return;

    try {
      setLoadingBadges(true);
      const newBadgeData = {
        description: selectedBadge.description,
        image_url: selectedBadge.image_url,
        image_2x_url: selectedBadge.image_2x_url || selectedBadge.image_url,
        url: selectedBadge.url || '',
        awarded_at: new Date().toISOString(),
        user_id: user.id
      };
      
      const createdBadge = await adminAPI.createBadge(newBadgeData);
      setUserBadges([...userBadges, createdBadge]);
      setFormData({ ...formData, selectedBadgeId: null });
      toast.success('Badge awarded successfully');
    } catch (error) {
      console.error('Failed to award badge:', error);
      toast.error('Failed to award badge');
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleRemoveBadge = async (badge: any) => {
    if (!badge.id) {
      // If it's a legacy badge (no ID), we can't delete it from DB
      // For now, just remove it from the list and we'll update the user later if needed
      // But actually, we should probably just filter it out
      setUserBadges(userBadges.filter(b => b !== badge));
      return;
    }

    if (!confirm('Are you sure you want to remove this badge?')) return;

    try {
      setLoadingBadges(true);
      await adminAPI.deleteBadge(badge.id);
      setUserBadges(userBadges.filter(b => b.id !== badge.id));
      toast.success('Badge removed successfully');
    } catch (error) {
      console.error('Failed to remove badge:', error);
      toast.error('Failed to remove badge');
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        username: formData.username,
        country_code: formData.country_code,
        is_qat: formData.is_qat,
        is_gmt: formData.is_gmt,
        is_admin: formData.is_admin,
        // We still send the filtered list of legacy badges back to the user object
        // to keep it in sync, though DB badges are handled separately now
        badge: userBadges.filter(b => !b.id) 
      };

      await adminAPI.updateUser(user.id, updateData);
      toast.success('User updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit User: {user.username}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country/Flag
              </label>
              <CountrySelect
                value={formData.country_code}
                onChange={(value) => setFormData({ ...formData, country_code: value })}
                countries={countries}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_qat}
                  onChange={(e) => setFormData({ ...formData, is_qat: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">QAT</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_gmt}
                  onChange={(e) => setFormData({ ...formData, is_gmt: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GMT</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin</span>
              </label>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Manage Badges
              </label>
              
              <div className="space-y-2 mb-4">
                {userBadges.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No badges awarded yet</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {userBadges.map((badge, index) => (
                      <div key={badge.id || index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          <img 
                            src={badge['image@2x_url'] || badge.image_url} 
                            alt={badge.description} 
                            className="w-8 h-8 object-contain"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{badge.description}</p>
                            <p className="text-xs text-gray-500">{new Date(badge.awarded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBadge(badge)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <select
                  value={formData.selectedBadgeId || ''}
                  onChange={(e) => setFormData({ ...formData, selectedBadgeId: e.target.value ? parseInt(e.target.value) : null })}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  disabled={loadingBadges}
                >
                  <option value="">Select a badge to award...</option>
                  {availableBadges.map((badge) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.description}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddBadge}
                  disabled={!formData.selectedBadgeId || loadingBadges}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Award
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUserEditModal;

