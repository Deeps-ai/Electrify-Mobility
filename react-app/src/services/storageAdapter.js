/**
 * @file storageAdapter.js
 * @description Local-only Storage Adapter for Electrify Mobility (Phase 1).
 * 
 * Provides an abstracted data-access layer for:
 * - Charger status reports (with 2-hour expiration & 5-minute per-station throttling)
 * - Charger reviews and star ratings (1-5 stars with comments & station aggregates)
 * - General feedback submissions (bugs, suggestions, missing chargers)
 * 
 * PHASE 2 MIGRATION BOUNDARY:
 * This interface isolates the UI from localStorage. In Phase 2, a remote adapter
 * (e.g. Supabase, Firebase, or custom REST API) can be swapped in without modifying
 * the UI components. See the bottom of this file for the complete Phase 2 migration contract.
 */

import { DELHI_NCR_STATIONS } from '../data.js';

// Storage keys
const STORAGE_KEYS = {
  REPORTS: 'electrify_local_reports',
  THROTTLES: 'electrify_report_throttles',
  REVIEWS: 'electrify_local_reviews',
  FEEDBACK: 'electrify_local_feedback',
};

// Expiration and Throttling constants
export const REPORT_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours in ms
export const REPORT_THROTTLE_MS = 5 * 60 * 1000;   // 5 minutes in ms

/**
 * In-memory fallback if localStorage is disabled or throws (e.g. private browsing restrictions)
 */
const memoryFallback = {
  [STORAGE_KEYS.REPORTS]: null,
  [STORAGE_KEYS.THROTTLES]: null,
  [STORAGE_KEYS.REVIEWS]: null,
  [STORAGE_KEYS.FEEDBACK]: null,
};

/**
 * Safe localStorage reader with JSON parsing and fallback.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
function safeGetItem(key, fallback) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    }
  } catch (err) {
    console.warn(`[StorageAdapter] Failed to read ${key} from localStorage, using memory fallback:`, err);
  }
  return memoryFallback[key] !== null && memoryFallback[key] !== undefined ? memoryFallback[key] : fallback;
}

/**
 * Safe localStorage writer with fallback.
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean}
 */
function safeSetItem(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
  } catch (err) {
    console.warn(`[StorageAdapter] Failed to write ${key} to localStorage, using memory fallback:`, err);
  }
  memoryFallback[key] = value;
  return true;
}

/**
 * Seed sample reviews if none exist so users immediately experience the reviews feature.
 */
