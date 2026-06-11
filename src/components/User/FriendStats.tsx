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
    isSelf,
    add,
    remove,
    block,
    unblock,
  } = useFriendRelationship(user.id ?? 0, resolvedSelfId ?? 0);

  // Show a loading state when there's no valid user ID
  if (!resolvedSelfId || !user?.id) {
    console.log('Missing user IDs:', { resolvedSelfId, userId: user?.id });
    return (
      <div className="flex gap-3">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span>Loading...</span>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-full flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 friend-button-shadow">
          <FaBell className="w-4 h-4" />
          <span>{user.unread_pm_count ?? 0}</span>
        </div>
      </div>
    );
  }

  // Prefer the direct comparison; fall back to the hook only when it's unclear
  const finalIsSelf = isCurrentUserSelf;

  console.log('FriendStats debug:', { 
    resolvedSelfId, 
    userId: user.id, 
    isCurrentUserSelf, 
    hookIsSelf: isSelf,
    finalIsSelf,
    status 
  });

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
      <div className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-full flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 friend-button-shadow">
        <FaBell className="w-4 h-4" />
        <span>{user.unread_pm_count ?? 0}</span>
      </div>
    </div>
  );
}
