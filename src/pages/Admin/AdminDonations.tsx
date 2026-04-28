import React, { useEffect, useState, useCallback } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { FiHeart, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

/**
 * Admin Donations queue.
 *
 * Two stacked panels:
 *   1. The unmatched queue — donations the Ko-fi webhook couldn't auto-link
 *      to a Torii user. Each row exposes a tiny inline form (`username` →
 *      "Match" button) that calls /admin/donations/{id}/match. The backend
 *      runs the same `apply_supporter_grant` the webhook uses, so manual
 *      and automatic matches produce byte-identical state — no drift.
 *   2. Recent history — last N donations (matched + unmatched) for audit
 *      / context. Read-only.
 *
 * The stats card up top is the only "dashboard"-ish piece: total $ raised
 * by currency (no nonsense flattening), total donations, currently active
 * supporters, and lifetime donators.
 */

// ---------- response types --------------------------------------------------

interface DonationItem {
  id: number;
  provider: string;
  provider_transaction_id: string;
  amount_cents: number;
  currency: string;
  is_recurring: boolean;
  tier_name: string | null;
  donor_display_name: string | null;
  donor_message: string | null;
  donor_message_is_public: boolean;
  months_granted: number;
  received_at: string;
  user_id: number | null;
  matched_username: string | null;
}

interface DonationListResp {
  items: DonationItem[];
  total: number;
  unmatched_count: number;
}

interface DonationStats {
  total_donations: number;
  unmatched_count: number;
  totals_by_currency: Record<string, number>;
  active_supporters: number;
  lifetime_donators: number;
}

// ---------- helpers ---------------------------------------------------------

const fmtMoney = (cents: number, currency: string) =>
  `${(cents / 100).toFixed(2)} ${currency}`;

const fmtDate = (iso: string) => {
  // Use a compact "MMM dd, HH:mm" format — full ISO is overkill in a table.
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

// ---------- inline match form (one row per unmatched donation) --------------

const UnmatchedRow: React.FC<{
  donation: DonationItem;
  onMatched: () => void;
}> = ({ donation, onMatched }) => {
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      toast.error('Enter a username');
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminAPI.matchDonation(donation.id, { username: trimmed });
      toast.success(
        `Linked to ${result.username} — ${result.months_granted} month(s), total ${result.total_supporter_months}`,
      );
      onMatched();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Match failed';
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 mb-3">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">
              {fmtMoney(donation.amount_cents, donation.currency)}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              from{' '}
              <span className="font-medium text-foreground">
                {donation.donor_display_name || 'Anonymous'}
              </span>
            </span>
            {donation.is_recurring && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                recurring
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              · {fmtDate(donation.received_at)}
            </span>
          </div>

          {donation.donor_message && (
            <div className="mt-2 text-sm italic text-gray-700 dark:text-gray-300 break-words">
              "{donation.donor_message}"
            </div>
          )}

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Will grant <strong>{donation.months_granted}</strong> month
            {donation.months_granted === 1 ? '' : 's'} when matched · txn{' '}
            <code className="text-[10px]">{donation.provider_transaction_id.slice(0, 12)}…</code>
          </div>
        </div>

        <form onSubmit={handleMatch} className="flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Torii username"
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-osu-pink/40 focus:border-osu-pink"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !username.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-osu-pink text-white hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '…' : 'Match'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------- read-only row for history --------------------------------------

const HistoryRow: React.FC<{ donation: DonationItem }> = ({ donation }) => {
  const matched = donation.user_id != null;
  return (
    <div
      className={[
        'rounded-lg p-3 border',
        matched
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30'
          : 'bg-gray-50 dark:bg-slate-700/30 border-gray-200 dark:border-slate-600/50',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 flex-wrap text-sm">
        {matched ? (
          <FiCheckCircle className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={14} />
        ) : (
          <FiAlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={14} />
        )}
        <span className="font-semibold">{fmtMoney(donation.amount_cents, donation.currency)}</span>
        <span className="text-gray-600 dark:text-gray-400">
          from {donation.donor_display_name || 'Anonymous'}
        </span>
        {matched ? (
          <span className="text-emerald-700 dark:text-emerald-300">
            → <strong>{donation.matched_username}</strong>
          </span>
        ) : (
          <span className="text-amber-700 dark:text-amber-300">unmatched</span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {fmtDate(donation.received_at)}
        </span>
      </div>
      {donation.donor_message && (
        <div className="mt-1 text-xs italic text-gray-600 dark:text-gray-400 break-words">
          "{donation.donor_message}"
        </div>
      )}
    </div>
  );
};

// ---------- main page ------------------------------------------------------

const AdminDonations: React.FC = () => {
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [unmatched, setUnmatched] = useState<DonationItem[]>([]);
  const [history, setHistory] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      // Three calls in parallel — independent and we want fast page load.
      const [statsResp, unmatchedResp, historyResp] = await Promise.all([
        adminAPI.getDonationStats() as Promise<DonationStats>,
        adminAPI.getDonations({ status: 'unmatched', limit: 50 }) as Promise<DonationListResp>,
        adminAPI.getDonations({ status: 'all', limit: 30 }) as Promise<DonationListResp>,
      ]);
      setStats(statsResp);
      setUnmatched(unmatchedResp.items || []);
      setHistory(historyResp.items || []);
    } catch (error) {
      console.error('Failed to load donations admin data:', error);
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FiHeart className="text-osu-pink" size={20} fill="currentColor" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Donations</h2>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ---------- Stats grid ---------- */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 border border-rose-200 dark:border-rose-800">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Donations
            </p>
            <p className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">
              {stats.total_donations.toLocaleString()}
            </p>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
            <p className="text-xs font-medium text-pink-600 dark:text-pink-400 uppercase tracking-wider">
              Active Supporters
            </p>
            <p className="text-2xl font-bold text-pink-900 dark:text-pink-100 mt-1">
              {stats.active_supporters.toLocaleString()}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Lifetime Donators
            </p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
              {stats.lifetime_donators.toLocaleString()}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Unmatched
            </p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
              {stats.unmatched_count.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Totals by currency — separate row so multi-currency reads cleanly */}
      {stats && Object.keys(stats.totals_by_currency).length > 0 && (
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 mb-6 border border-gray-200 dark:border-slate-600/50">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Total raised
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.entries(stats.totals_by_currency).map(([currency, cents]) => (
              <div key={currency} className="text-lg font-bold text-foreground">
                {fmtMoney(cents, currency)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Unmatched queue ---------- */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <FiAlertCircle className="text-amber-500" size={18} />
          Pending matches
          {unmatched.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              {unmatched.length}
            </span>
          )}
        </h3>

        {unmatched.length === 0 ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-6 text-center">
            <FiCheckCircle className="mx-auto text-emerald-500 mb-2" size={28} />
            <p className="text-emerald-800 dark:text-emerald-300 font-medium">
              No pending donations. Nice work.
            </p>
          </div>
        ) : (
          unmatched.map((d) => (
            <UnmatchedRow key={d.id} donation={d} onMatched={loadAll} />
          ))
        )}
      </div>

      {/* ---------- Recent history ---------- */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Recent donations
        </h3>

        {history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No donations yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((d) => (
              <HistoryRow key={d.id} donation={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDonations;
