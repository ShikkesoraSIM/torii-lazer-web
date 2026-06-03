// Admin operational tool: manually submit a player's score from a .osr.
//
// Backed by:
//   POST /api/private/admin/manual-submit/preview  -> dry-run (no writes)
//   POST /api/private/admin/manual-submit/commit   -> real insert
//
// Use case: a play's live submission was lost (missed window, transient
// lookup failure, etc.) and we want to honour it after the fact. The
// player DMs us the .osr; we upload it here. Preview parses + resolves the
// player/beatmap and surfaces any blockers; commit lands the score via the
// same process_score(...) path a normal submit uses.
//
// pp note: manual submit does NOT grant pp inline. The play lands in
// history; if the map is ranked and pp should count, use the per-user PP
// recalc tool right above this one.
//
// Self-contained section so it slots into AdminMaintenance next to the
// other recovery tools without dragging shared state.

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI, type ManualSubmitPreview, type ManualSubmitResult } from '../../utils/api/admin';

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm ' +
  'focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40';

const AdminManualSubmitSection: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [userId, setUserId] = useState('');
  const [preview, setPreview] = useState<ManualSubmitPreview | null>(null);
  const [result, setResult] = useState<ManualSubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildForm = (): FormData => {
    const fd = new FormData();
    fd.append('replay', file as File);
    const trimmed = userId.trim();
    if (trimmed) fd.append('user_id', trimmed);
    return fd;
  };

  const resetAll = () => {
    setFile(null);
    setUserId('');
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error('Pick a .osr file first');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      setPreview(await adminAPI.manualSubmitPreview(buildForm()));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to parse replay');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!file || !preview?.can_submit) return;
    setBusy(true);
    try {
      const r = await adminAPI.manualSubmitCommit(buildForm());
      setResult(r);
      setPreview(null);
      toast.success(`Score #${r.score_id} submitted for ${r.username}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">Manual score submission</h3>
        <p className="text-xs text-gray-400 mt-1">
          Upload a player's <code className="text-gray-300">.osr</code> to honour a play whose live
          submission was lost (missed window, transient lookup failure, etc.). Preview first, then
          submit — the score lands through the same path a normal submit uses. pp is not granted
          inline; run the per-user recalc above afterwards if the map is ranked.
        </p>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Replay file (.osr)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".osr"
            disabled={busy}
            onChange={(e) => {
              setFile(e.currentTarget.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
            className="w-full text-sm text-white file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-osu-pink file:text-white file:font-medium file:cursor-pointer hover:file:bg-osu-pink/90 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            User id override <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            value={userId}
            disabled={busy}
            onChange={(e) => {
              setUserId(e.target.value);
              setPreview(null);
            }}
            placeholder="Leave blank to resolve by the replay's player name"
            className={inputClass}
          />
          <div className="text-xs text-gray-400 mt-1">
            Set this when the player renamed beyond what the username history can resolve.
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePreview}
            disabled={busy || !file}
            className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            {busy && !preview ? 'Reading…' : 'Preview'}
          </button>
          {(file || preview || result) && (
            <button
              onClick={resetAll}
              disabled={busy}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-xl border border-white/10 bg-[rgba(12,16,42,0.5)] p-4 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-white">{preview.player_name || '(no name in replay)'}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-200 uppercase">{preview.mode}</span>
            {preview.mods.length > 0 && (
              <span className="text-xs text-osu-pink font-mono">+{preview.mods.join('')}</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label="Score" value={preview.total_score.toLocaleString()} />
            <Stat label="Accuracy" value={`${preview.accuracy.toFixed(2)}%`} />
            <Stat label="Max combo" value={`${preview.max_combo}x`} />
            <Stat label="Played" value={new Date(preview.played_at).toLocaleString()} />
            <Stat label="300 / 100 / 50" value={`${preview.counts.great} / ${preview.counts.ok} / ${preview.counts.meh}`} />
            <Stat label="Miss" value={`${preview.counts.miss}`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <ResolveBox
              title="Player"
              ok={!!preview.resolved_user}
              text={preview.resolved_user ? `${preview.resolved_user.username} · id ${preview.resolved_user.id}` : 'Not resolved'}
            />
            <ResolveBox
              title="Beatmap"
              ok={!!preview.resolved_beatmap}
              text={preview.resolved_beatmap ? `id ${preview.resolved_beatmap.id} · ${preview.resolved_beatmap.status} · ${preview.resolved_beatmap.version}` : 'Not on server'}
            />
          </div>

          {preview.warnings.length > 0 && (
            <ul className="space-y-1">
              {preview.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-300 flex gap-2">
                  <span aria-hidden>⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-1">
            {preview.can_submit ? (
              <button
                onClick={handleCommit}
                disabled={busy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
              >
                {busy ? 'Submitting…' : 'Submit this score'}
              </button>
            ) : (
              <div className="text-sm text-amber-300">Resolve the blockers above before submitting.</div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1 text-emerald-100">
          <div className="text-sm font-semibold">Submitted — score #{result.score_id}</div>
          <div className="text-xs opacity-90">
            {result.username} · {result.rank} · {result.accuracy.toFixed(2)}% · {result.total_score.toLocaleString()}
            {result.mods.length > 0 && <> · +{result.mods.join('')}</>}
          </div>
          <div className="text-xs opacity-75">
            Beatmap {result.beatmap_id} ({result.beatmap_version}). Lands in the player's history;
            run a per-user PP recalc above if the map is ranked.
          </div>
        </div>
      )}
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-sm text-white truncate">{value}</div>
  </div>
);

const ResolveBox: React.FC<{ title: string; ok: boolean; text: string }> = ({ title, ok, text }) => (
  <div
    className={`rounded-lg border px-3 py-2 ${
      ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
    }`}
  >
    <div className="text-[10px] uppercase tracking-wider text-gray-400">{title}</div>
    <div className={`text-sm ${ok ? 'text-emerald-200' : 'text-red-200'}`}>{text}</div>
  </div>
);

export default AdminManualSubmitSection;
