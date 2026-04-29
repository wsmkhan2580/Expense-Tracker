/**
 * storage.js
 * ──────────────────────────────────────────────────────────────
 * Abstraction layer over localStorage.
 * All app data lives under a single namespace key to avoid clashes.
 *
 * Shape of stored state:
 * {
 *   salary:   number,
 *   currency: string,        // "INR" | "USD" | "EUR"
 *   expenses: [
 *     { id: string, name: string, amount: number, createdAt: number }
 *   ]
 * }
 */

const STORAGE_KEY = 'cashflow_tracker_v1';

/** @returns {object} The full app state from localStorage (or a clean default). */
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return { ...getDefaultState(), ...JSON.parse(raw) };
  } catch {
    console.warn('[Storage] Failed to parse saved state. Returning defaults.');
    return getDefaultState();
  }
};

/** Persists the full state object. @param {object} state */
const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[Storage] Failed to save state:', err);
  }
};

/** Wipes the persisted state completely. */
const clearState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[Storage] Failed to clear state:', err);
  }
};

/** @returns {object} A fresh, empty app state. */
const getDefaultState = () => ({
  salary:   0,
  currency: 'INR',
  expenses: [],
});

export { loadState, saveState, clearState, getDefaultState };
