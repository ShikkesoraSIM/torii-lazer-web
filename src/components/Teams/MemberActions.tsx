import React, { useState, useEffect } from 'react';
import { FiUserX, FiMoreHorizontal } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { teamsAPI, handleApiError } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import toast from 'react-hot-toast';
import type { User, Team } from '../../types';

interface Props {
  member: User;
  team: Team;
  onMemberRemoved?: () => void;
}

const MemberActions: React.FC<Props> = ({ member, team, onMemberRemoved }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLeader = user?.id === team.leader_id;
  const isTargetLeader = member.id === team.leader_id;
  const canKick = isLeader && !isTargetLeader && user?.id !== member.id;

  useEffect(() => {
    if (!showActions) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowActions(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showActions]);

  // Kick a member
  const confirmKickMember = async () => {
    setShowKickConfirm(false);
    setIsSubmitting(true);
    try {
      await teamsAPI.removeMember(team.id, member.id);
      toast.success(t('teams.detail.memberKicked', { username: member.username }));
      onMemberRemoved?.();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
      setShowActions(false);
    }
  };

  if (!canKick) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowActions(!showActions)}
        aria-label={t('teams.detail.memberActions', 'Member actions')}
        aria-expanded={showActions}
        className="p-1.5 text-gray-400 hover:text-gray-200 rounded transition-colors"
      >
        <FiMoreHorizontal className="w-4 h-4" />
      </button>

      {showActions && (
        <>
          <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-white/15 rounded-lg shadow-lg z-50">
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setShowActions(false);
                  setShowKickConfirm(true);
                }}
                disabled={isSubmitting}
                className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50"
              >
                <FiUserX className="mr-2 w-3.5 h-3.5" />
                {isSubmitting ? t('teams.detail.kicking') : t('teams.detail.kickMember')}
              </button>
            </div>
          </div>

          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowActions(false)}
          />
        </>
      )}

      <ConfirmationDialog
        isOpen={showKickConfirm}
        onCancel={() => setShowKickConfirm(false)}
        onConfirm={() => void confirmKickMember()}
        title={t('teams.detail.kickMember', 'Kick Member')}
        message={t('teams.detail.confirmKick', { username: member.username })}
        confirmLabel={t('teams.detail.kickMember', 'Kick')}
        cancelLabel={t('common.cancel', 'Cancel')}
        isDanger
      />
    </div>
  );
};

export default MemberActions;
