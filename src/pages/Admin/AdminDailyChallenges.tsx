import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import AdminModal from '../../components/Admin/AdminModal';

interface DailyChallenge {
  date: string;
  beatmap_id: number;
  ruleset_id: number;
  required_mods: string;
  allowed_mods: string;
  room_id?: number;
  max_attempts?: number;
  time_limit?: number;
  beatmap?: {
    beatmapset_id: number;
    artist: string;
    title: string;
    version: string;
  };
}

type ModEntry = { acronym: string; name: string };

const MODS_BY_RULESET: Record<number, ModEntry[]> = {
  // osu!
  0: [
    { acronym: 'NF', name: 'No Fail' },
    { acronym: 'EZ', name: 'Easy' },
    { acronym: 'HT', name: 'Half Time' },
    { acronym: 'DC', name: 'Daycore' },
    { acronym: 'HR', name: 'Hard Rock' },
    { acronym: 'SD', name: 'Sudden Death' },
    { acronym: 'PF', name: 'Perfect' },
    { acronym: 'HD', name: 'Hidden' },
    { acronym: 'DT', name: 'Double Time' },
    { acronym: 'NC', name: 'Nightcore' },
    { acronym: 'FL', name: 'Flashlight' },
    { acronym: 'BL', name: 'Blinds' },
    { acronym: 'ST', name: 'Strict Tracking' },
    { acronym: 'AC', name: 'Accuracy Challenge' },
    { acronym: 'SO', name: 'Spun Out' },
    { acronym: 'AP', name: 'Autopilot' },
    { acronym: 'RX', name: 'Relax' },
    { acronym: 'MU', name: 'Muted' },
    { acronym: 'NS', name: 'No Scope' },
    { acronym: 'MG', name: 'Magnetised' },
    { acronym: 'RP', name: 'Repel' },
    { acronym: 'AS', name: 'Adaptive Speed' },
    { acronym: 'FR', name: 'Freeze Frame' },
    { acronym: 'BU', name: 'Bubbles' },
    { acronym: 'SY', name: 'Synesthesia' },
    { acronym: 'WU', name: 'Wind Up' },
    { acronym: 'WD', name: 'Wind Down' },
    { acronym: 'SI', name: 'Spin In' },
    { acronym: 'GR', name: 'Grow' },
    { acronym: 'DF', name: 'Deflate' },
    { acronym: 'WG', name: 'Wiggle' },
    { acronym: 'BR', name: 'Barrel Roll' },
    { acronym: 'DP', name: 'Depth' },
    { acronym: 'TR', name: 'Transform' },
    { acronym: 'AD', name: 'Approach Different' },
    { acronym: 'TD', name: 'Touch Device' },
    { acronym: 'TC', name: 'Taps Count' },
    { acronym: 'AL', name: 'Alternate' },
    { acronym: 'SG', name: 'Single Tap' },
    { acronym: 'CL', name: 'Classic' },
    { acronym: 'DA', name: 'Difficulty Adjust' },
    { acronym: 'MR', name: 'Mirror' },
    { acronym: 'RD', name: 'Random' },
    { acronym: 'TP', name: 'Target Practice' },
    { acronym: 'BM', name: 'Bloom' },
  ],
  // osu!taiko
  1: [
    { acronym: 'NF', name: 'No Fail' },
    { acronym: 'EZ', name: 'Easy' },
    { acronym: 'HT', name: 'Half Time' },
    { acronym: 'DC', name: 'Daycore' },
    { acronym: 'HR', name: 'Hard Rock' },
    { acronym: 'SD', name: 'Sudden Death' },
    { acronym: 'PF', name: 'Perfect' },
    { acronym: 'HD', name: 'Hidden' },
    { acronym: 'DT', name: 'Double Time' },
    { acronym: 'NC', name: 'Nightcore' },
    { acronym: 'FL', name: 'Flashlight' },
    { acronym: 'AC', name: 'Accuracy Challenge' },
    { acronym: 'RX', name: 'Relax' },
    { acronym: 'MU', name: 'Muted' },
    { acronym: 'SW', name: 'Swap' },
    { acronym: 'SG', name: 'Single Tap' },
    { acronym: 'CL', name: 'Classic' },
    { acronym: 'CS', name: 'Constant Speed' },
    { acronym: 'DA', name: 'Difficulty Adjust' },
    { acronym: 'RD', name: 'Random' },
    { acronym: 'SR', name: 'Simplified Rhythm' },
    { acronym: 'AS', name: 'Adaptive Speed' },
    { acronym: 'WU', name: 'Wind Up' },
    { acronym: 'WD', name: 'Wind Down' },
  ],
  // osu!catch
  2: [
    { acronym: 'NF', name: 'No Fail' },
    { acronym: 'EZ', name: 'Easy' },
    { acronym: 'HT', name: 'Half Time' },
    { acronym: 'DC', name: 'Daycore' },
    { acronym: 'HR', name: 'Hard Rock' },
    { acronym: 'SD', name: 'Sudden Death' },
    { acronym: 'PF', name: 'Perfect' },
    { acronym: 'HD', name: 'Hidden' },
    { acronym: 'DT', name: 'Double Time' },
    { acronym: 'NC', name: 'Nightcore' },
    { acronym: 'FL', name: 'Flashlight' },
    { acronym: 'AC', name: 'Accuracy Challenge' },
    { acronym: 'RX', name: 'Relax' },
    { acronym: 'MU', name: 'Muted' },
    { acronym: 'NS', name: 'No Scope' },
    { acronym: 'MR', name: 'Mirror' },
    { acronym: 'CL', name: 'Classic' },
    { acronym: 'DA', name: 'Difficulty Adjust' },
    { acronym: 'FF', name: 'Floating Fruits' },
    { acronym: 'MF', name: 'Moving Fast' },
    { acronym: 'WU', name: 'Wind Up' },
    { acronym: 'WD', name: 'Wind Down' },
  ],
  // osu!mania
  3: [
    { acronym: 'NF', name: 'No Fail' },
    { acronym: 'EZ', name: 'Easy' },
    { acronym: 'HT', name: 'Half Time' },
    { acronym: 'DC', name: 'Daycore' },
    { acronym: 'NR', name: 'No Release' },
    { acronym: 'HR', name: 'Hard Rock' },
    { acronym: 'SD', name: 'Sudden Death' },
    { acronym: 'PF', name: 'Perfect' },
    { acronym: 'HD', name: 'Hidden' },
    { acronym: 'FI', name: 'Fade In' },
    { acronym: 'CO', name: 'Cover' },
    { acronym: 'FL', name: 'Flashlight' },
    { acronym: 'DT', name: 'Double Time' },
    { acronym: 'NC', name: 'Nightcore' },
    { acronym: 'AC', name: 'Accuracy Challenge' },
    { acronym: 'MU', name: 'Muted' },
    { acronym: 'IN', name: 'Invert' },
    { acronym: 'MR', name: 'Mirror' },
    { acronym: 'RD', name: 'Random' },
    { acronym: 'DA', name: 'Difficulty Adjust' },
    { acronym: 'CL', name: 'Classic' },
    { acronym: 'CS', name: 'Constant Speed' },
    { acronym: 'DS', name: 'Dual Stages' },
    { acronym: 'HO', name: 'Hold Off' },
    { acronym: 'AS', name: 'Adaptive Speed' },
    { acronym: 'WU', name: 'Wind Up' },
    { acronym: 'WD', name: 'Wind Down' },
    { acronym: '1K', name: '1K' },
    { acronym: '2K', name: '2K' },
    { acronym: '3K', name: '3K' },
    { acronym: '4K', name: '4K' },
    { acronym: '5K', name: '5K' },
    { acronym: '6K', name: '6K' },
    { acronym: '7K', name: '7K' },
    { acronym: '8K', name: '8K' },
    { acronym: '9K', name: '9K' },
    { acronym: '10K', name: '10K' },
  ],
};

