// Admin panel — maintenance mode toggle.
//
// Backed by three endpoints on g0v0-server:
//   GET    /api/private/admin/maintenance   -> current state (admin)
//   POST   /api/private/admin/maintenance   -> enable, with optional message
//   DELETE /api/private/admin/maintenance   -> disable
//
// Plus the public /api/v2/server/status that the global banner polls
// for non-admin viewers. Toggling here is reflected on every other
// client within the banner's poll interval.
//
// Self-lockout posture: the backend deliberately does NOT block admin
// auth or admin endpoints when maintenance is on, so flipping the
// toggle here can always be undone from this same page. There's no
// "are you sure" double-prompt because there's no permanent damage —
// disabling immediately restores score submission.

import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../utils/api/client';

interface MaintenanceState {
  enabled: boolean;
  message: string | null;
  set_at: string | null;
  set_by_user_id: number | null;
  set_by_username: string | null;
}

const ENDPOINT = '/api/private/admin/maintenance';

const AdminMaintenance: React.FC = () => {
  const [state, setState] = useState<MaintenanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Local message buffer — distinct from `state.message` so the admin
  // can compose a new message without it being clobbered by polls.
  const [draftMessage, setDraftMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<MaintenanceState>(ENDPOINT);
      setState(res.data);
      // Only sync the draft to the live message when we don't already
      // have an in-progress edit — otherwise typing gets clobbered.
      setDraftMessage((current) => (current === '' ? (res.data.message ?? '') : current));
    } catch (err) {
      console.error('Failed to load maintenance state:', err);
      toast.error('Failed to load maintenance state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const trimmed = draftMessage.trim();
      const res = await api.post<MaintenanceState>(ENDPOINT, {
        message: trimmed.length > 0 ? trimmed : null,
      });
      setState(res.data);
      toast.success('Maintenance mode enabled — score submission is now blocked for non-admins.');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to enable maintenance mode');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      const res = await api.delete<MaintenanceState>(ENDPOINT);
      setState(res.data);
      toast.success('Maintenance mode disabled — score submission is open again.');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to disable maintenance mode');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const enabled = !!state?.enabled;

  return (
    <div className="space-y-6 max-w-2xl">
      <div
        className={`rounded-2xl border p-5 ${
          enabled
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
        }`}
      >
        <div className="flex items-baseline gap-3">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              enabled ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="text-lg font-bold">
            {enabled ? 'Maintenance mode ACTIVE' : 'Server operating normally'}
          </span>
        </div>
        <p className="text-sm opacity-90 mt-1">
          {enabled
            ? 'Score submission is currently blocked for everyone except admins. Authentication and reads still work.'
            : 'All score submissions are accepted. Toggle below to enter maintenance.'}
        </p>
        {enabled && state?.set_at && (
          <div className="mt-3 text-xs opacity-75 space-y-0.5">
            <div>Enabled at: <span className="font-mono">{new Date(state.set_at).toLocaleString()}</span></div>
            {state.set_by_username && (
              <div>By: <span className="font-mono">{state.set_by_username}</span></div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Banner message
          </label>
          <textarea
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            placeholder="Optional. Shown to all users when maintenance is active. Leave blank for the default."
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40"
            disabled={busy}
          />
          <div className="text-xs text-gray-400 mt-1">
            Updates to this field take effect when you click "Enable" or re-enable. Currently-displayed
            banner reflects the message captured at the last enable.
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!enabled ? (
            <button
              onClick={handleEnable}
              disabled={busy}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
            >
              Enable maintenance
            </button>
          ) : (
            <>
              <button
                onClick={handleEnable}
                disabled={busy}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
                title="Re-apply with the current banner message"
              >
                Update message
              </button>
              <button
                onClick={handleDisable}
                disabled={busy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
              >
                Disable maintenance
              </button>
            </>
          )}
          <button
            onClick={refresh}
            disabled={busy}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 leading-relaxed">
        <p>
          <span className="font-semibold text-gray-300">Self-lockout protection:</span>{' '}
          Maintenance mode does not block admin authentication, admin endpoints, or profile
          reads. You can always log in and disable it from this page.
        </p>
      </div>
    </div>
  );
};

export default AdminMaintenance;