function initializeSeedReviews() {
  const existing = safeGetItem(STORAGE_KEYS.REVIEWS, null);
  if (existing === null || !Array.isArray(existing)) {
    const seedReviews = [
      {
        id: 'rev_seed_201_1',
        station_id: 201,
        rating: 5,
        comment: 'Super fast 60kW charging! Cyber City parking was smooth and security helped guide me to the bay.',
        author_name: 'Aarav M.',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'rev_seed_201_2',
        station_id: 201,
        rating: 4,
        comment: 'Gun 1 worked perfectly for my Nexon EV. Price is fair.',
        author_name: 'Pooja S.',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'rev_seed_202_1',
        station_id: 202,
        rating: 5,
        comment: '120kW ultra-fast charger. Charged from 20% to 80% in just 26 minutes while having coffee at Aerocity.',
        author_name: 'Rohan K.',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'rev_seed_204_1',
        station_id: 204,
        rating: 4,
        comment: 'Good location near DLF Mall. Both connectors active.',
        author_name: 'Vikram D.',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
    ];
    safeSetItem(STORAGE_KEYS.REVIEWS, seedReviews);
  }
}

// Run initial seed check safely
initializeSeedReviews();

// ============================================================================
// 1. STATIONS
// ============================================================================

/**
 * Retrieves the station list.
 * @returns {Promise<Array<any>>}
 */
export async function getStations() {
  // In Phase 1, returns static Delhi NCR stations
  return DELHI_NCR_STATIONS;
}

// ============================================================================
// 2. STATUS REPORTS (2-Hour Expiry & 5-Minute Throttle)
// ============================================================================

/**
 * Checks if a report is valid and unexpired (within 2 hours).
 * @param {any} report
 * @param {number} now
 * @returns {boolean}
 */
function isReportValidAndUnexpired(report, now) {
  if (!report || typeof report !== 'object') return false;
  if (!report.station_id) return false;
  if (!['working', 'broken', 'occupied'].includes(report.status)) return false;
  if (!report.created_at) return false;

  const reportTime = new Date(report.created_at).getTime();
  if (Number.isNaN(reportTime)) return false;

  const ageMs = now - reportTime;
  // Must be in the past and under 2 hours old
  return ageMs >= 0 && ageMs < REPORT_EXPIRY_MS;
}

/**
 * Retrieves all active, unexpired status reports and purges expired ones from localStorage.
 * @param {number} [now]
 * @returns {Array<any>}
 */
export function getActiveReports(now = Date.now()) {
  const allReports = safeGetItem(STORAGE_KEYS.REPORTS, []);
  if (!Array.isArray(allReports)) return [];

  const validUnexpired = [];
  let hasExpired = false;

  for (const report of allReports) {
    if (isReportValidAndUnexpired(report, now)) {
      validUnexpired.push(report);
    } else {
      hasExpired = true;
    }
  }

  // Purge expired records from storage if found
  if (hasExpired) {
    safeSetItem(STORAGE_KEYS.REPORTS, validUnexpired);
  }

  return validUnexpired;
}

/**
 * Returns latest unexpired report map indexed by station_id with relative `minutesAgo`.
 * @param {number} [now]
 * @returns {Record<string|number, { status: string, note?: string, wait_minutes?: number, created_at: string, minutesAgo: number }>}
 */
export function getReportsByStation(now = Date.now()) {
  const activeReports = getActiveReports(now);
  const map = {};

  for (const report of activeReports) {
    const stId = report.station_id;
    const existing = map[stId];
    const reportTime = new Date(report.created_at).getTime();

    if (!existing || reportTime > new Date(existing.created_at).getTime()) {
      const diffMs = Math.max(0, now - reportTime);
      const minutesAgo = Math.floor(diffMs / (60 * 1000));
      map[stId] = {
        ...report,
        minutesAgo,
      };
    }
  }

  return map;
}

/**
 * Returns the remaining throttle time in seconds for a station on this browser/device.
 * @param {string|number} stationId
 * @param {number} [now]
 * @returns {{ isThrottled: boolean, remainingSeconds: number, remainingMinutes: number }}
 */
export function getThrottleStatus(stationId, now = Date.now()) {
  if (!stationId) return { isThrottled: false, remainingSeconds: 0, remainingMinutes: 0 };
  
  const throttles = safeGetItem(STORAGE_KEYS.THROTTLES, {});
  const lastTime = throttles[stationId];
  if (!lastTime || typeof lastTime !== 'number') {
    return { isThrottled: false, remainingSeconds: 0, remainingMinutes: 0 };
  }

  const elapsedMs = now - lastTime;
  if (elapsedMs < REPORT_THROTTLE_MS) {
    const remainingMs = REPORT_THROTTLE_MS - elapsedMs;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return { isThrottled: true, remainingSeconds, remainingMinutes };
  }

  return { isThrottled: false, remainingSeconds: 0, remainingMinutes: 0 };
}

/**
 * Submits a new local status report for a charger.
 * Throttled to 1 report per charger every 5 minutes per browser.
 * 
 * @param {{ station_id: string|number, status: 'working'|'broken'|'occupied', note?: string, wait_minutes?: number }} payload
 * @param {number} [now]
 * @returns {{ success: boolean, throttled?: boolean, message: string, report?: any, remainingSeconds?: number }}
 */
export function addReport(payload, now = Date.now()) {
  const { station_id, status, note = '', wait_minutes = 0 } = payload;

  if (!station_id) {
    return { success: false, message: 'Station ID is required.' };
  }
  if (!['working', 'broken', 'occupied'].includes(status)) {
    return { success: false, message: 'Status must be Working, Broken, or Occupied.' };
  }

  // Throttle check
  const throttle = getThrottleStatus(station_id, now);
  if (throttle.isThrottled) {
    return {
      success: false,
      throttled: true,
      remainingSeconds: throttle.remainingSeconds,
      message: `Throttled: You already reported this charger recently. Please wait ${throttle.remainingMinutes} min (${throttle.remainingSeconds}s) before reporting again on this device.`,
    };
  }

  const cleanNote = String(note).trim().slice(0, 200);
  const parsedWait = Math.max(0, Math.min(180, parseInt(wait_minutes, 10) || 0));

  const newReport = {
    id: `rep_${now}_${Math.random().toString(36).substring(2, 7)}`,
    station_id,
    status,
    note: cleanNote,
    wait_minutes: parsedWait,
    created_at: new Date(now).toISOString(),
    local_only: true,
  };

  // 1. Save report
  const allReports = safeGetItem(STORAGE_KEYS.REPORTS, []);
  const validReports = Array.isArray(allReports) ? allReports : [];
  validReports.unshift(newReport);
  safeSetItem(STORAGE_KEYS.REPORTS, validReports);

  // 2. Update throttle timestamp
  const throttles = safeGetItem(STORAGE_KEYS.THROTTLES, {});
  const updatedThrottles = typeof throttles === 'object' && throttles !== null ? { ...throttles } : {};
  updatedThrottles[station_id] = now;
  safeSetItem(STORAGE_KEYS.THROTTLES, updatedThrottles);

  return {
    success: true,
    message: 'Report saved locally on this browser! It will stay active for 2 hours.',
    report: newReport,
  };
}

// ============================================================================
// 3. REVIEWS & RATINGS (1-5 Stars & Comments)
// ============================================================================

/**
 * Retrieves reviews for a specific charger or all chargers.
 * @param {string|number|null} [stationId]
 * @returns {Array<any>}
 */
export function getReviews(stationId = null) {
  const allReviews = safeGetItem(STORAGE_KEYS.REVIEWS, []);
  if (!Array.isArray(allReviews)) return [];

  // Filter out any corrupted entries
  const validReviews = allReviews.filter(r => (
    r &&
    typeof r === 'object' &&
    r.station_id &&
    typeof r.rating === 'number' &&
    r.rating >= 1 &&
    r.rating <= 5 &&
    r.comment
  ));

  if (stationId === null || stationId === undefined) {
    return validReviews;
  }

  return validReviews.filter(r => String(r.station_id) === String(stationId));
}

/**
 * Calculates rating stats for a specific station.
 * @param {string|number} stationId
 * @returns {{ averageRating: number | null, reviewCount: number }}
 */
export function getStationRatingStats(stationId) {
  const reviews = getReviews(stationId);
  if (reviews.length === 0) {
    return { averageRating: null, reviewCount: 0 };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Number((sum / reviews.length).toFixed(1));
  return { averageRating: avg, reviewCount: reviews.length };
}

/**
 * Submits a new review for a charger.
 * @param {{ station_id: string|number, rating: number, comment: string, author_name?: string }} payload
 * @returns {{ success: boolean, message: string, review?: any }}
 */
export function addReview(payload) {
  const { station_id, rating, comment, author_name = 'EV Driver' } = payload;

  if (!station_id) {
    return { success: false, message: 'Station ID is required.' };
  }

  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return { success: false, message: 'Rating must be an integer between 1 and 5 stars.' };
  }

  const cleanComment = String(comment || '').trim();
  if (cleanComment.length < 3) {
    return { success: false, message: 'Please enter a review comment of at least 3 characters.' };
  }
  if (cleanComment.length > 500) {
    return { success: false, message: 'Comment must be 500 characters or less.' };
  }

  const cleanAuthor = String(author_name || '').trim().slice(0, 50) || 'EV Driver';

  const newReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    station_id,
    rating: numRating,
    comment: cleanComment,
    author_name: cleanAuthor,
    created_at: new Date().toISOString(),
    local_only: true,
  };

  const allReviews = safeGetItem(STORAGE_KEYS.REVIEWS, []);
  const valid = Array.isArray(allReviews) ? allReviews : [];
  valid.unshift(newReview);
  safeSetItem(STORAGE_KEYS.REVIEWS, valid);

  return {
    success: true,
    message: 'Review saved locally on this browser. Thank you for your feedback!',
    review: newReview,
  };
}

