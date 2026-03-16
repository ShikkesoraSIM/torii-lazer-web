import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaSave, FaTimes } from 'react-icons/fa';

import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types';
import { userAPI } from '../../utils/api';
import BBCodeEditor from './BBCodeEditor';

interface UserPageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updatedUser: User) => void;
}

interface UserPageDraftPayload {
  content: string;
  updatedAt: number;
}

const normaliseText = (value: string): string => value.replace(/\r\n/g, '\n');

const getDraftStorageKey = (userId: number): string => `userpage_draft_${userId}`;

const readDraftContent = (raw: string | null): string | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as string | UserPageDraftPayload;
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed.content === 'string') return parsed.content;
  } catch {
    return raw;
  }

  return null;
};

const UserPageEditModal: React.FC<UserPageEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);
  const [mouseDownTime, setMouseDownTime] = useState<number>(0);
  const [mouseDownPosition, setMouseDownPosition] = useState<{ x: number; y: number } | null>(null);

  const canEdit = currentUser?.id === user.id;
  const hasUnsavedChanges = normaliseText(content) !== normaliseText(initialContent);
  const draftStorageKey = useMemo(() => getDraftStorageKey(user.id), [user.id]);

  const requestClose = useCallback((): boolean => {
    if (hasUnsavedChanges && !isSaving) {
      const shouldClose = window.confirm(t('profile.userPage.confirmDiscard'));
      if (!shouldClose) return false;
    }

    onClose();
    return true;
  }, [hasUnsavedChanges, isSaving, onClose, t]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
      return;
    }

    const baseContent = user.page?.raw || '';
    const draft = readDraftContent(localStorage.getItem(draftStorageKey));
    const restoredFromDraft =
      !!draft && normaliseText(draft) !== normaliseText(baseContent);

    setContent(restoredFromDraft ? draft : baseContent);
    setInitialContent(baseContent);
    setSaveError(null);
    setInfoMessage(
      restoredFromDraft
        ? t('profile.userPage.draftRestored', {
            defaultValue: 'Recovered your unsaved draft from a previous session.',
          })
        : null,
    );

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      requestClose();
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, user.page?.raw, draftStorageKey, t, requestClose]);

  useEffect(() => {
    if (!isOpen || !canEdit) return;

    const timer = window.setTimeout(() => {
      try {
        if (!hasUnsavedChanges || !content.trim()) {
          localStorage.removeItem(draftStorageKey);
          return;
        }

        const payload: UserPageDraftPayload = {
          content,
          updatedAt: Date.now(),
        };

        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      } catch (error) {
        console.warn('Failed to persist user page draft:', error);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, canEdit, hasUnsavedChanges, content, draftStorageKey]);

  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges || isSaving) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, hasUnsavedChanges, isSaving]);

  const handleSave = async () => {
    if (!canEdit || !currentUser || currentUser.id !== user.id) return;

    setIsSaving(true);
    setSaveError(null);
    setInfoMessage(null);

    try {
      await userAPI.updateUserPage(currentUser.id, content);

      // Verify canonical persisted state from backend before claiming success.
      const latestUser = await userAPI.getMe();
      const persistedRaw = normaliseText(latestUser?.page?.raw || '');
      const submittedRaw = normaliseText(content);

      if (persistedRaw !== submittedRaw) {
        setSaveError(
          t('profile.userPage.saveVerificationFailed', {
            defaultValue:
              'Save response was received, but verification failed. Your draft is still kept. Please try saving again.',
          }),
        );
        return;
      }

      localStorage.removeItem(draftStorageKey);
      setInitialContent(content);
      setInfoMessage(t('profile.userPage.saveSuccess'));
      onSave(latestUser);
      onClose();
    } catch (error: any) {
      console.error('Failed to save user page:', error);
      const backendError =
        error?.response?.data?.detail?.error ||
        error?.response?.data?.error ||
        error?.message ||
        t('profile.userPage.saveError');
      setSaveError(backendError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    requestClose();
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleModalContentMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleModalContentMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    setMouseDownTarget(e.target);
    setMouseDownTime(Date.now());
    setMouseDownPosition({ x: e.clientX, y: e.clientY });
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    const timeDiff = Date.now() - mouseDownTime;
    const isQuickClick = timeDiff < 200;

    const distance = mouseDownPosition
      ? Math.sqrt(
          Math.pow(e.clientX - mouseDownPosition.x, 2) +
            Math.pow(e.clientY - mouseDownPosition.y, 2),
        )
      : 0;

    const isStationary = distance < 5;

    if (
      e.target === e.currentTarget &&
      mouseDownTarget === e.target &&
      (isQuickClick || isStationary)
    ) {
      requestClose();
    }

    setMouseDownTarget(null);
    setMouseDownTime(0);
    setMouseDownPosition(null);
  };

  if (!isOpen) return null;
  if (!portalTarget) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-[2px] flex items-start md:items-center justify-center p-2 md:p-4 overflow-y-auto"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-7xl max-h-[calc(100dvh-1rem)] md:max-h-[calc(100dvh-2rem)] min-h-0 overflow-hidden flex flex-col my-2 md:my-auto ring-1 ring-white/10"
        onClick={handleModalContentClick}
        onMouseDown={handleModalContentMouseDown}
        onMouseUp={handleModalContentMouseUp}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('profile.userPage.editTitle')}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
          <BBCodeEditor
            title={t('profile.userPage.title')}
            value={content}
            onChange={(nextContent) => {
              setContent(nextContent);
              setSaveError(null);
            }}
            placeholder={t('profile.userPage.placeholder')}
            className="min-h-0"
          />

          {(saveError || infoMessage) && (
            <div className="mt-4 space-y-2">
              {saveError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {saveError}
                </div>
              )}
              {infoMessage && !saveError && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {infoMessage}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-card/95 supports-[backdrop-filter]:bg-card/80 backdrop-blur">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
          >
            {t('profile.userPage.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges || content.length > 60000}
            className="flex items-center gap-2 px-6 py-2 bg-osu-pink hover:opacity-90 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('profile.userPage.saving')}
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4" />
                {t('profile.userPage.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalTarget);
};

export default UserPageEditModal;
