import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminAPI } from '../../utils/api';

const AdminBeatmapRankstatus: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [beatmap, setBeatmap] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const b = await adminAPI.getBeatmap(id);
        setBeatmap(b);
        setNewStatus(b?.rank_status ?? b?.status ?? '');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleUpdate = async () => {
    if (!id) return;
    try {
      await adminAPI.updateRankStatus(id, newStatus);
      alert('Rank status updated');
    } catch (e) {
      console.error(e);
      alert('Failed to update');
    }
  };

  const handleBan = async () => {
    if (!id) return;
    try {
      await adminAPI.banBeatmap(id);
      alert('Beatmap imported to banned list');
    } catch (e) {
      console.error(e);
      alert('Failed to ban');
    }
  };

  if (!id) return <div className="p-6">No beatmap selected</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Beatmap {id}</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
          <div className="mb-3">
            <div className="font-medium">{beatmap?.title || beatmap?.name || 'Unknown'}</div>
            <div className="text-xs text-slate-500">set: {beatmap?.set_id ?? beatmap?.beatmapset_id}</div>
            <div className="text-xs text-slate-500">status: {beatmap?.rank_status ?? beatmap?.status}</div>
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-1">New Rank Status</label>
            <input value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="form-input" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleUpdate} className="px-4 py-2 bg-osu-pink text-white rounded">Update</button>
            <button onClick={handleBan} className="px-4 py-2 bg-red-600 text-white rounded">Import to banned</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBeatmapRankstatus;
