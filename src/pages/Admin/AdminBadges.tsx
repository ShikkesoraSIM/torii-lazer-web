import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

interface Badge {
  id: number;
  description: string;
  image_url: string;
  image_2x_url?: string;
  url?: string;
  awarded_at?: string;
  user_id?: number;
  username?: string;
}

const AdminBadges: React.FC = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    image_url: '',
    image_2x_url: '',
    url: '',
    user_id: '' as string | number,
  });

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const badgesData = await adminAPI.getBadges();
      setBadges(badgesData);
    } catch (error) {
      console.error('Failed to load badges:', error);
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBadge = {
        description: formData.description,
        image_url: formData.image_url,
        image_2x_url: formData.image_2x_url || formData.image_url,
        url: formData.url || "",
        awarded_at: new Date().toISOString(),
        user_id: formData.user_id ? Number(formData.user_id) : null,
      };
      
      await adminAPI.createBadge(newBadge);
      
      toast.success('Badge created successfully');
      setShowCreateModal(false);
      setFormData({ description: '', image_url: '', image_2x_url: '', url: '', user_id: '' });
      loadBadges();
    } catch (error: any) {
      console.error('Failed to create badge:', error);
      toast.error(error?.response?.data?.detail || 'Failed to create badge');
    }
  };

  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setFormData({
      description: badge.description || '',
      image_url: badge.image_url || '',
      image_2x_url: badge.image_2x_url || '',
      url: badge.url || '',
      user_id: badge.user_id || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBadge) return;

    try {
      const updatedBadge = {
        description: formData.description,
        image_url: formData.image_url,
        image_2x_url: formData.image_2x_url || formData.image_url,
        url: formData.url || "",
        awarded_at: editingBadge.awarded_at || new Date().toISOString(),
        user_id: formData.user_id ? Number(formData.user_id) : null,
      };
      
      await adminAPI.updateBadge(editingBadge.id, updatedBadge);
      
      toast.success('Badge updated successfully');
      setEditingBadge(null);
      setFormData({ description: '', image_url: '', image_2x_url: '', url: '', user_id: '' });
      loadBadges();
    } catch (error: any) {
      console.error('Failed to update badge:', error);
      toast.error(error?.response?.data?.detail || 'Failed to update badge');
    }
  };

  const handleDelete = async (badgeId: number) => {
    if (!confirm('Are you sure you want to delete this badge?')) return;

    try {
      await adminAPI.deleteBadge(badgeId);
      toast.success('Badge deleted successfully');
      loadBadges();
    } catch (error) {
      console.error('Failed to delete badge:', error);
      toast.error('Failed to delete badge');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingBadge(null);
    setFormData({ description: '', image_url: '', image_2x_url: '', url: '', user_id: '' });
  };

  const filteredBadges = badges.filter(badge => 
    badge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (badge.username && badge.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Badge Management</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search badges or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white w-full md:w-64"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Create Badge
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBadges.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              No badges found
            </div>
          ) : (
            filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {badge.image_url && (
                      <img
                        src={badge.image_url}
                        alt={badge.description}
                        className="w-12 h-12 rounded object-contain bg-white/5"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{badge.description}</h3>
                      <div className="mt-1 space-y-0.5">
                        {badge.username ? (
                          <p className="text-xs text-blue-500 font-medium">
                            User: {badge.username} (ID: {badge.user_id})
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Not awarded</p>
                        )}
                        {badge.awarded_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Awarded: {new Date(badge.awarded_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(badge)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(badge.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )/* Rest of the file... */}
      {(showCreateModal || editingBadge) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingBadge ? 'Edit Badge' : 'Create Badge'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={editingBadge ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Name) *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    required
                    placeholder="Badge name/description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image URL (.png or .jpg) *
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com/badge.png"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image @2x URL (optional, defaults to Image URL)
                  </label>
                  <input
                    type="url"
                    value={formData.image_2x_url}
                    onChange={(e) => setFormData({ ...formData, image_2x_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com/badge@2x.png"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Award to User ID (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="User ID"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingBadge ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBadges;