// ============================================================================
// 4. GENERAL FEEDBACK (Bugs, Missing Chargers, Suggestions)
// ============================================================================

/**
 * Submits general application feedback (stored locally on this device in Phase 1).
 * @param {{ category: 'bug'|'missing_charger'|'suggestion'|'other', message: string, contact?: string }} payload
 * @returns {{ success: boolean, message: string, feedback?: any }}
 */
export function submitFeedback(payload) {
  const { category, message, contact = '' } = payload;

  const validCategories = ['bug', 'missing_charger', 'suggestion', 'other'];
  if (!validCategories.includes(category)) {
    return { success: false, message: 'Please select a valid feedback category.' };
  }

  const cleanMessage = String(message || '').trim();
  if (cleanMessage.length < 5) {
    return { success: false, message: 'Please provide at least 5 characters describing your feedback.' };
  }
  if (cleanMessage.length > 1000) {
    return { success: false, message: 'Feedback message cannot exceed 1000 characters.' };
  }

  const cleanContact = String(contact || '').trim().slice(0, 100);

  const newFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category,
    message: cleanMessage,
    contact: cleanContact,
    created_at: new Date().toISOString(),
    local_only: true,
  };

  const allFeedback = safeGetItem(STORAGE_KEYS.FEEDBACK, []);
  const valid = Array.isArray(allFeedback) ? allFeedback : [];
  valid.unshift(newFeedback);
  safeSetItem(STORAGE_KEYS.FEEDBACK, valid);

  return {
    success: true,
    message: 'Feedback saved locally on this device (Phase 1). It is not sent to any external server.',
    feedback: newFeedback,
  };
}

