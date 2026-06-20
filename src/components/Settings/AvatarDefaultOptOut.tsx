import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { preferencesAPI } from '../../utils/api';

// Self-contained toggle shown in the Avatar settings card ONLY when the user is
// on a default avatar. Off = a randomly-assigned avatar from the AI-made set;
// On = the plain Torii logo. Persists to user_preference.extra; the server
// resolves which default to show.
interface Props {
  onChanged?: () => void;
}

const AvatarDefaultOptOut: React.FC<Props> = ({ onChanged }) => {
  const { t } = useTranslation();
  const [extra, setExtra] = useState<Record<string, any>>({});
  const [useLogo, setUseLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prefs = await preferencesAPI.getPreferences();
        const ex = ((prefs?.extra as Record<string, any>) ?? {});
        if (active) {
          setExtra(ex);
          setUseLogo(Boolean(ex.default_avatar_use_logo));
        }
      } catch {
        // silent: a missing/failed preference just leaves the toggle off
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onToggle = async (checked: boolean) => {
    setSaving(true);
    setUseLogo(checked);
    try {
      const nextExtra = { ...extra, default_avatar_use_logo: checked };
      await preferencesAPI.updatePreferences({ extra: nextExtra });
      setExtra(nextExtra);
      toast.success(t('settings.preferences.saveSuccess'));
      onChanged?.();
    } catch {
      setUseLogo(!checked);
      toast.error(t('settings.preferences.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('settings.preferences.profile.defaultAvatarPlain')}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('settings.preferences.profile.defaultAvatarPlainDescription')}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={useLogo}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={saving}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-osu-pink/20 dark:peer-focus:ring-osu-pink/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-osu-pink peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
      </label>
    </div>
  );
};

export default AvatarDefaultOptOut;
