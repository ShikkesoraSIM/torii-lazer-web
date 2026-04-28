/**
 * Shared types for the web aura subsystem.
 *
 * Each preset describes (a) cadence + caps and (b) imperative spawn /
 * background functions that mutate a host DOM element. This mirrors the
 * C# AuraPreset abstraction in the lazer client — keeping the two sides
 * shape-compatible makes adding a new aura mechanical: bump the server
 * catalog, write one C# file, write one preset file here.
 */

export interface AuraPresetSpec {
  /** Stable id, must match the server `aura_id` and the C# `AuraPreset.AuraId`. */
  id: string;

  /** Average ms between particle spawns. */
  spawnIntervalMs: number;

  /** Random extra delay (0..N) added to each spawn. */
  spawnJitterMs: number;

  /** Hard cap on simultaneously-alive particles. Bounds CPU/GPU. */
  maxAlive: number;

  /**
   * Spawn one particle into `host`. Implementations:
   *   - create a DOM element with appropriate classes / inline CSS vars
   *   - listen for `animationend` (or set a timer) to remove it
   *   - append to host
   *
   * `host` already has `position: relative` and clipping disabled — the
   * caller takes care of layout, presets only worry about particles.
   */
  emit(host: HTMLElement): void;

  /**
   * Optional persistent background layer (pulsing halo, tint, …). Called
   * once when the host mounts. Returns an HTMLElement which the caller
   * appends + tracks for cleanup. Return null when the preset is
   * particle-only.
   */
  background?(): HTMLElement | null;
}
