import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../utils/api';
import { Link } from 'react-router-dom';

type LoginLogItem = {
  id: number;
  user_id: number;
  username?: string | null;
  ip_address: string;
  user_agent?: string | null;
  login_time: string;
  login_success: boolean;
  login_method: string;
  client_label?: string | null;
  client_hash?: string | null;
  notes?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  city_name?: string | null;
  organization?: string | null;
};

type UnknownHashItem = {
  hash: string;
  count: number;
  first_seen?: string | null;
  last_seen?: string | null;
  last_user_id?: number | null;
  last_user_agent?: string | null;
  last_detected_os?: string | null;
  last_source?: string | null;
};

const isPrivateOrLocalIp = (value: string): boolean => {
  const ip = (value || '').trim().toLowerCase();
  if (!ip) return false;
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // IPv6 ULA
  return false;
};

const formatLocation = (row: LoginLogItem): string => {
  const parts = [row.city_name, row.country_name].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (isPrivateOrLocalIp(row.ip_address)) return 'Private / local network';
  return 'Unknown';
};

const looksMojibake = (value: string): boolean => /[ÃÂæçäåðï]/.test(value) || value.includes('�');

const tryDecodeMojibake = (value?: string | null): string => {
  if (!value) return '-';
  const text = value.trim();
  if (!text) return '-';
  if (!looksMojibake(text)) return text;

  try {
    const bytes = new Uint8Array(Array.from(text, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
    if (!decoded) return text;
    if (!looksMojibake(decoded)) return decoded;
    return decoded.length >= text.length / 2 ? decoded : text;
  } catch {
    return text;
  }
};

const AdminLoginAudit: React.FC = () => {
  const auditFieldClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-osu-pink/60 focus:border-transparent';

  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [successFilter, setSuccessFilter] = useState<'all' | 'success' | 'failed'>('all');

  const [logs, setLogs] = useState<LoginLogItem[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [unknownHashes, setUnknownHashes] = useState<UnknownHashItem[]>([]);
  const [loadingHashes, setLoadingHashes] = useState(false);
  const [assigningHash, setAssigningHash] = useState<string | null>(null);
  const [manualAssignLoading, setManualAssignLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({
    client_name: '',
    version: '',
  });
  const [manualAssignForm, setManualAssignForm] = useState({
    client_hash: '',
    client_name: '',
    version: '',
  });
  const manualAssignReady =
    manualAssignForm.client_hash.trim().length > 0 &&
    manualAssignForm.client_name.trim().length > 0;

  const canLoadMoreLogs = logs.length < logsTotal;

  const parseErrorMessage = (error: unknown, fallback: string): string => {
    const status = (error as any)?.response?.status as number | undefined;
    if (status === 401) return 'Unauthorized. Please sign in again.';
    if (status === 403) return 'Admin permission required.';
    if (status === 404) return 'Endpoint not found. Backend may be outdated.';
    return fallback;
  };

  const resolvedSuccessFilter = useMemo(() => {
    if (successFilter === 'all') return undefined;
    return successFilter === 'success';
  }, [successFilter]);

  const loadLogs = async (page: number, append: boolean) => {
    try {
      setLoadingLogs(true);
      const data = await adminAPI.getLoginLogs({
        page,
        per_page: 50,
        search: search.trim() || undefined,
        login_method: method.trim() || undefined,
        login_success: resolvedSuccessFilter,
      });
      const next = (data?.logs || []) as LoginLogItem[];
      setLogsTotal(data?.total || 0);
      setLogsPage(page);
      setLogs(append ? [...logs, ...next] : next);
    } catch (error) {
      console.error('Failed to load login logs:', error);
      toast.error(parseErrorMessage(error, 'Failed to load login logs'), {
        id: 'admin-login-audit-logs-error',
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadUnknownHashes = async () => {
    try {
      setLoadingHashes(true);
      const data = await adminAPI.getUnknownClientHashes({
        page: 1,
        per_page: 200,
      });
      setUnknownHashes((data?.hashes || []) as UnknownHashItem[]);
    } catch (error) {
      console.error('Failed to load unknown hashes:', error);
      toast.error(parseErrorMessage(error, 'Failed to load unknown hashes'), {
        id: 'admin-login-audit-hashes-error',
      });
    } finally {
      setLoadingHashes(false);
    }
  };

  const handleAssignHash = async (hash: string) => {
    if (!assignForm.client_name.trim()) {
      toast.error('Client name is required');
      return;
    }
    try {
      setAssigningHash(hash);
      await adminAPI.assignClientHash({
        client_hash: hash,
        client_name: assignForm.client_name.trim(),
        version: assignForm.version.trim(),
        remove_from_unknown: true,
      });
      toast.success(`Assigned hash ${hash.slice(0, 12)}...`);
      setAssigningHash(null);
      setAssignForm({ client_name: '', version: '' });
      await loadUnknownHashes();
      await loadLogs(1, false);
    } catch (error) {
      console.error('Failed to assign hash:', error);
      toast.error('Failed to assign hash');
    } finally {
      setAssigningHash(null);
    }
  };

  const handleManualAssignHash = async () => {
    const hash = manualAssignForm.client_hash.trim().toLowerCase();
    const clientName = manualAssignForm.client_name.trim();
    const version = manualAssignForm.version.trim();

    if (!hash) {
      toast.error('Hash is required');
      return;
    }
    if (!/^[0-9a-f]{8,128}$/i.test(hash)) {
      toast.error('Hash must be hex (8-128 chars)');
      return;
    }
    if (!clientName) {
      toast.error('Client name is required');
      return;
    }

    try {
      setManualAssignLoading(true);
      await adminAPI.assignClientHash({
        client_hash: hash,
        client_name: clientName,
        version,
        remove_from_unknown: true,
      });
      toast.success(`Mapped ${hash.slice(0, 12)}...`);
      setManualAssignForm({ client_hash: '', client_name: '', version: '' });
      await loadUnknownHashes();
      await loadLogs(1, false);
    } catch (error) {
      console.error('Failed to manually assign hash:', error);
      toast.error(parseErrorMessage(error, 'Failed to assign hash mapping'));
    } finally {
      setManualAssignLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      loadLogs(1, false);
    }, 250);
    return () => window.clearTimeout(id);
  }, [search, method, successFilter]);

  useEffect(() => {
    loadUnknownHashes();
  }, []);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, IP, country, user-agent..."
            className={`min-w-[280px] flex-1 px-3 py-2 ${auditFieldClass}`}
          />
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Method (password, oauth...)"
            className={`w-56 px-3 py-2 ${auditFieldClass}`}
          />
          <select
            value={successFilter}
            onChange={(e) => setSuccessFilter(e.target.value as 'all' | 'success' | 'failed')}
            className={`w-36 px-3 py-2 ${auditFieldClass}`}
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="text-sm text-gray-400">Showing {logs.length} / {logsTotal} logins</div>

        <div className="overflow-x-auto border border-card rounded-xl">
          <table className="w-full min-w-[1240px] table-fixed text-sm">
            <colgroup>
              <col className="w-[170px]" />
              <col className="w-[150px]" />
              <col className="w-[90px]" />
              <col className="w-[120px]" />
              <col className="w-[220px]" />
              <col className="w-[120px]" />
              <col className="w-[180px]" />
              <col className="w-[190px]" />
            </colgroup>
            <thead className="bg-card/40">
              <tr>
                <th className="text-left p-3 whitespace-nowrap">Time</th>
                <th className="text-left p-3 whitespace-nowrap">User</th>
                <th className="text-left p-3 whitespace-nowrap">Status</th>
                <th className="text-left p-3 whitespace-nowrap">Method</th>
                <th className="text-left p-3 whitespace-nowrap">Client</th>
                <th className="text-left p-3 whitespace-nowrap">Hash</th>
                <th className="text-left p-3 whitespace-nowrap">IP / Location</th>
                <th className="text-left p-3 whitespace-nowrap">User-Agent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-t border-card/60 align-top">
                  <td className="p-3 whitespace-nowrap text-xs md:text-sm">{new Date(row.login_time).toLocaleString()}</td>
                  <td className="p-3">
                    {row.user_id > 0 ? (
                      <Link to={`/users/${row.user_id}`} className="font-medium text-cyan-300 hover:text-cyan-200">
                        {row.username || `User #${row.user_id}`}
                      </Link>
                    ) : (
                      <div className="font-medium">{row.username || `User #${row.user_id}`}</div>
                    )}
                    <div className="text-xs text-gray-400">ID {row.user_id}</div>
                  </td>
                  <td className="p-3">
                    <span className={row.login_success ? 'text-green-400' : 'text-red-400'}>
                      {row.login_success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="max-w-[140px] leading-tight break-all text-xs md:text-sm" title={row.login_method}>
                      {row.login_method}
                    </div>
                  </td>
                  <td className="p-3">
                    <div
                      className="max-w-[250px] leading-tight break-words text-xs text-gray-300"
                      title={row.client_label || '-'}
                    >
                      {row.client_label || '-'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-xs text-gray-300 break-all leading-tight" title={row.client_hash || '-'}>
                      {row.client_hash || '-'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{row.ip_address}</div>
                    <div className="text-xs text-gray-400">{formatLocation(row)}</div>
                    {row.organization ? (
                      <div className="text-xs text-gray-500">{row.organization}</div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <div
                      className="leading-tight break-words text-xs text-gray-300"
                      title={tryDecodeMojibake(row.user_agent)}
                    >
                      {tryDecodeMojibake(row.user_agent)}
                    </div>
                    {row.notes ? (
                      <div
                        className="leading-tight break-words text-xs text-gray-500 mt-1"
                        title={tryDecodeMojibake(row.notes)}
                      >
                        {tryDecodeMojibake(row.notes)}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!loadingLogs && logs.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-400" colSpan={8}>
                    No login data found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadLogs(1, false)}
            disabled={loadingLogs}
            className="px-3 py-2 rounded-lg border border-card hover:bg-card/40 disabled:opacity-50"
          >
            Refresh
          </button>
          {canLoadMoreLogs ? (
            <button
              onClick={() => loadLogs(logsPage + 1, true)}
              disabled={loadingLogs}
              className="px-3 py-2 rounded-lg bg-osu-pink/90 text-white hover:bg-osu-pink disabled:opacity-50"
            >
              Load more
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Unknown client hashes</h3>
            <button
              onClick={loadUnknownHashes}
              disabled={loadingHashes}
              className="px-3 py-1.5 rounded-lg border border-card hover:bg-card/40 disabled:opacity-50"
            >
              Refresh hashes
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={manualAssignForm.client_hash}
                onChange={(e) =>
                  setManualAssignForm((prev) => ({ ...prev, client_hash: e.target.value }))
                }
                placeholder="Hash"
                className={`px-3 py-2 ${auditFieldClass}`}
              />
              <input
                value={manualAssignForm.client_name}
                onChange={(e) =>
                  setManualAssignForm((prev) => ({ ...prev, client_name: e.target.value }))
                }
                placeholder="Client name"
                className={`px-3 py-2 ${auditFieldClass}`}
              />
              <input
                value={manualAssignForm.version}
                onChange={(e) =>
                  setManualAssignForm((prev) => ({ ...prev, version: e.target.value }))
                }
                placeholder="Version (optional)"
                className={`px-3 py-2 ${auditFieldClass}`}
              />
              <button
                onClick={handleManualAssignHash}
                disabled={manualAssignLoading || !manualAssignReady}
                className="px-3 py-2 rounded-lg bg-osu-pink/90 text-white hover:bg-osu-pink disabled:opacity-50"
                title="Create or update mapping for this hash"
              >
                {manualAssignLoading ? 'Saving...' : 'Assign / Update'}
              </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-card rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-card/40">
              <tr>
                <th className="text-left p-3">Hash</th>
                <th className="text-left p-3">Count</th>
                <th className="text-left p-3">Last seen</th>
                <th className="text-left p-3">Last UA</th>
                <th className="text-left p-3">Detected OS</th>
                <th className="text-left p-3">Assign</th>
              </tr>
            </thead>
            <tbody>
              {unknownHashes.map((row) => (
                <tr key={row.hash} className="border-t border-card/60 align-top">
                  <td className="p-3 font-mono break-all">{row.hash}</td>
                  <td className="p-3">{row.count}</td>
                  <td className="p-3 whitespace-nowrap">{row.last_seen ? new Date(row.last_seen).toLocaleString() : '-'}</td>
                  <td className="p-3 max-w-[420px]">
                    <div className="break-all text-xs text-gray-300">{row.last_user_agent || '-'}</div>
                    <div className="text-xs text-gray-500 mt-1">user #{row.last_user_id || '-'}</div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-gray-300">{row.last_detected_os || '-'}</span>
                  </td>
                  <td className="p-3 min-w-[330px]">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Client name"
                        value={assigningHash === row.hash ? assignForm.client_name : ''}
                        onChange={(e) => {
                          setAssigningHash(row.hash);
                          setAssignForm((prev) => ({ ...prev, client_name: e.target.value }));
                        }}
                        className={`px-2 py-1 ${auditFieldClass}`}
                      />
                      <input
                        placeholder="Version"
                        value={assigningHash === row.hash ? assignForm.version : ''}
                        onChange={(e) => {
                          setAssigningHash(row.hash);
                          setAssignForm((prev) => ({ ...prev, version: e.target.value }));
                        }}
                        className={`px-2 py-1 ${auditFieldClass}`}
                      />
                    </div>
                    <button
                      onClick={() => handleAssignHash(row.hash)}
                      disabled={
                        assigningHash === row.hash &&
                        !assignForm.client_name.trim()
                      }
                      className="mt-2 px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Assign hash
                    </button>
                  </td>
                </tr>
              ))}
              {!loadingHashes && unknownHashes.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-400" colSpan={6}>
                    No unknown hashes
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminLoginAudit;
