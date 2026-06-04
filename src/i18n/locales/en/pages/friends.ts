export const friendsPage = {
  friends: {
    title: 'Friends',
    subtitle: 'People who follow you, people you follow, and your mutuals.',
    tabs: {
      followers: 'Followers',
      following: 'Following',
      mutuals: 'Mutuals',
    },
    empty: {
      followers: 'No one is following you yet.',
      following: "You aren't following anyone yet.",
      mutuals: 'No mutuals yet. Follow someone back to make it mutual.',
    },
    mutualBadge: 'Mutual',
  },
} as const;
