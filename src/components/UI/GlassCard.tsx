import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use the heavier frosted material (for modals / floating panels). */
  thick?: boolean;
}

/**
 * Canonical frosted-glass surface. Replaces the ad-hoc
 * `rounded-2xl border border-white/10 bg-[linear-gradient(...)] shadow-[...]`
 * blocks scattered across the app with the single `.glass` material.
 */
const GlassCard: React.FC<GlassCardProps> = ({ thick = false, className = '', children, ...rest }) => (
  <div className={`${thick ? 'glass-thick' : 'glass'} rounded-2xl ${className}`} {...rest}>
    {children}
  </div>
);

export default GlassCard;
