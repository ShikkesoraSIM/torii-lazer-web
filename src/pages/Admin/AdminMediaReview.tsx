import React, { useCallback, useEffect, useState } from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { adminAPI } from '../../utils/api';
import type { ProfileMediaReview } from '../../utils/api/admin';
import toast from 'react-hot-toast';

const PAGE_SIZE = 48;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  revoked: 'bg-red-500/15 text-red-300 border-red-500/40',
  resolved: 'bg-white/10 text-white/55 border-white/20',
};

const AdminMediaReview: React.FC = () => {
  const [items, setItems] = useState<ProfileMediaReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [mediaFilter, setMediaFilter] = useState('');
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI.listProfileMediaReviews({
        status: statusFilter,
        media_type: mediaFilter,
        page: page + 1,
        per_page: PAGE_SIZE,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load media review queue:', error);
      toast.error('Failed to load media review queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, mediaFilter, page]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(0);
  }, [statusFilter, mediaFilter]);

  const handleRevoke = async (item: ProfileMediaReview) => {
    if (
      !confirm(
        `Revoke this ${item.media_type} from ${item.username || `#${item.user_id}`}? ` +
          'It will be reset to the default and the file deleted.',
      )
    ) {
      return;
    }
    setRevokingId(item.id);
    try {
      await adminAPI.revokeProfileMedia(item.id);
      toast.success('Media revoked');
      loadItems();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      console.error('Failed to revoke media:', error);
      toast.error(detail || 'Failed to revoke media');
    } finally {
      setRevokingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">NSFW Media Review</h2>
          <p className="text-sm text-white/50 mt-1">
            Avatars and banners users flagged NSFW. Revoke anything over the top (gore, etc.).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60"
          >
            <option value="pending">Pending</option>
            <option value="revoked">Revoked</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <select
            value={mediaFilter}
            onChange={(e) => setMediaFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60"
          >
            <option value="">All media</option>
            <option value="avatar">Avatars</option>
            <option value="cover">Banners</option>
          </select>
          <button
            onClick={loadItems}
            className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-xl font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl px-4 py-3 border border-white/10 bg-amber-500/10">
          <div className="text-[11px] uppercase tracking-wider text-white/55">
            {statusFilter === 'all' ? 'Total' : statusFilter}
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{total.toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 rounded-2xl border border-white/10">
          Nothing to review here. 🎉
        </div>
      ) : (
        <>
          <PhotoProvider>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col"
                >
                  <PhotoView src={item.url}>
                    <img
                      src={item.url}
                      alt={`${item.media_type} from ${item.username || item.user_id}`}
                      className="w-full h-44 object-contain bg-black/40 cursor-zoom-in"
                      loading="lazy"
                    />
                  </PhotoView>
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-white truncate">{item.username || '—'}</span>
                        <span className="text-gray-500 font-mono text-[11px]">#{item.user_id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-purple-500/15 text-purple-300 border-purple-500/40">
                          {item.media_type}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
                            STATUS_BADGE[item.status] || 'bg-white/10 text-white/55 border-white/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      {item.status === 'pending' ? (
                        <button
                          onClick={() => handleRevoke(item)}
                          disabled={revokingId === item.id}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 capitalize">{item.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PhotoProvider>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {items.length > 0
                ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()}`
                : '0 results'}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 rounded-lg border border-white/10 text-white/80 disabled:opacity-40 hover:bg-white/5 transition-colors"
              >
                Prev
              </button>
              <span className="text-sm text-gray-300">Page {page + 1} / {pageCount}</span>
              <button
                disabled={page + 1 >= pageCount || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-white/10 text-white/80 disabled:opacity-40 hover:bg-white/5 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminMediaReview;
