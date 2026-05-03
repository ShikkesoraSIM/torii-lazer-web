import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import AdminModal from '../../components/Admin/AdminModal';

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
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Badge Management</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="Search badges or users…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 placeholder:text-white/40 w-full md:w-72"
            />
            <svg className="w-4 h-4 text-white/45 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
          >
            Create badge
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBadges.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              {searchQuery ? `No badges match "${searchQuery}".` : 'No badges yet.'}
            </div>
          ) : (
            filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-2xl p-4 border border-white/10 bg-white/[0.03] hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  {badge.image_url ? (
                    <img
                      src={badge.image_url}
                      alt={badge.description}
                      className="w-14 h-14 rounded-xl object-contain bg-white/5 border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{badge.description}</h3>
                    <div className="mt-1 space-y-0.5">
                      {badge.username ? (
                        <div className="text-xs text-osu-pink font-medium truncate">
                          {badge.username} <span className="text-white/40">· id {badge.user_id}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">Not awarded</div>
                      )}
                      {badge.awarded_at && (
                        <div className="text-[10px] text-gray-500">
                          Awarded {new Date(badge.awarded_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(badge)}
                    className="px-3 py-1 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-lg transition-colors text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(badge.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      <AdminModal
        open={showCreateModal || !!editingBadge}
        title={editingBadge ? 'Edit Badge' : 'Create Badge'}
        onClose={closeModal}
        maxWidthClass="max-w-lg"
      >
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingBadge ? 'Edit badge' : 'Create badge'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-white/50 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
              </div>

              <form onSubmit={editingBadge ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    Description (Name) *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40"
                    required
                    placeholder="Badge name/description"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    Image URL (.png or .jpg) *
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40"
                    placeholder="https://example.com/badge.png"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    Image @2x URL (optional, defaults to Image URL)
                  </label>
                  <input
                    type="url"
                    value={formData.image_2x_url}
                    onChange={(e) => setFormData({ ...formData, image_2x_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40"
                    placeholder="https://example.com/badge@2x.png"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    Award to User ID (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40"
                    placeholder="User ID"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-xl font-medium transition-colors"
                  >
                    {editingBadge ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
      </AdminModal>
    </div>
  );
};

export default AdminBadges;

