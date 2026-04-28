import React, { useEffect, useRef, useState } from 'react';
import { getAuraPreset } from './registry';
import Particle from './Particle';
import type { ParticleConfig } from './types';
import './auras.css';

interface UserAuraProps {
  /** Aura id from `APIUser.equipped_aura`. Pass null for "no aura" — the
   * children render unchanged with zero overhead. */
  auraId: string | null | undefined;
  /** Username (or any drawable). Rendered on top of the particle layer. */
  children: React.ReactNode;
  /** Extra class on the wrapper for layout / typography. */
  className?: string;
}

/**
 * Renders the equipped aura's particle effect behind any inline content.
 *
 * The spawn loop runs in JS (setInterval), maintains a small array of
 * live particles in React state, and lets each <Particle> component
 * fade/translate via CSS keyframes that consume per-instance CSS
 * variables. When a particle's drift animation finishes, the component
 * fires onDone and the array entry is dropped.
 *
 * `mix-blend-mode: screen` on the host gives the additive-glow look the
 * C# client gets from BlendingParameters.Additive — particles bloom into
 * each other and into the underlying name without per-particle blur.
 *
 * Falls through to rendering children unchanged when auraId is null —
 * non-elite users pay zero DOM overhead.
 */
const UserAura: React.FC<UserAuraProps> = ({ auraId, children, className }) => {
  const preset = getAuraPreset(auraId);
  const [particles, setParticles] = useState<ParticleConfig[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    if (!preset) return;

    let cancelled = false;
    let timer: number;

    const tick = () => {
      if (cancelled) return;
      // Cap simultaneously-alive particles. We use functional updates
      // so we read the latest particles count without re-binding the
      // closure on every state change.
      setParticles(curr => {
        if (curr.length >= preset.maxAlive) return curr;
        const config = preset.emit(nextIdRef.current++);
        return [...curr, config];
      });
      const next = preset.spawnIntervalMs + Math.random() * preset.spawnJitterMs;
      timer = window.setTimeout(tick, next);
    };
    timer = window.setTimeout(tick, preset.spawnIntervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Drop any remaining particles when the aura swaps so we don't
      // animate ghosts of the previous preset for their full lifetime.
      setParticles([]);
    };
  }, [preset]);

  const handleParticleDone = (id: number) => {
    setParticles(curr => curr.filter(p => p.id !== id));
  };

  if (!preset) {
    // Cheap path — no DOM nodes, no spawn loop.
    return <>{children}</>;
  }

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <div className="aura-host" aria-hidden="true">
        {preset.hasHalo && (
          <div
            className="aura-halo"
            style={{ background: preset.haloColor }}
          />
        )}
        {particles.map(config => (
          <Particle key={config.id} config={config} onDone={handleParticleDone} />
        ))}
      </div>
      <span className="relative">{children}</span>
    </span>
  );
};

export default UserAura;
