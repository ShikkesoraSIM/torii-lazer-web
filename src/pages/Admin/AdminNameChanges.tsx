import React, { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import type { UsernameChangeRequest } from '../../utils/api/admin';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/40',
};

const fallbackAvatar = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const target = e.target as HTMLImageElement;
  if (!target.src.endsWith('/default.jpg')) {
    target.src = '/default.jpg';
  }
};

const AdminNameChanges: React.FC = () => {
  const [requests, setRequests] = useState<UsernameChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [actioningId, setActioningId] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI.listUsernameChangeRequests({
        status: statusFilter,
        search: search.trim(),
        page: page + 1,
        per_page: PAGE_SIZE,
      });
      setRequests(data.requests || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load username change requests:', error);
      toast.error('Failed to load username change requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(0);
  }, [statusFilter, search]);

  const handleApprove = async (req: UsernameChangeRequest) => {
    if (!confirm(`Approve the rename "${req.current_username}" → "${req.requested_username}"?`)) return;
    setActioningId(req.id);
    try {
      await adminAPI.approveUsernameChangeRequest(req.id);
      toast.success(`Approved — ${req.requested_username}`);
      loadRequests();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      console.error('Failed to approve request:', error);
      toast.error(detail || 'Failed to approve request');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (req: UsernameChangeRequest) => {
    const reason = prompt('Rejection reason (optional, shown to the user):');
    if (reason === null) return;
    setActioningId(req.id);
    try {
      await adminAPI.rejectUsernameChangeRequest(req.id, reason.trim() || undefined);
      toast.success('Request rejected');
      loadRequests();
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      console.error('Failed to reject request:', error);
      toast.error(detail || 'Failed to reject request');
    } finally {
      setActioningId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Username Change Requests</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <input
            type="text"
            placeholder="Search username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px] px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 placeholder:text-white/40"
          />
          <button
            onClick={loadRequests}
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
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">User</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Change</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Requested</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Status</th>
                  <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-semibold text-white/55">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={req.avatar_url || '/default.jpg'}
                            alt={req.username || String(req.user_id)}
                            className="w-8 h-8 rounded-full ring-1 ring-white/10"
                            onError={fallbackAvatar}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{req.username || '—'}</span>
                            <span className="text-gray-500 font-mono text-[11px]">#{req.user_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400 line-through">{req.current_username}</span>
                          <span className="text-white/40">→</span>
                          <span className="text-white font-semibold">{req.requested_username}</span>
                        </div>
                        {req.reject_reason && (
                          <div className="text-[11px] text-red-300/80 mt-1">Reason: {req.reject_reason}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {new Date(req.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
                            STATUS_BADGE[req.status] || 'bg-white/10 text-white/60 border-white/20'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApprove(req)}
                                disabled={actioningId === req.id}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleReject(req)}
                                disabled={actioningId === req.id}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">Reviewed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {requests.length > 0
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

export default AdminNameChanges;