/**
 * Returns all local feedback submissions stored on this device.
 * @returns {Array<any>}
 */
export function getLocalFeedbackList() {
  const list = safeGetItem(STORAGE_KEYS.FEEDBACK, []);
  return Array.isArray(list) ? list : [];
}

// ============================================================================
// PHASE 2 MIGRATION CONTRACT & INTERFACE SPECIFICATION
// ============================================================================
/**
 * In Phase 2, this storage adapter can be swapped with a hosted provider (Supabase / Firebase).
 * 
 * Required Remote Schema & Endpoints:
 * 
 * 1. TABLE: `reports`
 *    - `id`: uuid or bigserial (primary key)
 *    - `station_id`: bigint / integer (foreign key to stations.id)
 *    - `status`: text ('working' | 'broken' | 'occupied')
 *    - `note`: text, nullable (max 200 chars)
 *    - `wait_minutes`: integer (default 0)
 *    - `user_id`: uuid (anonymous auth or authenticated user)
 *    - `created_at`: timestamptz (default now())
 *    - Query: `select * from reports where created_at >= (now() - interval '2 hours') order by created_at desc`
 * 
 * 2. TABLE: `reviews`
 *    - `id`: uuid or bigserial (primary key)
 *    - `station_id`: bigint / integer (foreign key to stations.id)
 *    - `rating`: smallint (check rating between 1 and 5)
 *    - `comment`: text (min 3 chars, max 500 chars)
 *    - `author_name`: text (default 'EV Driver')
 *    - `user_id`: uuid, nullable
 *    - `created_at`: timestamptz (default now())
 *    - Query: `select * from reviews where station_id = :id order by created_at desc`
 * 
 * 3. FEEDBACK INTEGRATION:
 *    - In Phase 2, general feedback will integrate with an external form service
 *      (e.g., Google Forms webhook, Formspree, or a dedicated Supabase `feedback` table).
 * 
 * The UI components only call:
 * - `getStations()`
 * - `getActiveReports()` / `getReportsByStation()`
 * - `getThrottleStatus(stationId)`
 * - `addReport({ station_id, status, note, wait_minutes })`
 * - `getReviews(stationId)`
 * - `getStationRatingStats(stationId)`
 * - `addReview({ station_id, rating, comment, author_name })`
 * - `submitFeedback({ category, message, contact })`
 */
export const StorageAdapter = {
  getStations,
  getActiveReports,
  getReportsByStation,
  getThrottleStatus,
  addReport,
  getReviews,
  getStationRatingStats,
  addReview,
  submitFeedback,
  getLocalFeedbackList,
};

export default StorageAdapter;
