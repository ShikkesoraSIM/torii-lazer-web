import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { friendsAPI, handleApiError } from '../utils/api';

export type FriendStatus = {
  isFriend: boolean;
  isBlocked: boolean;
  isMutual: boolean;
  followsMe: boolean;
  loading: boolean;
  isSelf: boolean;
};

export function useFriendRelationship(targetUserId: number, selfUserId: number) {
  const mountedRef = useRef(true);

  // Validate params
  const isValidUserId = (id: any): id is number => {
    return typeof id === 'number' && !isNaN(id) && id > 0;
  };
  
  if (!isValidUserId(targetUserId)) {
    console.error('Invalid targetUserId:', targetUserId);
  }
  
  if (!isValidUserId(selfUserId)) {
    console.error('Invalid selfUserId:', selfUserId);
  }
  
  const [status, setStatus] = useState<FriendStatus>({
    isFriend: false,
    isBlocked: false,
    isMutual: false,
    followsMe: false,
    loading: true, // always start loading; let the API decide
    isSelf: false, // assume not self until the API tells us
  });

  const refresh = useCallback(async () => {
    // Bail out if targetUserId is invalid
    if (!isValidUserId(targetUserId)) {
      console.error('Cannot make API call with invalid targetUserId:', targetUserId);
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    // Bail out if selfUserId is invalid
    if (!isValidUserId(selfUserId)) {
      console.error('Cannot make API call with invalid selfUserId:', selfUserId);
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, loading: true }));

      const res = await friendsAPI.checkRelationship(targetUserId);

      if (!mountedRef.current) return;

      // Map API response fields onto component state
      setStatus({
        isFriend: !!res?.is_following,    // whether I follow them
        isBlocked: !!res?.isBlocked,      // whether blocked (API may omit this field)
        isMutual: !!res?.mutual,          // whether mutually following
        followsMe: !!res?.is_followed,    // whether they follow me
        loading: false,
        isSelf: false,
      });
    } catch (err: any) {
      // Detect the "cannot check relationship with yourself" error
      const errorMessage = err?.response?.data?.message || err?.message || '';
      const isSelfError = errorMessage.includes('Cannot check relationship with yourself') || 
                         errorMessage.includes('yourself') ||
                         (err?.response?.status === 422 && errorMessage.includes('relationship'));
      
      if (isSelfError) {
        if (mountedRef.current) {
          setStatus({
            isFriend: false,
            isBlocked: false,
            isMutual: false,
            followsMe: false,
            loading: false,
            isSelf: true,
          });
        }
        return; // don't show an error toast; this is expected
      }

      // Handle all other errors normally
      console.error('Real API error:', {
        targetUserId,
        selfUserId,
        errorMessage,
        status: err?.response?.status
      });
      
      if (mountedRef.current) {
        setStatus(prev => ({ ...prev, loading: false }));
      }
      handleApiError(err);
    }
  }, [targetUserId, selfUserId]);

  useEffect(() => {
    mountedRef.current = true;

    // Always try the request and let the backend decide if it's self
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [targetUserId, selfUserId, refresh]);

  const currentIsSelf = status.isSelf;

  // Optimistic-update helper
  const withOptimisticUpdate = useCallback((
    updater: (prev: FriendStatus) => FriendStatus,
    action: () => Promise<any>,
    okMsg?: string
  ) => {
    const prev = status;
    const optimistic = updater(prev);
    setStatus(optimistic);

    return action()
      .then(() => {
        if (okMsg) toast.success(okMsg);
        return refresh();
      })
      .catch((err) => {
        setStatus(prev);
        handleApiError(err);
      });
  }, [status, refresh]);

  // Action helpers
  const add = useCallback(() => {
    if (currentIsSelf) {
      return Promise.resolve();
    }

    if (!isValidUserId(targetUserId)) {
      console.error('Cannot add friend - invalid targetUserId:', targetUserId);
      toast.error('Invalid user ID');
      return Promise.reject(new Error('Invalid targetUserId'));
    }

    return withOptimisticUpdate(
      (s) => ({ ...s, isFriend: true }),
      () => friendsAPI.addFriend(targetUserId),
      'Now following this user'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);

  const remove = useCallback(() => {
    if (currentIsSelf) return Promise.resolve();

    return withOptimisticUpdate(
      (s) => ({ ...s, isFriend: false, isMutual: false }),
      () => friendsAPI.removeFriend(targetUserId),
      'Unfollowed'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);

  const block = useCallback(() => {
    if (currentIsSelf) return Promise.resolve();

    return withOptimisticUpdate(
      (s) => ({ ...s, isBlocked: true, isFriend: false, isMutual: false }),
      () => friendsAPI.blockUser(targetUserId),
      'User blocked'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);

  const unblock = useCallback(() => {
    if (currentIsSelf) return Promise.resolve();

    return withOptimisticUpdate(
      (s) => ({ ...s, isBlocked: false }),
      () => friendsAPI.unblockUser(targetUserId),
      'User unblocked'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);
  return {
    status,
    isSelf: currentIsSelf,
    refresh,
    add,
    remove,
    block,
    unblock,
  };
}