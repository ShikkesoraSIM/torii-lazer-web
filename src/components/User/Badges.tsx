import React from 'react';
import './Badges.css';

interface Badge {
  awarded_at?: string;
  description?: string;
  image_url?: string;
  ['image@2x_url']?: string;
  url?: string;
}

interface BadgesProps {
  badges?: Badge[] | any[];
  max?: number;
}

// Map badge descriptions to text color (group colour)
const BADGE_COLORS: Record<string, string> = {
  'Dev': '#ED8EA6',      // Pink
  'Admin': '#60a5fa',    // Blue
  'Streamer': '#ED8EA6'
};

const Badges: React.FC<BadgesProps> = ({ badges = [], max = 6 }) => {
  if (!Array.isArray(badges) || badges.length === 0) return null;

  const visible = badges.slice(0, max);
  const extraCount = Math.max(0, badges.length - visible.length);
  
  // Detect special badge type by description
  const getSpecialBadgeColor = (description?: string) => {
    if (!description) return null;
    
    for (const [key, color] of Object.entries(BADGE_COLORS)) {
      if (description.toLowerCase().includes(key.toLowerCase())) {
        return { color, name: key.toUpperCase() };
      }
    }
    return null;
  };

  return (
    <div className="inline-flex items-center gap-2">
      {visible.map((b: any, idx: number) => {
        const specialBadge = getSpecialBadgeColor(b?.description);
        
        // Render special badges (Dev, Admin) as styled pills
        if (specialBadge) {
          return (
            <span
              key={idx}
              title={b?.description || ''}
              className="user-group-badge user-group-badge--profile-page"
              style={{ color: specialBadge.color } as React.CSSProperties}
            >
              {specialBadge.name}
            </span>
          );
        }
        
        // Regular badges: render as images
        const src = b?.['image@2x_url'] || b?.image_url || b?.image || '';
        const title = b?.description || '';
        const key = b?.id ?? b?.awarded_at ?? idx;

        return (
          <img
            key={key}
            src={src}
            alt={title}
            title={title}
            loading="lazy"
            className="h-6 w-6 rounded-md object-contain border border-slate-200 dark:border-slate-700"
          />
        );
      })}

      {extraCount > 0 && (
        <div
          title={`${extraCount} more badges`}
          className="h-6 min-w-[28px] px-2 flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
        >
          +{extraCount}
        </div>
      )}
    </div>
  );
};

export default Badges;

