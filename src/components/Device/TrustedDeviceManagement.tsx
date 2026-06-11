import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMonitor, FiSmartphone, FiTablet, FiTrash2, FiClock, FiMapPin, FiGlobe } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { deviceAPI } from '../../utils/api';
import type { TrustedDevice, TrustedDevicesResponse } from '../../types/device';
import RemoveDeviceModal from './RemoveDeviceModal';

interface TrustedDeviceManagementProps {
  className?: string;
}

const TrustedDeviceManagement: React.FC<TrustedDeviceManagementProps> = ({ className = '' }) => {
  const { t, i18n } = useTranslation();
  const [devicesData, setDevicesData] = useState<TrustedDevicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [removingDeviceId, setRemovingDeviceId] = useState<number | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<TrustedDevice | null>(null);

  // Fetch the list of trusted devices
  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const data = await deviceAPI.getTrustedDevices();
      setDevicesData(data);
    } catch (error) {
      console.error('Failed to fetch trusted devices:', error);
      toast.error(t('settings.device.trustedDevices.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Open the remove-device modal
  const handleShowRemoveModal = (device: TrustedDevice) => {
    setDeviceToRemove(device);
    setShowRemoveModal(true);
  };

  // Close the remove-device modal
  const handleCloseRemoveModal = () => {
    if (removingDeviceId) return;
    setShowRemoveModal(false);
    setDeviceToRemove(null);
  };

  // Confirm removing the device
  const handleConfirmRemove = async () => {
    if (!deviceToRemove || removingDeviceId) return;

    try {
      setRemovingDeviceId(deviceToRemove.id);
      await deviceAPI.removeTrustedDevice(deviceToRemove.id);
      toast.success(t('settings.device.trustedDevices.removeSuccess'));

      // Close the modal
      setShowRemoveModal(false);
      setDeviceToRemove(null);

      // Re-fetch the list of devices
      await fetchDevices();
    } catch (error) {
      console.error('Failed to remove device:', error);
      toast.error(t('settings.device.trustedDevices.removeError'));
    } finally {
      setRemovingDeviceId(null);
    }
  };

  // Get the device-type icon
  const getDeviceIcon = (device: TrustedDevice) => {
    const { user_agent_info, client_type } = device;
    
    if (client_type === 'mobile' || user_agent_info.is_mobile) {
      return <FiSmartphone className="w-5 h-5" />;
    } else if (user_agent_info.is_tablet) {
      return <FiTablet className="w-5 h-5" />;
    } else {
      return <FiMonitor className="w-5 h-5" />;
    }
  };

  // Get the device display name
  const getDeviceDisplayName = (device: TrustedDevice) => {
    const { user_agent_info, client_type } = device;
    
    if (client_type === 'desktop' || user_agent_info.is_client) {
      return 'osu!lazer';
    }
    
    if (user_agent_info.browser && user_agent_info.browser !== 'Unknown') {
      return `${user_agent_info.browser}${user_agent_info.version ? ` ${user_agent_info.version}` : ''}`;
    }
    
    return t('settings.device.browsers.unknown');
  };

  // Get the client-type name
  const getClientTypeName = (device: TrustedDevice) => {
    const { client_type } = device;
    
    switch (client_type) {
      case 'web':
        return t('settings.device.trustedDevices.clientTypes.web');
      case 'mobile':
        return t('settings.device.trustedDevices.clientTypes.mobile');
      case 'desktop':
        return t('settings.device.trustedDevices.clientTypes.desktop');
      default:
        return t('settings.device.deviceTypes.unknown');
    }
  };

  // Format the location info
  const formatLocation = (device: TrustedDevice) => {
    const { location } = device;
    
    if (!location.country && !location.city) {
      return t('settings.device.sessions.localhost');
    }
    
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    
    return parts.join(', ') || t('settings.device.sessions.localhost');
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

  // Determine whether this is the current device
  const isCurrentDevice = (device: TrustedDevice) => {
    return devicesData?.current === device.id;
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('settings.device.trustedDevices.title')}
        </h3>
        {devicesData && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('settings.device.trustedDevices.totalDevices', { count: devicesData.total })}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-osu-pink"></div>
          <span className="ml-3 text-gray-500 dark:text-gray-400">
            {t('settings.device.trustedDevices.loading')}
          </span>
        </div>
      ) : !devicesData || devicesData.devices.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-gray-500 dark:text-gray-400">
            {t('settings.device.trustedDevices.noDevices')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devicesData.devices
            .sort((a, b) => {
              // Current device first
              if (isCurrentDevice(a) && !isCurrentDevice(b)) return -1;
              if (!isCurrentDevice(a) && isCurrentDevice(b)) return 1;
              // Otherwise sort by last-used time (newest first)
              return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
            })
            .map((device, index) => {
              const isCurrent = isCurrentDevice(device);
              
              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isCurrent
                      ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      isCurrent
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {getDeviceIcon(device)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {getDeviceDisplayName(device)}
                        </h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                            {t('settings.device.trustedDevices.current')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <FiGlobe className="w-3 h-3" />
                          <span>{getClientTypeName(device)}</span>
                        </div>
                        {device.user_agent_info.os && (
                          <>
                            <span>•</span>
                            <span>{device.user_agent_info.os}</span>
                          </>
                        )}
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <FiMapPin className="w-3 h-3" />
                          <span>{formatLocation(device)}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          <span>{formatDate(device.last_used_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!isCurrent && (
                    <button
                      onClick={() => handleShowRemoveModal(device)}
                      disabled={removingDeviceId === device.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-3"
                    >
                      {removingDeviceId === device.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <FiTrash2 className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{t('settings.device.trustedDevices.remove')}</span>
                    </button>
                  )}
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Remove-device confirmation modal */}
      {deviceToRemove && (
        <RemoveDeviceModal
          isOpen={showRemoveModal}
          isRemoving={removingDeviceId === deviceToRemove.id}
          deviceName={getDeviceDisplayName(deviceToRemove)}
          onClose={handleCloseRemoveModal}
          onConfirm={handleConfirmRemove}
          title={t('settings.device.trustedDevices.removeTitle')}
          confirmText={t('settings.device.trustedDevices.remove')}
          warningText={t('settings.device.trustedDevices.removeWarning')}
        />
      )}
    </div>
  );
};

export default TrustedDeviceManagement;

