import React from 'react';
import type { IconType } from 'react-icons';
import { FaStar, FaShieldAlt, FaMusic, FaCheck, FaHeart, FaLeaf, FaLessThan, FaGreaterThan } from 'react-icons/fa';
import type { ParticleConfig, ParticleKind } from './types';

/**
 * One particle drawable. Consumes a `ParticleConfig` and renders the
 * matching FontAwesome icon (or built-in shape) using the SAME icons
 * the lazer client's C# AuraPreset uses. So a "leaf" particle here
 * looks like FontAwesome's leaf glyph — same shape the user sees in-
 * game — instead of a CSS approximation.
 *
 * Animation is driven by inline CSS variables + a per-kind keyframe
 * defined in `auras.css`. Each particle removes itself when its
 * `animationend` event fires (handled in the parent host).
 */

// React icon component for each "iconic" kind. Built-in shapes
// (spark / ember / bit) are rendered via div styling, no icon needed.
// IconType from react-icons extends SVGAttributes so it accepts `style`,
// `size`, `color` etc. Using the wider type avoids JSX prop errors.
const ICON_FOR_KIND: Partial<Record<ParticleKind, IconType>> = {
  star: FaStar,
  shield: FaShieldAlt,
  note: FaMusic,
  check: FaCheck,
  heart: FaHeart,
  leaf: FaLeaf,
  less: FaLessThan,
  greater: FaGreaterThan,
};

interface ParticleProps {
  config: ParticleConfig;
  /** Called once the particle's CSS animation finishes — host removes it. */
  onDone: (id: number) => void;
}

const Particle: React.FC<ParticleProps> = ({ config, onDone }) => {
  const Icon = ICON_FOR_KIND[config.kind];

  // CSS variables consumed by the per-kind keyframes in auras.css.
  // Translates / rotates / scales animate from start→end values over
  // `lifetimeMs`; opacity fades in/out separately inside the keyframe.
  const style: React.CSSProperties & Record<string, string | number> = {
    '--start-x': `${config.startX}%`,
    '--start-y': `${config.startY}%`,
    '--end-x': `${config.endX}%`,
    '--end-y': `${config.endY}%`,
    '--start-rot': `${config.startRot ?? 0}deg`,
    '--end-rot': `${config.endRot ?? 0}deg`,
    '--lifetime': `${config.lifetimeMs}ms`,
    color: config.color,
    fontSize: `${config.size}px`,
  };

  // Class composition: a base "aura-particle" plus per-kind variant
  // that selects the right keyframe + sizing rules. `bob` and `pulse`
  // toggle nested keyframes that layer onto the main drift animation.
  const classes = [
    'aura-particle',
    `aura-particle-${config.kind}`,
    config.bob ? 'aura-particle--bob' : '',
    config.pulse ? 'aura-particle--pulse' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={style}
      onAnimationEnd={(e: React.AnimationEvent<HTMLDivElement>) => {
        // The drift animation runs ON THIS DIV; bob/pulse modifiers run
        // on the inner `> *` (icon) child via CSS, so they don't bubble
        // here. Still gate on the prefix in case a future modifier ever
        // attaches to the particle div directly.
        if (e.target === e.currentTarget && e.animationName.startsWith('aura-drift-')) {
          onDone(config.id);
        }
      }}
    >
      {Icon ? (
        <Icon
          size={config.size}
          color={config.color}
          // Drop shadow gives the additive-glow look without a real
          // blur shader. Same job as the C# preset's halo SpriteIcon.
          style={{ filter: `drop-shadow(0 0 ${config.size * 0.4}px ${config.color})` }}
        />
      ) : (
        // Built-in shape paths for non-icon particles. The CSS class
        // (.aura-particle-spark / -ember / -bit) does the actual styling.
        <div className="aura-particle__shape" style={{ backgroundColor: config.color }} />
      )}
    </div>
  );
};

export default React.memo(Particle);
