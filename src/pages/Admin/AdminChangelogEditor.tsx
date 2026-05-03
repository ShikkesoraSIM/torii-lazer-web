// Admin -> Changelog Editor
//
// Two-pane layout to manage `changelog_builds` and `changelog_entries`:
//   left  -> list of builds (newest first), with create/delete affordances
//   right -> the selected build's entries + add/delete entry forms +
//            the "fetch from GitHub commits" helper modal
//
// Backed by /api/private/changelog/* (see g0v0-server's
// app/router/private/changelog.py). The public read endpoints at
// /api/v2/changelog automatically prefer DB rows once we create at
// least one build here, so editor changes are visible to readers
// without a deploy.

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../utils/api';

type ChangeType = 'add' | 'fix' | 'misc' | 'remove';
type Category = 'client' | 'ui' | 'pp' | 'network' | 'toolbar' | 'download' | 'server' | 'web' | 'other';

interface BuildRow {
  id: number;
  version: string;
  display_version: string;
  stream_name: string;
  stream_id: number;
  users: number;
  created_at: string | null;
  github_url: string | null;
  entry_count: number;
}

interface EntryRow {
  id: number;
  type: string;
  category: string;
  title: string;
  major: boolean;
  url: string | null;
  github_pull_request_id: number | null;
  created_at: string | null;
}

interface GitHubCommit {
  sha: string;
  full_sha: string;
  message: string;
  author: string;
  date: string;
  html_url: string | null;
}