const AdminDailyChallenges: React.FC = () => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<DailyChallenge | null>(null);

  // Random-pick modal state. Two-stage flow: roll first, preview the
  // result, then confirm to persist (or roll again).
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomFilters, setRandomFilters] = useState({
    date: '',
    ruleset_id: 0,
    min_difficulty: '' as string,
    max_difficulty: '' as string,
  });
  const [randomPreview, setRandomPreview] = useState<Awaited<ReturnType<typeof adminAPI.pickRandomDailyChallenge>>['beatmap'] | null>(null);
  const [randomBusy, setRandomBusy] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    beatmap_id: '',
    ruleset_id: '0',
    required_mods: [] as string[],
    allowed_mods: [] as string[],
    max_attempts: '',
    time_limit: '',
  });

  // Mods available for the currently selected ruleset
  const availableMods = MODS_BY_RULESET[Number(formData.ruleset_id)] ?? MODS_BY_RULESET[0];

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.listDailyChallenges({ per_page: 50 });
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error('Failed to load daily challenges:', error);
      toast.error('Failed to load daily challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newChallenge = {
        date: formData.date,
        beatmap_id: Number(formData.beatmap_id),
        ruleset_id: Number(formData.ruleset_id),
        required_mods: JSON.stringify(formData.required_mods),
        allowed_mods: JSON.stringify(formData.allowed_mods),
        max_attempts: formData.max_attempts ? Number(formData.max_attempts) : undefined,
        time_limit: formData.time_limit ? Number(formData.time_limit) : undefined,
      };
      
      await adminAPI.createDailyChallenge(newChallenge);
      toast.success('Daily challenge created successfully');
      setShowCreateModal(false);
      loadChallenges();
    } catch (error: any) {
      console.error('Failed to create daily challenge:', error);
      toast.error(error?.response?.data?.detail || 'Failed to create daily challenge');
    }
  };

  // Normalise mods from the API response to a string[] of acronyms for the form.
  // The server stores mods as APIMod objects [{acronym: "HD"}, ...] but the
  // form only needs the acronym strings.
  const parseModsToAcronyms = (raw: string): string[] => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null && 'acronym' in item) {
          return (item as { acronym: string }).acronym;
        }
        return null;
      }).filter(Boolean) as string[];
    } catch {
      return [];
    }
  };

  const handleEdit = (challenge: DailyChallenge) => {
    const required_mods = parseModsToAcronyms(challenge.required_mods);
    const allowed_mods = parseModsToAcronyms(challenge.allowed_mods);

    setEditingChallenge(challenge);
    setFormData({
      date: challenge.date,
      beatmap_id: challenge.beatmap_id.toString(),
      ruleset_id: challenge.ruleset_id.toString(),
      required_mods,
      allowed_mods,
      max_attempts: challenge.max_attempts?.toString() || '',
      time_limit: challenge.time_limit?.toString() || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;

    try {
      const updatedData = {
        beatmap_id: Number(formData.beatmap_id),
        ruleset_id: Number(formData.ruleset_id),
        required_mods: JSON.stringify(formData.required_mods),
        allowed_mods: JSON.stringify(formData.allowed_mods),
        max_attempts: formData.max_attempts ? Number(formData.max_attempts) : undefined,
        time_limit: formData.time_limit ? Number(formData.time_limit) : undefined,
      };
      
      await adminAPI.updateDailyChallenge(editingChallenge.date, updatedData);
      toast.success('Daily challenge updated successfully');
      setEditingChallenge(null);
      loadChallenges();
    } catch (error: any) {
      console.error('Failed to update daily challenge:', error);
      toast.error(error?.response?.data?.detail || 'Failed to update daily challenge');
    }
  };

  const handleDelete = async (date: string) => {
    if (!confirm('Are you sure you want to delete this daily challenge?')) return;

    try {
      await adminAPI.deleteDailyChallenge(date);
      toast.success('Daily challenge deleted successfully');
      loadChallenges();
    } catch (error) {
      console.error('Failed to delete daily challenge:', error);
      toast.error('Failed to delete daily challenge');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingChallenge(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      beatmap_id: '',
      ruleset_id: '0',
      required_mods: [],
      allowed_mods: [],
      max_attempts: '',
      time_limit: '',
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Challenges</h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                setLoading(true);
                await adminAPI.triggerDailyChallenge();
                toast.success('Next daily challenge triggered');
                loadChallenges();
              } catch (error: any) {
                console.error('Failed to trigger daily challenge:', error);
                toast.error(error?.response?.data?.detail || 'Failed to trigger daily challenge');
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-600/90 transition-colors whitespace-nowrap"
          >
            Trigger Next
          </button>
          <button
            onClick={() => {
              setRandomPreview(null);
              setShowRandomModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
            title="Roll a random ranked beatmap and preview it before committing"
          >
            🎲 Random Pick
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 transition-colors whitespace-nowrap"
          >
            Add Daily Challenge
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {challenges.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              No daily challenges scheduled
            </div>
          ) : (
            challenges.map((challenge) => (
              <div
                key={challenge.date}
                className={`bg-card rounded-lg p-4 border ${
                  challenge.date === today 
                    ? 'border-osu-pink ring-1 ring-osu-pink/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`px-3 py-1 rounded text-sm font-bold ${
                      challenge.date === today 
                        ? 'bg-osu-pink text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {challenge.date}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {challenge.beatmap ? (
                          `${challenge.beatmap.artist} - ${challenge.beatmap.title} [${challenge.beatmap.version}]`
                        ) : (
                          `Beatmap ID: ${challenge.beatmap_id}`
                        )}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Ruleset: {challenge.ruleset_id === 0 ? 'osu!' : challenge.ruleset_id === 1 ? 'osu!taiko' : challenge.ruleset_id === 2 ? 'osu!catch' : 'osu!mania'}</span>
                        {(() => {
                          try {
                            const mods = JSON.parse(challenge.required_mods);
                            return mods.length > 0 && <span>Required: {mods.join(', ')}</span>;
                          } catch {
                            return challenge.required_mods !== '[]' && <span>Required: {challenge.required_mods}</span>;
                          }
                        })()}
                        {(() => {
                          try {
                            const mods = JSON.parse(challenge.allowed_mods);
                            return mods.length > 0 && <span>Allowed: {mods.join(', ')}</span>;
                          } catch {
                            return challenge.allowed_mods !== '[]' && <span>Allowed: {challenge.allowed_mods}</span>;
                          }
                        })()}
                        {challenge.max_attempts && <span>Max Attempts: {challenge.max_attempts}</span>}
                        {challenge.time_limit && <span>Time Limit: {challenge.time_limit}m</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(challenge)}
                      className="px-3 py-1.5 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(challenge.date)}
                      className="px-3 py-1.5 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AdminModal
        open={showCreateModal || !!editingChallenge}
        title={editingChallenge ? 'Edit Daily Challenge' : 'Add Daily Challenge'}
        onClose={closeModal}
        maxWidthClass="max-w-3xl"
      >
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingChallenge ? 'Edit Daily Challenge' : 'Add Daily Challenge'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
              </div>

              <form onSubmit={editingChallenge ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none"
                    required
                    disabled={!!editingChallenge}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Beatmap ID *
                    </label>
                    <input
                      type="number"
                      value={formData.beatmap_id}
                      onChange={(e) => setFormData({ ...formData, beatmap_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none"
                      required
                      placeholder="e.g. 123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Ruleset ID *
                    </label>
                    <select
                      value={formData.ruleset_id}
                      onChange={(e) => setFormData({ ...formData, ruleset_id: e.target.value, required_mods: [], allowed_mods: [] })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none"
                      required
                    >
                      <option value="0">osu!</option>
                      <option value="1">osu!taiko</option>
                      <option value="2">osu!catch</option>
                      <option value="3">osu!mania</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Required Mods
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto">
                    {availableMods.map((mod) => (
                      <label key={mod.acronym} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.required_mods.includes(mod.acronym)}
                          onChange={(e) => {
                            const newMods = e.target.checked
                              ? [...formData.required_mods, mod.acronym]
                              : formData.required_mods.filter(m => m !== mod.acronym);
                            setFormData({ ...formData, required_mods: newMods });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-osu-pink focus:ring-osu-pink"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                          {mod.acronym}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Allowed Mods
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto">
                    {availableMods.map((mod) => (
                      <label key={mod.acronym} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.allowed_mods.includes(mod.acronym)}
                          onChange={(e) => {
                            const newMods = e.target.checked
                              ? [...formData.allowed_mods, mod.acronym]
                              : formData.allowed_mods.filter(m => m !== mod.acronym);
                            setFormData({ ...formData, allowed_mods: newMods });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-osu-pink focus:ring-osu-pink"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                          {mod.acronym}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Max Attempts
                    </label>
                    <input
                      type="number"
                      value={formData.max_attempts}
                      onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Time Limit (mins)
                    </label>
                    <input
                      type="number"
                      value={formData.time_limit}
                      onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-osu-pink text-white rounded-xl hover:bg-osu-pink/90 shadow-lg shadow-osu-pink/20 transition-all font-medium"
                  >
                    {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
                  </button>
                </div>
              </form>
            </div>
      </AdminModal>

      {/*
        Random-pick modal. Two-stage flow:
          1. Pick filters (mode + optional star range + optional date)
             then click Roll. Server returns a beatmap preview (no DB
             write). Loops back here so admin can roll again or cancel.
          2. Click "Create with this beatmap" to re-call the endpoint
             with create_challenge=true and persist.
      */}
      <AdminModal
        open={showRandomModal}
        onClose={() => {
          setShowRandomModal(false);
          setRandomPreview(null);
        }}
        title="🎲 Random Pick"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-300">
            Roll a random ranked / approved / loved beatmap matching your filters. Preview the
            result before committing it as a daily challenge.
          </p>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-400">Date (optional)</span>
              <input
                type="date"
                value={randomFilters.date}
                onChange={(e) => setRandomFilters((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Ruleset</span>
              <select
                value={randomFilters.ruleset_id}
                onChange={(e) => setRandomFilters((f) => ({ ...f, ruleset_id: parseInt(e.target.value, 10) }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
              >
                <option value={0}>osu!</option>
                <option value={1}>Taiko</option>
                <option value={2}>Catch</option>
                <option value={3}>Mania</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Min ★</span>
              <input
                type="number"
                step="0.1"
                value={randomFilters.min_difficulty}
                onChange={(e) => setRandomFilters((f) => ({ ...f, min_difficulty: e.target.value }))}
                placeholder="any"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Max ★</span>
              <input
                type="number"
                step="0.1"
                value={randomFilters.max_difficulty}
                onChange={(e) => setRandomFilters((f) => ({ ...f, max_difficulty: e.target.value }))}
                placeholder="any"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm"
              />
            </label>
          </div>

          {/* Preview card */}
          {randomPreview && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
              <div className="text-xs uppercase text-emerald-300 tracking-wider">Rolled</div>
              <div className="font-semibold text-white">
                {randomPreview.artist} — {randomPreview.title}
              </div>
              <div className="text-sm text-gray-300">
                [{randomPreview.version}] · ★{randomPreview.difficulty_rating.toFixed(2)} · {randomPreview.mode}
                {' · '}id {randomPreview.beatmap_id}
              </div>
              {randomPreview.creator && (
                <div className="text-xs text-gray-400">mapped by {randomPreview.creator}</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={randomBusy}
              onClick={async () => {
                setRandomBusy(true);
                try {
                  const minD = randomFilters.min_difficulty.trim();
                  const maxD = randomFilters.max_difficulty.trim();
                  const result = await adminAPI.pickRandomDailyChallenge({
                    date: randomFilters.date || undefined,
                    ruleset_id: randomFilters.ruleset_id,
                    min_difficulty: minD === '' ? null : Number(minD),
                    max_difficulty: maxD === '' ? null : Number(maxD),
                    create_challenge: false,
                  });
                  setRandomPreview(result.beatmap);
                } catch (error: any) {
                  toast.error(error?.response?.data?.detail || 'Failed to roll random beatmap');
                } finally {
                  setRandomBusy(false);
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
            >
              {randomPreview ? 'Roll again' : 'Roll'}
            </button>
            {randomPreview && (
              <button
                type="button"
                disabled={randomBusy}
                onClick={async () => {
                  setRandomBusy(true);
                  try {
                    const minD = randomFilters.min_difficulty.trim();
                    const maxD = randomFilters.max_difficulty.trim();
                    const result = await adminAPI.pickRandomDailyChallenge({
                      date: randomFilters.date || undefined,
                      ruleset_id: randomFilters.ruleset_id,
                      min_difficulty: minD === '' ? null : Number(minD),
                      max_difficulty: maxD === '' ? null : Number(maxD),
                      create_challenge: true,
                    });
                    toast.success(`Daily challenge created for ${result.date || 'today'}`);
                    setShowRandomModal(false);
                    setRandomPreview(null);
                    loadChallenges();
                  } catch (error: any) {
                    toast.error(error?.response?.data?.detail || 'Failed to create challenge');
                  } finally {
                    setRandomBusy(false);
                  }
                }}
                className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Create with this beatmap
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowRandomModal(false);
                setRandomPreview(null);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminDailyChallenges;
