import React, { useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

type Severity = 'info' | 'warning' | 'error';

const AdminAnnouncements: React.FC = () => {
  const [title, setTitle] = useState('Server Announcement');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<Severity>('warning');
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [alsoSendPm, setAlsoSendPm] = useState(true);
  const [senderUsername, setSenderUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    sent_to: number;
    sender_username: string;
  } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      toast.error('Message cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const result = await adminAPI.sendGlobalAnnouncement({
        title: title.trim() || 'Server Announcement',
        message: cleanMessage,
        severity,
        also_send_pm: alsoSendPm,
        online_only: onlineOnly,
        sender_username: senderUsername.trim() || undefined,
      });
      setLastResult({
        sent_to: result.sent_to ?? 0,
        sender_username: result.sender_username ?? senderUsername,
      });
      toast.success(`Announcement sent to ${result.sent_to ?? 0} user(s)`);
      setMessage('');
    } catch (error) {
      console.error('Failed to send announcement:', error);
      toast.error('Failed to send announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-osu-pink/20 bg-osu-pink/5 p-4 text-sm text-gray-300">
        Sends an in-app popup notification to players. Optional PM mirror is sent by selected sender
        (leave sender empty to use fallback <span className="font-semibold text-white">user_id=2</span>, the
        system bot account: <span className="font-semibold text-white">BanchoBot</span> / renamed{' '}
        <span className="font-semibold text-white">ToriiHalo</span>).
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-card bg-card px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-osu-pink/40"
              maxLength={120}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Sender Username</label>
            <input
              value={senderUsername}
              onChange={(e) => setSenderUsername(e.target.value)}
              placeholder="Optional (empty = user_id 2)"
              className="w-full rounded-lg border border-card bg-card px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-osu-pink/40"
              maxLength={64}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-card bg-card px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-osu-pink/40"
            placeholder="Server restarting in 2 minutes..."
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full md:w-[280px]">
            <label className="block text-sm font-medium text-gray-200 mb-2">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="w-full rounded-lg border border-card bg-card px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-osu-pink/40"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <button
            type="button"
            className={`relative inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold border transition-all duration-200 active:scale-[0.98] ${
              onlineOnly
                ? 'bg-blue-500/20 border-blue-400/40 text-blue-100 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]'
                : 'bg-slate-700/30 border-white/10 text-slate-200 hover:border-white/25'
            }`}
            onClick={() => setOnlineOnly((prev) => !prev)}
          >
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${onlineOnly ? 'bg-blue-300 animate-pulse' : 'bg-slate-400'}`} />
            Online users only
          </button>

          <button
            type="button"
            className={`relative inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold border transition-all duration-200 active:scale-[0.98] ${
              alsoSendPm
                ? 'bg-blue-500/20 border-blue-400/40 text-blue-100 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]'
                : 'bg-slate-700/30 border-white/10 text-slate-200 hover:border-white/25'
            }`}
            onClick={() => setAlsoSendPm((prev) => !prev)}
          >
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${alsoSendPm ? 'bg-blue-300 animate-pulse' : 'bg-slate-400'}`} />
            Also send PM
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-osu-pink px-4 py-2 font-semibold text-white hover:bg-osu-pink/90 disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Announcement'}
          </button>
          {lastResult && (
            <span className="text-sm text-gray-300">
              Sent to <span className="font-semibold text-white">{lastResult.sent_to}</span> user(s) as{' '}
              <span className="font-semibold text-white">{lastResult.sender_username}</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminAnnouncements;
