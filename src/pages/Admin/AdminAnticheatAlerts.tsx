import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { fieldClass, formatDate, severityBadgeClass, truncate } from './adminAnticheatShared';

type AlertRow = Awaited<ReturnType<typeof adminAPI.getAnticheatAlerts>>['alerts'][number];
type UserSummary = Awaited<ReturnType<typeof adminAPI.getAnticheatUserSummary>>;

const PAGE_SIZE = 25;

const AdminAnticheatAlerts: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [userFilter, setUserFilter] = useState<string>('');

  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const userIdNum = userFilter.trim() ? Number(userFilter.trim()) : undefined;
      const data = await adminAPI.getAnticheatAlerts({
        kind: 'anticheat_score',
        severity: severityFilter || undefined,
        user_id: userIdNum && !Number.isNaN(userIdNum) ? userIdNum : undefined,
        unresolved_only: unresolvedOnly,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setAlerts(data.alerts);
      setTotal(data.total);
    } catch (err) {
      console.error('failed to load anti-cheat alerts', err);
      toast.error('Failed to load anti-cheat alerts');
    } finally {
      setLoadingAlerts(false);
    }
  }, [severityFilter, unresolvedOnly, userFilter, page]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const [inspectorInput, setInspectorInput] = useState<string>('');
  const [inspectorUserId, setInspectorUserId] = useState<number | null>(null);
  const [inspectorData, setInspectorData] = useState<UserSummary | null>(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  const submitInspector = async () => {
    const num = Number(inspectorInput.trim());
    if (!num || Number.isNaN(num)) {
      toast.error('Enter a numeric user id');
      return;
    }
    setInspectorUserId(num);
    setLoadingInspector(true);
    try {
      const data = await adminAPI.getAnticheatUserSummary(num);
      setInspectorData(data);
    } catch (err) {
      console.error('failed to load user summary', err);
      toast.error('Failed to load user summary');
      setInspectorData(null);
    } finally {
      setLoadingInspector(false);
    }
  };

  const handleResetAlerts = async () => {
    if (!inspectorUserId) return;
    if (!window.confirm(`Resolve all open anti-cheat alerts for user #${inspectorUserId}?`)) return;
    try {
      const result = await adminAPI.resetAnticheatAlerts(inspectorUserId);
      toast.success(`Resolved ${result.resolved_count} alert(s)`);
      submitInspector();
      loadAlerts();
    } catch (err) {
      console.error('reset failed', err);
      toast.error('Failed to reset alerts');
    }
  };

  const handleClearHwid = async () => {
    if (!inspectorUserId) return;
    if (!window.confirm(
      `Clear all recorded hardware IDs for user #${inspectorUserId}? They will start collecting again on the next request.`,
    )) return;
    try {
      const result = await adminAPI.clearAnticheatUserHwid(inspectorUserId);
      toast.success(`Cleared ${result.count} HWID(s)`);
      submitInspector();
    } catch (err) {
      console.error('hwid clear failed', err);
      toast.error('Failed to clear HWIDs');
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = inspectorData;

  const headerCounts = useMemo(() => {
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const warning = alerts.filter((a) => a.severity === 'warning' || a.severity === 'suspicious').length;
    return { critical, warning };
  }, [alerts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-card bg-card/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Open alerts (this page)
          </div>
          <div className="text-2xl font-bold mt-1">{alerts.length}</div>
        </div>
        <div className="rounded-lg border border-card bg-card/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Critical
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
            {headerCounts.critical}
          </div>
        </div>
        <div className="rounded-lg border border-card bg-card/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Warning / suspicious
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {headerCounts.warning}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-card/40 border border-card rounded-lg px-3 py-3">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Severity
          </label>
          <select
            className={`${fieldClass} px-2 py-1.5 text-sm`}
            value={severityFilter}
            onChange={(e) => {
              setPage(0);
              setSeverityFilter(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="suspicious">Suspicious</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="low_concern">Low concern</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            User id
          </label>
          <input
            className={`${fieldClass} px-2 py-1.5 text-sm w-32`}
            type="number"
            placeholder="any"
            value={userFilter}
            onChange={(e) => {
              setPage(0);
              setUserFilter(e.target.value);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm select-none">
          <input
            type="checkbox"
            checked={unresolvedOnly}
            onChange={(e) => {
              setPage(0);
              setUnresolvedOnly(e.target.checked);
            }}
            className="rounded"
          />
          <span>Unresolved only</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(0);
            loadAlerts();
          }}
          className="ml-auto px-3 py-1.5 text-sm rounded-md bg-osu-pink text-white hover:bg-osu-pink/90 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-lg border border-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-3 py-2 w-24">Severity</th>
                <th className="text-left px-3 py-2 w-32">When</th>
                <th className="text-left px-3 py-2 w-24">User</th>
                <th className="text-left px-3 py-2 w-24">Score</th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loadingAlerts && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loadingAlerts && alerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No alerts match these filters.
                  </td>
                </tr>
              )}
              {!loadingAlerts && alerts.map((a) => {
                const expanded = expandedIds.has(a.id);
                return (
                  <React.Fragment key={a.id}>
                    <tr
                      className="border-t border-card hover:bg-card/40 transition-colors cursor-pointer"
                      onClick={() => toggleExpanded(a.id)}
                    >
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${severityBadgeClass(a.severity)}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(a.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        {a.user_id ? (
                          <Link
                            to={`/users/${a.user_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-osu-pink hover:underline"
                          >
                            #{a.user_id}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {a.score_id ? (
                          <Link
                            to={`/scores/${a.score_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-osu-pink hover:underline"
                          >
                            #{a.score_id}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                        {truncate(a.title)}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {expanded ? '▼' : '▶'}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-card bg-card/30">
                        <td colSpan={6} className="px-3 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                Body
                              </div>
                              <pre className="text-xs whitespace-pre-wrap font-mono bg-card/50 p-2 rounded border border-card">
                                {a.body || '(empty)'}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                Payload
                              </div>
                              <pre className="text-xs whitespace-pre-wrap font-mono bg-card/50 p-2 rounded border border-card max-h-64 overflow-auto">
                                {JSON.stringify(a.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 flex gap-4 flex-wrap">
                            <span>id: {a.id}</span>
                            <span>kind: {a.kind}</span>
                            <span>created: {formatDate(a.created_at)}</span>
                            {a.dispatched_at && <span>dispatched: {formatDate(a.dispatched_at)}</span>}
                            {a.resolved_at && <span>resolved: {formatDate(a.resolved_at)}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-card/30 text-xs text-gray-600 dark:text-gray-400">
          <div>
            {total > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}` : '0 results'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0 || loadingAlerts}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-2 py-1 rounded border border-card disabled:opacity-40 hover:bg-card transition-colors"
            >
              Prev
            </button>
            <span>
              Page {page + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pageCount || loadingAlerts}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded border border-card disabled:opacity-40 hover:bg-card transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-card bg-card/40 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm font-semibold">User inspector</div>
          <input
            className={`${fieldClass} px-2 py-1.5 text-sm w-40`}
            type="number"
            placeholder="user id"
            value={inspectorInput}
            onChange={(e) => setInspectorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitInspector();
            }}
          />
          <button
            type="button"
            onClick={submitInspector}
            disabled={loadingInspector}
            className="px-3 py-1.5 text-sm rounded-md bg-osu-pink text-white hover:bg-osu-pink/90 disabled:opacity-50 transition-colors"
          >
            Inspect
          </button>
          {inspectorUserId && (
            <>
              <button
                type="button"
                onClick={handleResetAlerts}
                className="px-3 py-1.5 text-sm rounded-md border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                Resolve open alerts
              </button>
              <button
                type="button"
                onClick={handleClearHwid}
                className="px-3 py-1.5 text-sm rounded-md border border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                Clear hardware IDs
              </button>
            </>
          )}
        </div>

        {loadingInspector && (
          <div className="text-sm text-gray-500">Loading user summary…</div>
        )}

        {!loadingInspector && summary && (
          <div className="space-y-3">
            <div className="text-sm">
              <Link
                to={`/users/${summary.user_id}`}
                className="text-osu-pink hover:underline font-medium"
              >
                {summary.username} (#{summary.user_id})
              </Link>
              <span className="ml-3 text-xs text-gray-500">
                {summary.alert_counts.unresolved} open / {summary.alert_counts.total} total alert(s)
              </span>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Hardware IDs ({summary.hwid.known_hwids.length}) — peers: {summary.hwid.correlated_account_count}
              </div>
              {summary.hwid.breakdown.length === 0 && (
                <div className="text-xs text-gray-500">No hardware IDs recorded for this user.</div>
              )}
              {summary.hwid.breakdown.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="text-left px-2 py-1">Fingerprint</th>
                        <th className="text-left px-2 py-1 w-20">Peers</th>
                        <th className="text-left px-2 py-1">Peer user ids</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.hwid.breakdown.map((row) => (
                        <tr key={row.hwid} className="border-t border-card">
                          <td className="px-2 py-1 font-mono">{row.hwid}</td>
                          <td className="px-2 py-1">{row.peer_count}</td>
                          <td className="px-2 py-1">
                            {row.peer_user_ids.length === 0
                              ? '-'
                              : row.peer_user_ids.map((uid, i) => (
                                  <React.Fragment key={uid}>
                                    {i > 0 && ', '}
                                    <Link
                                      to={`/users/${uid}`}
                                      className="text-osu-pink hover:underline"
                                    >
                                      #{uid}
                                    </Link>
                                  </React.Fragment>
                                ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!loadingInspector && inspectorUserId && !summary && (
          <div className="text-sm text-gray-500">
            No data loaded. Enter a user id and click Inspect.
          </div>
        )}

        {!inspectorUserId && !loadingInspector && (
          <div className="text-xs text-gray-500">
            Enter a numeric user id to inspect their alert history and hardware-ID footprint.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnticheatAlerts;
