import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMonitor, FiSmartphone, FiTablet, FiTrash2, FiClock } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { deviceAPI } from '../../utils/api';
import type { DeviceSession } from '../../types/device';
import RevokeSessionModal from './RevokeSessionModal';

const DeviceManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<number | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<DeviceSession | null>(null);

  // Fetch the list of device sessions
  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const sessionsData = await deviceAPI.getSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to fetch device sessions:', error);
      toast.error(t('settings.device.sessions.loadError', 'Failed to load sessions'));
    } finally {
      setIsLoadingSessions(false);
    }
  };


  // Open the revoke-session modal
  const handleShowRevokeModal = (session: DeviceSession) => {
    setSessionToRevoke(session);
    setShowRevokeModal(true);
  };

  // Close the revoke-session modal
  const handleCloseRevokeModal = () => {
    if (revokingSessionId) return; // don't allow closing while a revoke is in progress
    setShowRevokeModal(false);
    setSessionToRevoke(null);
  };

  // Confirm revoking the session
  const handleConfirmRevoke = async () => {
    if (!sessionToRevoke) return;

    try {
      setRevokingSessionId(sessionToRevoke.id);
      await deviceAPI.revokeSession(sessionToRevoke.id);
      toast.success(t('settings.device.sessions.revokeSuccess'));

      // Close the modal
      setShowRevokeModal(false);
      setSessionToRevoke(null);

      // Re-fetch the list of sessions
      await fetchSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast.error(t('settings.device.sessions.revokeError'));
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Get the device-type icon
  const getDeviceIcon = (deviceType: string) => {
    const type = deviceType.toLowerCase();
    if (type.includes('mobile') || type.includes('phone')) {
      return <FiSmartphone className="w-5 h-5" />;
    } else if (type.includes('tablet') || type.includes('ipad')) {
      return <FiTablet className="w-5 h-5" />;
    } else {
      return <FiMonitor className="w-5 h-5" />;
    }
  };

  // Get the device-type display name
  const getDeviceTypeName = (session: DeviceSession) => {
    // If it's the osu!lazer client, show it as a desktop app
    if (session.user_agent === 'osu!' || session.user_agent.toLowerCase().includes('osu!')) {
      return t('settings.device.deviceTypes.app');
    }

    const type = session.device_type.toLowerCase();
    if (type === 'osu_web') {
      return 'Web browser';
    } else if (type.includes('mobile') || type.includes('phone')) {
      return t('settings.device.deviceTypes.mobile');
    } else if (type.includes('tablet') || type.includes('ipad')) {
      return t('settings.device.deviceTypes.tablet');
    } else if (type.includes('desktop') || type.includes('computer')) {
      return t('settings.device.deviceTypes.desktop');
    } else {
      return t('settings.device.deviceTypes.unknown');
    }
  };

  // Get the client display name
  const getClientDisplayName = (session: DeviceSession) => {
    // Check whether it's the osu!lazer client
    if (session.user_agent === 'osu!' || session.user_agent.toLowerCase().includes('osu!')) {
      return 'osu!lazer';
    }

    // Prefer a custom display name if present
    if (session.client_display_name && session.client_display_name !== 'osu! web') {
      return session.client_display_name;
    }

    // Otherwise return a name based on the device type
    if (session.device_type === 'osu_web') {
      return 'osu! web';
    }

    // Otherwise derive the browser name from the user agent
    const ua = session.user_agent.toLowerCase();
    if (ua.includes('edge')) {
      return 'Microsoft Edge';
    } else if (ua.includes('chrome') && !ua.includes('edge')) {
      return 'Google Chrome';
    } else if (ua.includes('firefox')) {
      return 'Mozilla Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      return 'Safari';
    } else if (ua.includes('opera')) {
      return 'Opera';
    } else {
      return t('settings.device.browsers.unknown');
    }
  };

  // Format the date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch data on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div>
      {/* Active sessions list */}
      <div>

        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-osu-pink"></div>
            <span className="ml-3 text-gray-500 dark:text-gray-400">
              {t('settings.device.sessions.loading')}
            </span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-gray-500 dark:text-gray-400">
              {t('settings.device.sessions.noSessions')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions
              .sort((a, b) => {
                // Current device first
                if (a.is_current && !b.is_current) return -1;
                if (!a.is_current && b.is_current) return 1;
                // Otherwise sort by last-used time (newest first)
                return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
              })
              .map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  session.is_current
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    session.is_current
                      ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    {getDeviceIcon(session.device_type)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {getClientDisplayName(session)}
                      </h4>
                      {session.is_current && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                          {t('settings.device.sessions.current')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>{getDeviceTypeName(session)}</span>
                      {session.location && !session.location.startsWith('IP:') && (
                        <>
                          <span>•</span>
                          <span>{session.location}</span>
                        </>
                      )}
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        <span>{formatDate(session.last_used_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!session.is_current && (
                  <button
                    onClick={() => handleShowRevokeModal(session)}
                    disabled={revokingSessionId === session.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {revokingSessionId === session.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <FiTrash2 className="w-4 h-4" />
                    )}
                    <span>{t('settings.device.sessions.revoke')}</span>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Revoke-session confirmation modal */}
      <RevokeSessionModal
        isOpen={showRevokeModal}
        session={sessionToRevoke}
        isRevoking={revokingSessionId === sessionToRevoke?.id}
        onClose={handleCloseRevokeModal}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
};

export default DeviceManagement;
