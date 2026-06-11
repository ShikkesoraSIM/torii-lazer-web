import React, { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  FiUserPlus,
  FiShield,
  FiShieldOff,
  FiHeart,
  FiLoader,
  FiUsers,
  FiUser,
  FiUserCheck,
  FiUserMinus,
} from "react-icons/fi";
import { FaUserFriends } from "react-icons/fa";
import { motion } from "framer-motion";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
} from "@floating-ui/react";

/** ===================== Type definitions ===================== */
export type FriendshipStatus = {
  isFriend: boolean;
  isBlocked: boolean;
  isMutual: boolean;
  followsMe: boolean;
  loading: boolean;
};

interface FriendActionsProps {
  status: FriendshipStatus;
  onAdd: () => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  onBlock: () => void | Promise<void>;
  onUnblock: () => void | Promise<void>;
  followerCount?: number;
  className?: string;
  /** Whether this is the current user (when true, all actions are disabled) */
  isSelf?: boolean;
}

type MenuItemType = {
  key: string;
  label: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  className?: string;
};

/** ===================== Main component ===================== */
const FriendActions: React.FC<FriendActionsProps> = ({
  status,
  onAdd,
  onRemove,
  onBlock,
  onUnblock,
  followerCount = 0,
  className = "",
  isSelf = false,
}) => {
  const { t } = useTranslation();
  const { isFriend, isBlocked, isMutual, followsMe, loading } = status;
  const [isOpen, setIsOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Floating UI config
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && !isActionLoading, // don't open the menu while an action is running
    onOpenChange: (open) => {
      if (!isActionLoading) { // only allow state changes when no action is in progress
        setIsOpen(open);
      }
    },
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [
      offset({ mainAxis: 12, crossAxis: 0 }), // larger main-axis offset to keep it below
      flip({
        fallbackAxisSideDirection: "start",
        padding: 5,
      }),
      shift({
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // Menu config for osu!'s one-way friend system
  const menuItems: MenuItemType[] = useMemo(() => {
    if (isSelf) return [];

    // Blocked state
    if (isBlocked) {
      return [
        {
          key: "unblock",
          label: t('profile.friendActions.unblock'),
          icon: (
            <span className="relative flex items-center justify-center w-4 h-4">
              <FiShieldOff className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
            </span>
          ),
          action: onUnblock,
          className: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 font-medium",
        },
      ];
    }
    
    // Following state (you follow them)
    if (isFriend) {
      const items = [
        {
          key: "remove",
          label: isMutual ? t('profile.friendActions.cancelMutualFollow') : t('profile.friendActions.unfollow'),
          icon: (
            <span className="relative flex items-center justify-center w-4 h-4">
              {isMutual ? (
                // Mutual follow - two-person icon + heart
                <>
                  <FiUsers className="w-4 h-4 text-profile-color" />
                  <FiHeart className="absolute -top-0.5 -right-0.5 w-2 h-2 text-profile-color fill-current" />
                </>
              ) : (
                // One-way follow - user icon + minus
                <>
                  <FiUser className="w-4 h-4" />
                  <FiUserMinus className="absolute -top-0.5 -right-0.5 w-2 h-2 text-orange-500" />
                </>
              )}
            </span>
          ),
          action: onRemove,
          className: isMutual 
            ? "text-profile-color hover:bg-profile-color/10 dark:text-profile-color dark:hover:bg-profile-color/10 font-medium" 
            : "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10 font-medium",
        },
      ];

      // Add the block option
      items.push({
        key: "block",
        label: t('profile.friendActions.block'),
        icon: (
          <span className="relative flex items-center justify-center w-4 h-4">
            <FiShield className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </span>
        ),
        action: onBlock,
        className: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 font-medium",
      });

      return items;
    }

    // Not-following state
    const items = [
      {
        key: "add",
        label: followsMe ? t('profile.friendActions.followBack') : t('profile.friendActions.follow'),
        icon: (
          <span className="relative flex items-center justify-center w-4 h-4">
            {followsMe ? (
              // They follow me, so I can follow back
              <>
                <FiUsers className="w-4 h-4 text-blue-500" />
                <FiHeart className="absolute -top-0.5 -right-0.5 w-2 h-2 text-blue-400" />
              </>
            ) : (
              // Plain follow
              <>
                <FiUser className="w-4 h-4" />
                <FiUserPlus className="absolute -top-0.5 -right-0.5 w-2 h-2 text-green-500" />
              </>
            )}
          </span>
        ),
        action: onAdd,
        className: followsMe 
          ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 font-medium" 
          : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 font-medium",
      },
    ];

    // Add the block option
    items.push({
      key: "block",
      label: t('profile.friendActions.block'),
      icon: (
        <span className="relative flex items-center justify-center w-4 h-4">
          <FiShield className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </span>
      ),
      action: onBlock,
      className: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 font-medium",
    });

    return items;
  }, [isSelf, isBlocked, isFriend, isMutual, followsMe, onAdd, onRemove, onBlock, onUnblock, t]);

  // Build the main button icon - osu! one-way friend system
  const getMainIcon = () => {
    if (loading) {
      return <FiLoader className="w-4 h-4 animate-spin text-blue-500" />;
    }

    if (isSelf) {
      return (
        <span className="relative flex items-center justify-center">
          <FiUser className="w-4 h-4 text-gray-500" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-gray-400 rounded-full"></span>
        </span>
      );
    }

    if (isBlocked) {
      return (
        <span className="relative flex items-center justify-center">
          <FiShield className="w-4 h-4 text-red-500" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </span>
      );
    }

    if (isFriend) {
      if (isMutual) {
        // Mutual follow - two-person icon + pink heart + pulse
        return (
          <span className="relative flex items-center justify-center">
            <FiUsers className="w-4 h-4 text-profile-color" />
            <FiHeart className="absolute -top-0.5 -right-0.5 w-2 h-2 text-profile-color fill-current animate-pulse" />
          </span>
        );
      } else {
        // One-way follow - user icon + blue check
        return (
          <span className="relative flex items-center justify-center">
            <FiUser className="w-4 h-4 text-blue-500" />
            <FiUserCheck className="absolute -top-0.5 -right-0.5 w-2 h-2 text-emerald-500" />
          </span>
        );
      }
    }

    if (followsMe) {
      // They follow me - orange two-person icon + heart hint
      return (
        <span className="relative flex items-center justify-center">
          <FiUsers className="w-4 h-4 text-orange-500" />
          <FiHeart className="absolute -top-0.5 -right-0.5 w-2 h-2 text-orange-400 opacity-80" />
        </span>
      );
    }

    // Not following - default user icon
    return (
      <span className="relative flex items-center justify-center">
        <FaUserFriends className="w-4 h-4 text-gray-600" />
      </span>
    );
  };

  // Build the button status text - osu! one-way friend system
  const getButtonStatusText = () => {
    if (isSelf) return t('profile.friendActions.selfProfile');
    if (isBlocked) return t('profile.friendActions.blocked');
    if (isFriend) {
      if (isMutual) {
        return t('profile.friendActions.mutualFollow');
      } else {
        return t('profile.friendActions.following');
      }
    }
    if (followsMe) return t('profile.friendActions.followsYou');
    return t('profile.friendActions.notFollowing');
  };

  // Whether to show the dropdown arrow
  const showDropdownArrow = !isSelf && !loading && !isActionLoading && menuItems.length > 0;

  // For self or when there are no menu items, render just the button
  if (isSelf || loading || menuItems.length === 0) {
    return (
      <div className={`relative inline-flex ${className}`}>
        <motion.button
          type="button"
          disabled={loading || isSelf || isActionLoading}
          aria-label={getButtonStatusText()}
          whileHover={{ scale: !isSelf && !loading && !isActionLoading ? 1.02 : 1 }}
          whileTap={{ scale: !isSelf && !loading && !isActionLoading ? 0.98 : 1 }}
          className={`
            bg-gray-100 dark:bg-gray-800 
            px-3 py-2 rounded-full flex items-center gap-2 text-sm
            text-gray-700 dark:text-gray-300
            disabled:opacity-50 disabled:cursor-not-allowed select-none
            transition-all duration-200
            cursor-default
          `}
        >
          <div className="flex items-center gap-2">
            {(loading || isActionLoading) ? (
              <FiLoader className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              getMainIcon()
            )}
            <span>{followerCount}</span>
          </div>
        </motion.button>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <motion.button
        ref={refs.setReference}
        type="button"
        disabled={isActionLoading}
        aria-label={getButtonStatusText()}
        whileHover={{ scale: !isActionLoading ? 1.02 : 1 }}
        whileTap={{ scale: !isActionLoading ? 0.98 : 1 }}
        {...getReferenceProps()}
        className={`
          bg-gray-100 dark:bg-gray-800 
          hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer
          px-3 py-2 rounded-full flex items-center gap-2 text-sm
          text-gray-700 dark:text-gray-300
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? 'ring-2 ring-blue-500/20' : ''}
          ${showDropdownArrow ? 'pr-4' : ''}
        `}
      >
        {/* Icon and count */}
        <div className="flex items-center gap-2">
          {(loading || isActionLoading) ? (
            <FiLoader className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            getMainIcon()
          )}
          <span>{followerCount}</span>
        </div>

        {/* Dropdown arrow - only shown when there are menu items */}
        {showDropdownArrow && (
          <motion.div
            className="ml-1"
            animate={{ rotate: isOpen ? -180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.div>
        )}
      </motion.button>

      {/* Popup menu */}
      {isOpen && !isActionLoading && (
        <FloatingFocusManager context={context} modal={false}>
          <motion.div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              transform: `${floatingStyles.transform || ''} translateY(8px)`, // force a downward offset
            }}
            {...getFloatingProps()}
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mt-10 w-48 glass-thick rounded-xl py-1 overflow-hidden focus:outline-none z-[9999]"
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={async () => {
                  // Prevent double-clicks
                  if (isActionLoading) return;

                  try {
                    setIsActionLoading(true);
                    setIsOpen(false); // close the menu immediately
                    await item.action();
                  } catch (error) {
                    console.error("Action failed:", error);
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                disabled={isActionLoading}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium
                  transition-all duration-200
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${item.className || 'text-gray-700 dark:text-gray-300'}
                `}
              >
                {isActionLoading ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  item.icon
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        </FloatingFocusManager>
      )}
    </div>
  );
};

export default FriendActions;
