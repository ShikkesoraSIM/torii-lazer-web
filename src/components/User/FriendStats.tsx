import { FaBell } from "react-icons/fa";
import FriendActions from "./FriendActions";
import { useFriendRelationship } from "../../hooks/useFriendRelationship";
import { useAuth } from "../../contexts/AuthContext";
type User = { id: number; follower_count?: number; unread_pm_count?: number };

export default function FriendStats({ user, selfId }: { user: User; selfId?: number }) {
  const { user: self } = useAuth();
  const resolvedSelfId = selfId ?? self?.id;

  // Direct check for whether this is the current user
  const isCurrentUserSelf = resolvedSelfId === user.id;

  // Always call the hook (per the Rules of Hooks), even if the args may be invalid
  const {
    status,
    add,
    remove,
    block,
    unblock,
  } = useFriendRelationship(user.id ?? 0, resolvedSelfId ?? 0);

  // Signed-out visitors don't have a viewer-to-target relationship to fetch;
  // render a static follower summary instead of an endless "Loading..." pill.
  if (!resolvedSelfId || !user?.id) {
    return (
      <div className="flex gap-3">
        <div className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-sm text-text-secondary">
          <span>{user.follower_count ?? 0} followers</span>
        </div>
      </div>
    );
  }

  const finalIsSelf = isCurrentUserSelf;

  return (
    <div className="flex gap-3 relative">
      <FriendActions
        status={status}
        onAdd={add}
        onRemove={remove}
        onBlock={block}
        onUnblock={unblock}
        followerCount={user.follower_count ?? 0}
        isSelf={finalIsSelf}
      />
      <div className="torii-btn-glass !px-4 !py-2 rounded-full flex items-center gap-2 text-sm">
        <FaBell className="w-4 h-4" />
        <span>{user.unread_pm_count ?? 0}</span>
      </div>
    </div>
  );
}
