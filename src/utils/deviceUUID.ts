/**
 * Device UUID management.
 * Uses FingerprintJS to generate a stable per-device identifier for device binding.
 */

// FingerprintJS is dynamically imported in initFingerprint() so the heavy lib
// stays out of the main bundle and only loads the first time a device UUID is
// minted. Returning users read the UUID from localStorage and never pull it in.

const DEVICE_UUID_KEY = 'device_uuid';

// Cached FingerprintJS instance
let fpPromise: Promise<any> | null = null;

/**
 * Initialize FingerprintJS
 */
function initFingerprint() {
  if (!fpPromise) {
    fpPromise = import('@fingerprintjs/fingerprintjs').then((m) => m.default.load());
  }
  return fpPromise;
}

/**
 * Generate a device fingerprint ID with FingerprintJS
 */
async function generateFingerprintUUID(): Promise<string> {
  try {
    const fp = await initFingerprint();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    // Fallback: use a random UUID
    return generateFallbackUUID();
  }
}

/**
 * Fallback: generate a random UUID
 */
function generateFallbackUUID(): string {
  // Prefer the crypto API for a secure random UUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: use Math.random()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or generate the device UUID.
 * Prefers a FingerprintJS fingerprint; returns the stored value if one already exists.
 */
export async function getDeviceUUID(): Promise<string> {
  try {
    // Try to read an existing UUID from localStorage
    let uuid = localStorage.getItem(DEVICE_UUID_KEY);

    if (!uuid) {
      // None stored: generate a new fingerprint ID with FingerprintJS
      uuid = await generateFingerprintUUID();
      localStorage.setItem(DEVICE_UUID_KEY, uuid);
    }

    return uuid;
  } catch (error) {
    console.error('Error getting device UUID:', error);
    // localStorage unavailable: generate a temporary (session-only) UUID
    return generateFallbackUUID();
  }
}

/**
 * Reset the device UUID (for testing or special cases).
 * Regenerates a fresh fingerprint with FingerprintJS.
 */
export async function resetDeviceUUID(): Promise<string> {
  try {
    const newUUID = await generateFingerprintUUID();
    localStorage.setItem(DEVICE_UUID_KEY, newUUID);
    return newUUID;
  } catch (error) {
    console.error('Error resetting device UUID:', error);
    return generateFallbackUUID();
  }
}

/**
 * Get the currently stored UUID (without generating a new one)
 */
export function getCurrentDeviceUUID(): string | null {
  try {
    return localStorage.getItem(DEVICE_UUID_KEY);
  } catch (error) {
    console.error('Error getting current device UUID:', error);
    return null;
  }
}

/**
 * Force a fresh fingerprint and update storage
 */
export async function forceRegenerateFingerprint(): Promise<string> {
  try {
    // Clear the cached FingerprintJS instance
    fpPromise = null;
    const newUUID = await generateFingerprintUUID();
    localStorage.setItem(DEVICE_UUID_KEY, newUUID);
    return newUUID;
  } catch (error) {
    console.error('Error force regenerating fingerprint:', error);
    return generateFallbackUUID();
  }
}