const CHANGE_TYPE_LABELS: Record<ChangeType, { label: string; color: string }> = {
  add: { label: 'Add', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  fix: { label: 'Fix', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  misc: { label: 'Misc', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  remove: { label: 'Remove', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
};

const CATEGORY_LABELS: Record<Category, string> = {
  client: 'Client',
  ui: 'UI',
  pp: 'PP',
  network: 'Network',
  toolbar: 'Toolbar',
  download: 'Download',
  server: 'Server',
  web: 'Web',
  other: 'Other',
};

const STREAM_DEFAULT_ID = 1; // seeded by the changelog migration

const AdminChangelogEditor: React.FC = () => {
  // ── Left pane ──────────────────────────────────────────────────────
  const [builds, setBuilds] = useState<BuildRow[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(true);
  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);

  // Create-build form
  const [showCreateBuild, setShowCreateBuild] = useState(false);
  const [newBuild, setNewBuild] = useState({
    version: '',
    display_version: '',
    stream_id: STREAM_DEFAULT_ID,
    users: 0,
    github_url: '',
  });
  const [creatingBuild, setCreatingBuild] = useState(false);

  // ── Right pane ─────────────────────────────────────────────────────
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Create-entry form
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: 'add' as ChangeType,
    category: 'client' as Category,
    title: '',
    major: false,
  });
  const [creatingEntry, setCreatingEntry] = useState(false);

  // GitHub commits modal
  const [showGitHubCommits, setShowGitHubCommits] = useState(false);
  const [repoName, setRepoName] = useState('shikkesora/torii-osu');
  const [githubCommits, setGithubCommits] = useState<GitHubCommit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [importingSha, setImportingSha] = useState<string | null>(null);

  // ── Loaders ────────────────────────────────────────────────────────
  const loadBuilds = useCallback(async () => {
    try {
      setLoadingBuilds(true);
      const data = await adminAPI.getChangelogBuilds();
      setBuilds(data || []);
      // Auto-select the newest build the first time the page loads
      // so the right pane isn't empty on first render.
      setSelectedBuildId((current) => current ?? (data && data.length > 0 ? data[0].id : null));
    } catch (err) {
      console.error('Failed to load changelog builds:', err);
      toast.error('Failed to load changelog builds');
    } finally {
      setLoadingBuilds(false);
    }
  }, []);

  const loadEntries = useCallback(async (buildId: number) => {
    try {
      setLoadingEntries(true);
      const data = await adminAPI.getChangelogEntries(buildId);
      setEntries(data || []);
    } catch (err) {
      console.error('Failed to load entries:', err);
      toast.error('Failed to load entries');
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    loadBuilds();
  }, [loadBuilds]);

  useEffect(() => {
    if (selectedBuildId != null) loadEntries(selectedBuildId);
    else setEntries([]);
  }, [selectedBuildId, loadEntries]);

  // ── Mutations ──────────────────────────────────────────────────────

  const handleCreateBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuild.version.trim() || !newBuild.display_version.trim()) {
      toast.error('Version and display_version are required');
      return;
    }
    setCreatingBuild(true);
    try {
      const created = await adminAPI.createChangelogBuild({
        ...newBuild,
        github_url: newBuild.github_url.trim() || null,
        created_at: new Date().toISOString(),
      });
      toast.success(`Build ${created.version} created`);
      setShowCreateBuild(false);
      setNewBuild({
        version: '',
        display_version: '',
        stream_id: STREAM_DEFAULT_ID,
        users: 0,
        github_url: '',
      });
      await loadBuilds();
      setSelectedBuildId(created.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create build');
    } finally {
      setCreatingBuild(false);
    }
  };

  const handleDeleteBuild = async (build: BuildRow) => {
    if (!confirm(`Delete build ${build.version}? All ${build.entry_count} entries will be removed too.`)) return;
    try {
      await adminAPI.deleteChangelogBuild(build.id);
      toast.success('Build deleted');
      if (selectedBuildId === build.id) setSelectedBuildId(null);
      await loadBuilds();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete build');
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildId) {
      toast.error('Pick a build first');
      return;
    }
    if (!newEntry.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setCreatingEntry(true);
    try {
      await adminAPI.createChangelogEntry({
        build_id: selectedBuildId,
        type: newEntry.type,
        category: newEntry.category,
        title: newEntry.title.trim(),
        major: newEntry.major,
        message_html: `<p>${newEntry.title.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
      });
      toast.success('Entry added');
      setNewEntry({ type: 'add', category: 'client', title: '', major: false });
      setShowCreateEntry(false);
      await Promise.all([loadEntries(selectedBuildId), loadBuilds()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create entry');
    } finally {
      setCreatingEntry(false);
    }
  };

  const handleDeleteEntry = async (entry: EntryRow) => {
    if (!confirm(`Delete entry "${entry.title}"?`)) return;
    try {
      await adminAPI.deleteChangelogEntry(entry.id);
      toast.success('Entry deleted');
      if (selectedBuildId) {
        await Promise.all([loadEntries(selectedBuildId), loadBuilds()]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete entry');
    }
  };

  const handleFetchCommits = async () => {
    if (!repoName.trim()) {
      toast.error('Enter a repo (owner/repo or full URL)');
      return;
    }
    setLoadingCommits(true);
    setCommitsError(null);
    try {
      const result = await adminAPI.getGitHubCommits(repoName.trim(), 30);
      if ('error' in result) {
        setCommitsError(result.error);
        setGithubCommits([]);
      } else {
        setGithubCommits(result);
      }
    } catch (err: any) {
      setCommitsError(err?.response?.data?.detail || 'Failed to fetch commits');
      setGithubCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleImportCommit = async (commit: GitHubCommit) => {
    if (!selectedBuildId) {
      toast.error('Pick a build first');
      return;
    }
    setImportingSha(commit.full_sha);
    try {
      await adminAPI.createEntryFromCommit(
        selectedBuildId,
        commit.full_sha,
        commit.message,
        repoName.trim() || 'shikkesora/torii-osu',
      );
      toast.success('Entry imported from commit');
      await Promise.all([loadEntries(selectedBuildId), loadBuilds()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to import commit');
    } finally {
      setImportingSha(null);
    }
  };

  const selectedBuild = builds.find((b) => b.id === selectedBuildId) || null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Builds pane */}
      <aside className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Builds</h3>
          <button
            onClick={() => setShowCreateBuild((v) => !v)}
            className="px-3 py-1.5 text-xs bg-osu-pink hover:bg-osu-pink/90 text-white rounded-lg font-medium"
          >
            {showCreateBuild ? 'Cancel' : '+ New build'}
          </button>
        </div>

        {showCreateBuild && (
          <form onSubmit={handleCreateBuild} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
            <input
              type="text"
              placeholder="version (e.g. 2026.503.9)"
              value={newBuild.version}
              onChange={(e) => setNewBuild((b) => ({ ...b, version: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
            />
            <input
              type="text"
              placeholder="display_version (e.g. 2026.503.9-torii)"
              value={newBuild.display_version}
              onChange={(e) => setNewBuild((b) => ({ ...b, display_version: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
            />
            <input
              type="text"
              placeholder="github_url (optional)"
              value={newBuild.github_url}
              onChange={(e) => setNewBuild((b) => ({ ...b, github_url: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
            />
            <button
              type="submit"
              disabled={creatingBuild}
              className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
            >
              {creatingBuild ? 'Creating…' : 'Create'}
            </button>
          </form>
        )}

        {loadingBuilds ? (
          <div className="text-xs text-gray-400 py-4 text-center">Loading…</div>
        ) : builds.length === 0 ? (
          <div className="text-xs text-gray-400 py-4 text-center">
            No builds yet. The public changelog page is showing the hardcoded
            historical builds until you create one here.
          </div>
        ) : (
          <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
            {builds.map((b) => {
              const isSelected = b.id === selectedBuildId;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => setSelectedBuildId(b.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-osu-pink/20 border border-osu-pink/40'
                        : 'border border-transparent hover:border-white/15'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white truncate">{b.display_version}</div>
                    <div className="text-[10px] text-gray-400">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'} · {b.entry_count} entries
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Entries pane */}
      <main className="space-y-4">
        {selectedBuild == null ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
            Pick a build from the left, or create a new one.
          </div>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold text-white truncate">{selectedBuild.display_version}</div>
                <div className="text-xs text-gray-400">
                  {selectedBuild.stream_name} · {selectedBuild.entry_count} entries ·{' '}
                  {selectedBuild.created_at ? new Date(selectedBuild.created_at).toLocaleString() : 'no date'}
                </div>
              </div>
              <button
                onClick={() => setShowCreateEntry((v) => !v)}
                className="px-3 py-1.5 text-xs bg-osu-pink hover:bg-osu-pink/90 text-white rounded-lg font-medium"
              >
                + Entry
              </button>
              <button
                onClick={() => setShowGitHubCommits(true)}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Import from GitHub
              </button>
              <button
                onClick={() => handleDeleteBuild(selectedBuild)}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Delete build
              </button>
            </div>

            {showCreateEntry && (
              <form onSubmit={handleCreateEntry} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-400">Type</span>
                    <select
                      value={newEntry.type}
                      onChange={(e) => setNewEntry((p) => ({ ...p, type: e.target.value as ChangeType }))}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
                    >
                      {(Object.keys(CHANGE_TYPE_LABELS) as ChangeType[]).map((t) => (
                        <option key={t} value={t}>{CHANGE_TYPE_LABELS[t].label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-400">Category</span>
                    <select
                      value={newEntry.category}
                      onChange={(e) => setNewEntry((p) => ({ ...p, category: e.target.value as Category }))}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
                    >
                      {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 md:col-span-2 flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      checked={newEntry.major}
                      onChange={(e) => setNewEntry((p) => ({ ...p, major: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">Major change (featured rendering)</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Entry title (the bullet point text)"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
                />
                <button
                  type="submit"
                  disabled={creatingEntry}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                >
                  {creatingEntry ? 'Saving…' : 'Add entry'}
                </button>
              </form>
            )}

            {loadingEntries ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
                Loading entries…
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
                No entries yet on this build. Add one above or import from GitHub.
              </div>
            ) : (
              <ul className="space-y-2">
                {entries.map((e) => {
                  const typeMeta = CHANGE_TYPE_LABELS[e.type as ChangeType] ?? CHANGE_TYPE_LABELS.misc;
                  return (
                    <li
                      key={e.id}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10"
                    >
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${typeMeta.color}`}
                      >
                        {typeMeta.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {CATEGORY_LABELS[e.category as Category] ?? e.category}
                      </span>
                      {e.major && (
                        <span className="text-[10px] uppercase tracking-wider text-osu-pink px-2 py-0.5 rounded bg-osu-pink/10 border border-osu-pink/30">
                          Major
                        </span>
                      )}
                      <div className="flex-1 min-w-0 text-sm text-white">
                        {e.title}
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-xs text-blue-300 hover:text-blue-200 underline"
                          >
                            link
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(e)}
                        className="px-2 py-1 text-xs bg-red-600/80 hover:bg-red-700 text-white rounded"
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>

      {/* GitHub commits modal */}
      {showGitHubCommits && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Import from GitHub commit</h3>
              <button
                onClick={() => setShowGitHubCommits(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="owner/repo or full GitHub URL"
                  className="flex-1 px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
                />
                <button
                  onClick={handleFetchCommits}
                  disabled={loadingCommits}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 text-sm"
                >
                  {loadingCommits ? 'Fetching…' : 'Fetch'}
                </button>
              </div>

              {commitsError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  {commitsError}
                </div>
              )}

              {githubCommits.length > 0 && (
                <ul className="space-y-1 max-h-[55vh] overflow-y-auto">
                  {githubCommits.map((c) => (
                    <li
                      key={c.full_sha}
                      className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10"
                    >
                      <span className="text-xs font-mono text-gray-400 mt-0.5">{c.sha}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{c.message}</div>
                        <div className="text-[10px] text-gray-500">
                          {c.author} · {new Date(c.date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleImportCommit(c)}
                        disabled={importingSha === c.full_sha || !selectedBuildId}
                        className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50 flex-shrink-0"
                      >
                        {importingSha === c.full_sha ? '…' : 'Add'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowGitHubCommits(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChangelogEditor;
