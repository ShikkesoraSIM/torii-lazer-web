import React, { useEffect, useRef } from 'react';
import { getAuraPreset } from './registry';
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
 * Wraps any inline content (a username, typically) and renders the user's
 * aura particle layer behind it. Used both globally — wherever a username
 * appears in the web app — and inside the settings preview cards.
 *
 * The implementation drives a spawn loop with `setInterval`; each spawn
 * appends a DOM element with CSS-keyframe animation that removes itself
 * on `animationend`. Cap on simultaneously-alive particles is enforced by
 * counting children. No state lives in React for the particles themselves
 * — DOM is the source of truth, and React only owns mount/unmount of the
 * host container.
 */
const UserAura: React.FC<UserAuraProps> = ({ auraId, children, className }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const preset = getAuraPreset(auraId);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !preset) return;

    // Mount the persistent background (if the preset has one).
    const bg = preset.background?.() ?? null;
    if (bg) host.appendChild(bg);

    // Schedule particles. We use setInterval rather than requestAnimationFrame
    // because spawn cadence is in the 200-600ms range — far below RAF
    // resolution requirements, and setInterval pauses while the tab is
    // backgrounded which is the right battery-saving behaviour.
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      // Hard cap. Count only particle children, ignore the optional bg.
      const aliveCount = host.querySelectorAll('.aura-particle').length;
      if (aliveCount < preset.maxAlive) preset.emit(host);
      const next = preset.spawnIntervalMs + Math.random() * preset.spawnJitterMs;
      timer = window.setTimeout(tick, next);
    };
    let timer = window.setTimeout(tick, preset.spawnIntervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Drop everything the preset added, including the background.
      while (host.firstChild) host.removeChild(host.firstChild);
    };
  }, [preset]);

  if (!preset) {
    // Cheap path — no DOM nodes for users with no aura.
    return <>{children}</>;
  }

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <div ref={hostRef} className="aura-host" aria-hidden="true" />
      <span className="relative">{children}</span>
    </span>
  );
};

export default UserAura;
