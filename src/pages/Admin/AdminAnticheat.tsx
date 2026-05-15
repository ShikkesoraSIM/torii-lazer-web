import React, { useState } from 'react';
import AdminAnticheatAlerts from './AdminAnticheatAlerts';
import AdminAnticheatReplays from './AdminAnticheatReplays';

type SubTab = 'alerts' | 'replays';

const AdminAnticheat: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('alerts');

  const tabButton = (id: SubTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setSubTab(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        subTab === id
          ? 'border-osu-pink text-osu-pink'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="border-b border-card flex items-center gap-1">
        {tabButton('alerts', 'Alerts & user inspector')}
        {tabButton('replays', 'Replay browser')}
      </div>
      <div>
        {subTab === 'alerts' && <AdminAnticheatAlerts />}
        {subTab === 'replays' && <AdminAnticheatReplays />}
      </div>
    </div>
  );
};

export default AdminAnticheat;
