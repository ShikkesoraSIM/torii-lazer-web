import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getAuraPreset } from './registry';
import Particle from './Particle';
import type { AuraPresetSpec, ParticleConfig } from './types';
import './auras.css';

interface UserAuraProps {
  auraId: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}

const isMotionDisabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  if (document.documentElement.classList.contains('perf-mode')) return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
};

/**
 * Isolated emitter layer so particle state ticks never re-render `children`.
 */
const AuraLayer: React.FC<{ preset: AuraPresetSpec }> = React.memo(({ preset }) => {
  const [particles, setParticles] = useState<ParticleConfig[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    if (isMotionDisabled()) return;

    let cancelled = false;
    let timer: number | undefined;
    const expiryTimers = new Map<number, number>();

    const tick = () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        const nextId = nextIdRef.current++;
        const config = preset.emit(nextId);
        setParticles((curr) => {
          if (curr.length >= preset.maxAlive) return curr;
          return [...curr, config];
        });
        // Safety sweep if tab throttling swallows CSS animationend
        const sweep = window.setTimeout(() => {
          expiryTimers.delete(nextId);
          setParticles((curr) => curr.filter((p) => p.id !== nextId));
        }, config.lifetimeMs + 400);
        expiryTimers.set(nextId, sweep);
      }
      const next = preset.spawnIntervalMs + Math.random() * preset.spawnJitterMs;
      timer = window.setTimeout(tick, next);
    };

    timer = window.setTimeout(tick, preset.spawnIntervalMs);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      expiryTimers.forEach((t) => window.clearTimeout(t));
      expiryTimers.clear();
      setParticles([]);
    };
  }, [preset]);

  const handleParticleDone = useCallback((id: number) => {
    setParticles((curr) => curr.filter((p) => p.id !== id));
  }, []);

  return (
    <div className="aura-host" aria-hidden="true">
      {preset.hasHalo && (
        <div
          className="aura-halo"
          style={{ background: preset.haloColor }}
        />
      )}
      {particles.map((config) => (
        <Particle key={config.id} config={config} onDone={handleParticleDone} />
      ))}
    </div>
  );
});
AuraLayer.displayName = 'AuraLayer';

const UserAura: React.FC<UserAuraProps> = ({ auraId, children, className }) => {
  const preset = getAuraPreset(auraId);
  const [disabled, setDisabled] = useState<boolean>(isMotionDisabled);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setDisabled(isMotionDisabled());
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (!preset || disabled) {
    return <>{children}</>;
  }

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <AuraLayer preset={preset} />
      <span className="relative">{children}</span>
    </span>
  );
};

export default UserAura;
