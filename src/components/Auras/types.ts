/**
 * Shared types for the web aura subsystem.
 *
 * Each preset returns particle CONFIGS (not DOM elements). A central
 * React renderer maps each config to a JSX particle that uses the same
 * FontAwesome icon family as the lazer client's AuraPreset.cs subclasses
 * — so the web preview is visually 1:1 with what users see in-game.
 */

/** Iconographic identity of a particle. Each variant maps to a specific
 * FontAwesome icon (or a built-in shape) so we stay aligned with the
 * lazer client's preset visuals. */
export type ParticleKind =
  | 'spark'        // tapered vertical line (Box gradient — admin)
  | 'star'         // FaStar (admin sparkle)
  | 'ember'        // soft round halo+core (admin slow ember)
  | 'bit'          // small square rotating to diamond (dev)
  | 'less'         // FaLessThan (dev bracket)
  | 'greater'      // FaGreaterThan (dev bracket)
  | 'shield'       // FaShieldAlt (mod)
  | 'note'         // FaMusic (qat)
  | 'check'        // FaCheck (qat approval flash)
  | 'heart'        // FaHeart (supporter)
  | 'leaf';        // FaLeaf (goof)

export interface ParticleConfig {
  /** Unique id within the host emitter's lifetime (used as React key). */
  id: number;

  /** Which icon/shape to render. */
  kind: ParticleKind;

  /** Start position as a percent of the host's width/height. */
  startX: number;
  startY: number;

  /** End position (where the particle drifts to over its lifetime). */
  endX: number;
  endY: number;

  /** Rotation in degrees at spawn / end (used by leaves + notes). */
  startRot?: number;
  endRot?: number;

  /** Particle size in px. */
  size: number;

  /** Fill colour. */
  color: string;

  /** Total lifetime in milliseconds. */
  lifetimeMs: number;

  /** Whether the inner icon should pulse (heartbeat) — used by heart, shield. */
  pulse?: boolean;

  /** Whether the inner icon should bob (gentle Y-axis float) — used by leaf. */
  bob?: boolean;
}

export interface AuraPresetSpec {
  /** Stable id, must match the server `aura_id` and the C# `AuraPreset.AuraId`. */
  id: string;

  /** Average ms between particle spawns. */
  spawnIntervalMs: number;

  /** Random extra delay (0..N) added to each spawn. */
  spawnJitterMs: number;

  /** Hard cap on simultaneously-alive particles. Bounds CPU/GPU. */
  maxAlive: number;

  /** Whether this preset has a persistent halo background layer. */
  hasHalo?: boolean;

  /** Halo CSS-gradient colour (used when hasHalo is true). */
  haloColor?: string;

  /** Spawn one particle config. The renderer will create a JSX particle
   * from this and remove it after `lifetimeMs`. */
  emit(nextId: number): ParticleConfig;
}
