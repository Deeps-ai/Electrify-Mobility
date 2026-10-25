/**
 * @file storageAdapter.js
 * @description Local-only Storage Adapter for Electrify Mobility.
 * 
 * Provides an abstracted data-access layer for:
 * - Public charger discovery & Delhi NCR stations
 * - Charger status reports (with 2-hour expiration & 5-minute per-station throttling)
 * - Charger reviews and star ratings (1-5 stars with comments & station aggregates)
 * - General feedback submissions (bugs, suggestions, missing chargers)
 * - Homeowner private charger rentals (listing, privacy, pause, edit, approval workflow)
 * - Driver booking requests for homeowner chargers
 * - Complaints management & public charger requests
 * - Admin decision audit logging
 * 
 * PHASE 2 MIGRATION BOUNDARY:
 * This interface isolates the UI from localStorage. In Phase 2, a remote adapter
 * (e.g. Supabase, Firebase, or custom REST API) can be swapped in without modifying
 * the UI components.
 */

import { DELHI_NCR_STATIONS } from '../data.js';

// Storage keys
export const STORAGE_KEYS = {
  REPORTS: 'electrify_local_reports',
  THROTTLES: 'electrify_report_throttles',
  REVIEWS: 'electrify_local_reviews',
  FEEDBACK: 'electrify_local_feedback',
  HOME_CHARGERS: 'electrify_home_chargers',
  BOOKINGS: 'electrify_home_bookings',
  COMPLAINTS: 'electrify_complaints',
  CHARGER_REQUESTS: 'electrify_charger_requests',
  ADMIN_AUDIT: 'electrify_admin_audit_log',
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
  [STORAGE_KEYS.HOME_CHARGERS]: null,
  [STORAGE_KEYS.BOOKINGS]: null,
  [STORAGE_KEYS.COMPLAINTS]: null,
  [STORAGE_KEYS.CHARGER_REQUESTS]: null,
  [STORAGE_KEYS.ADMIN_AUDIT]: null,
};

/**
 * Safe localStorage reader with JSON parsing and fallback.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function safeGetItem(key, fallback) {
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
export function safeSetItem(key, value) {
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
 * Seed initial sample reviews if none exist.
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

/**
 * Seed initial homeowner chargers with varied statuses (Approved, Pending Review, Paused)
 * to provide a realistic prototype for both drivers and the Admin portal.
 */
function initializeSeedHomeChargers() {
  const existing = safeGetItem(STORAGE_KEYS.HOME_CHARGERS, null);
  if (existing === null || !Array.isArray(existing)) {
    const seedHomeChargers = [
      {
        id: 'hc_101',
        title: "Vikram's 7.4kW Fast Home Charger",
        owner_name: 'Vikram Mehta',
        owner_contact: '+91 98101 23456',
        region: 'Gurugram',
        exact_address: 'Villa 24, Palm Drive, Sector 66, Gurugram',
        approx_address: 'Near Sector 66, Golf Course Ext Road, Gurugram',
        is_address_public: false, // Privacy enabled: drivers see approximate area until booking accepted
        lat: 28.3980,
        lng: 77.0620,
        connector: 'Type 2 AC',
        power_kw: 7.4,
        type: 'HOME_CHARGER',
        price: '₹14.00 / kWh',
        price_num: 14,
        price_unit: 'kWh',
        schedule: 'Mon–Sat: 8:00 AM – 8:00 PM',
        access_instructions: 'Covered driveway bay 1. Gate guard has visitor pass for EV charging.',
        status: 'approved', // Live on map
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        reviewed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        admin_notes: 'Approved after verifying residential safety checklist and dedicated MCB.',
        is_homeowner: true,
      },
      {
        id: 'hc_102',
        title: "Ananya's 11kW Type 2 EV Station",
        owner_name: 'Ananya Sharma',
        owner_contact: '+91 98711 54321',
        region: 'Noida',
        exact_address: 'Tower 4, Flat 502, Sector 50, Noida',
        approx_address: 'Sector 50, Central Noida',
        is_address_public: false, // Privacy enabled
        lat: 28.5720,
        lng: 77.3680,
        connector: 'Type 2 AC',
        power_kw: 11,
        type: 'HOME_CHARGER',
        price: '₹80.00 / hr',
        price_num: 80,
        price_unit: 'hour',
        schedule: 'Daily: 6:00 PM – 11:00 PM',
        access_instructions: 'Basement 1 parking slot B-42. Security code 1928 at boom barrier.',
        status: 'pending', // Pending review for Admin Portal
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        admin_notes: null,
        is_homeowner: true,
      },
      {
        id: 'hc_103',
        title: "Sunil's 15A 3-Pin / 3.3kW Driveway Plug",
        owner_name: 'Sunil Rao',
        owner_contact: '+91 99100 88776',
        region: 'Delhi',
        exact_address: 'B-12, Vasant Vihar, New Delhi',
        approx_address: 'B-12, Vasant Vihar, New Delhi',
        is_address_public: true, // Public exact address
        lat: 28.5580,
        lng: 77.1580,
        connector: '15A 3-Pin (Type 2 adapter available)',
        power_kw: 3.3,
        type: 'HOME_CHARGER',
        price: '₹12.00 / kWh',
        price_num: 12,
        price_unit: 'kWh',
        schedule: '24/7 Available (Advance request preferred)',
        access_instructions: 'Outdoor weatherproof plug on boundary wall facing driveway.',
        status: 'approved', // Live on map
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        reviewed_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        admin_notes: 'Approved for public listing with visible boundary plug.',
        is_homeowner: true,
      },
      {
        id: 'hc_104',
        title: "Ramesh's 22kW Fast AC Wallbox",
        owner_name: 'Ramesh Gupta',
        owner_contact: '+91 98200 11223',
        region: 'Ghaziabad',
        exact_address: 'Plot 88, Nyay Khand 1, Indirapuram, Ghaziabad',
        approx_address: 'Nyay Khand 1, Indirapuram, Ghaziabad',
        is_address_public: false,
        lat: 28.6410,
        lng: 77.3750,
        connector: 'Type 2 AC',
        power_kw: 22,
        type: 'HOME_CHARGER',
        price: '₹16.00 / kWh',
        price_num: 16,
        price_unit: 'kWh',
        schedule: 'Weekends only: 9:00 AM – 9:00 PM',
        access_instructions: 'Drive into open portico. High power 3-phase charger.',
        status: 'paused', // Paused by owner
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        reviewed_at: new Date(Date.now() - 86400000 * 9).toISOString(),
        admin_notes: 'Paused temporarily at host request due to driveway renovation.',
        is_homeowner: true,
      }
    ];
    safeSetItem(STORAGE_KEYS.HOME_CHARGERS, seedHomeChargers);
  }
}

/**
 * Seed initial complaints and requests for admin demonstration.
 */
function initializeSeedComplaintsAndRequests() {
  const existingComplaints = safeGetItem(STORAGE_KEYS.COMPLAINTS, null);
  if (existingComplaints === null || !Array.isArray(existingComplaints)) {
    const seedComplaints = [
      {
        id: 'comp_1',
        charger_id: 208,
        charger_title: 'EESL Public Charging Hub - Nehru Place',
        complainant_name: 'Arjun Verma',
        complainant_contact: 'arjun.v@example.com',
        issue_type: 'Damaged Connector Gun',
        description: 'Gun #2 has a cracked locking latch and failed to initiate CCS-2 session on Tata Tiago EV.',
        status: 'open',
        priority: 'high',
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        admin_notes: 'Reported to Delhi Transco maintenance team.',
      },
      {
        id: 'comp_2',
        charger_id: 201,
        charger_title: 'Statiq Superfast Charging Hub - Cyber City',
        complainant_name: 'Sneha Patel',
        complainant_contact: 'sneha.p@example.com',
        issue_type: 'ICEd / Blocked Bay',
        description: 'Non-EV SUV parked in charging bay #3 without security intervening during peak hours.',
        status: 'in_progress',
        priority: 'medium',
        created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
        admin_notes: 'Building security contacted to place EV-only cones.',
      }
    ];
    safeSetItem(STORAGE_KEYS.COMPLAINTS, seedComplaints);
  }

  const existingRequests = safeGetItem(STORAGE_KEYS.CHARGER_REQUESTS, null);
  if (existingRequests === null || !Array.isArray(existingRequests)) {
    const seedRequests = [
      {
        id: 'req_1',
        location_name: 'Dwarka Expressway Sector 104',
        region: 'Gurugram',
        suggested_operator: 'Tata Power / Statiq',
        notes: 'High EV traffic on new expressway with zero DC fast chargers between Delhi border and Kherki Daula.',
        contact: 'commuter.ev@gmail.com',
        status: 'under_review',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        admin_notes: 'Reviewing highway corridor feasibility with DISCOM.',
      },
      {
        id: 'req_2',
        location_name: 'Ambience Mall Basement Parking',
        region: 'Gurugram',
        suggested_operator: 'ChargeZone',
        notes: 'Need 60kW DC chargers for weekend shoppers.',
        contact: 'shopper@delhiev.org',
        status: 'planned',
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        admin_notes: 'Mall management planning EV charging bays in Phase 2.',
      }
    ];
    safeSetItem(STORAGE_KEYS.CHARGER_REQUESTS, seedRequests);
  }
}

// Run initial seed checks safely
initializeSeedReviews();
initializeSeedHomeChargers();
initializeSeedComplaintsAndRequests();

// ============================================================================
// 1. PUBLIC STATIONS
// ============================================================================

/**
 * Retrieves the public station list.
 * @returns {Promise<Array<any>>}
 */
export async function getStations() {
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

  const allReports = safeGetItem(STORAGE_KEYS.REPORTS, []);
  const validReports = Array.isArray(allReports) ? allReports : [];
  validReports.unshift(newReport);
  safeSetItem(STORAGE_KEYS.REPORTS, validReports);

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
    reviewed: false,
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

/**
 * Marks general feedback item as reviewed (Admin action).
 * @param {string} feedbackId
 * @param {boolean} [reviewed]
 * @returns {boolean}
 */
export function setFeedbackReviewed(feedbackId, reviewed = true) {
  const list = getLocalFeedbackList();
  const updated = list.map(item => item.id === feedbackId ? { ...item, reviewed } : item);
  safeSetItem(STORAGE_KEYS.FEEDBACK, updated);
  recordAdminAudit('REVIEW_FEEDBACK', 'feedback', feedbackId, `Marked reviewed=${reviewed}`);
  return true;
}

// ============================================================================
// 5. HOMEOWNER CHARGER RENTALS (Listing, Status, Privacy, Editing)
// ============================================================================

/**
 * Retrieves all homeowner charger listings (or filtered by status).
 * @param {'all'|'pending'|'approved'|'declined'|'paused'} [statusFilter]
 * @returns {Array<any>}
 */
export function getHomeChargers(statusFilter = 'all') {
  const chargers = safeGetItem(STORAGE_KEYS.HOME_CHARGERS, []);
  if (!Array.isArray(chargers)) return [];
  if (statusFilter === 'all' || !statusFilter) return chargers;
  return chargers.filter(c => c.status === statusFilter);
}

/**
 * Returns only approved, active homeowner chargers that are currently rentable for EV drivers.
 * Safe for map rendering and public search.
 * @returns {Array<any>}
 */
export function getApprovedHomeChargers() {
  return getHomeChargers('approved');
}

/**
 * Adds a new homeowner charger listing. Always starts in 'pending' status until admin approval.
 * @param {Object} payload
 * @returns {{ success: boolean, message: string, charger?: any }}
 */
export function addHomeCharger(payload) {
  const title = payload.title;
  const owner_name = payload.owner_name;
  const owner_contact = payload.owner_contact || payload.phone || payload.contact;
  const region = payload.region || 'Delhi';
  const exact_address = payload.exact_address || payload.full_address || payload.address;
  const approx_address = payload.approx_address;
  const is_address_public = payload.is_address_public ?? false;
  const lat = payload.lat ?? payload.latitude;
  const lng = payload.lng ?? payload.longitude;
  const connector = payload.connector || payload.connector_type;
  const power_kw = payload.power_kw;
  const price_num = payload.price_num ?? payload.pricing_rate;
  const price_unit = payload.price_unit || (payload.pricing_unit === 'per_kwh' ? 'kWh' : payload.pricing_unit) || 'kWh';
  const schedule = payload.schedule;
  const access_instructions = payload.access_instructions;

  if (!title || String(title).trim().length < 3) {
    return { success: false, message: 'Charger title must be at least 3 characters.' };
  }
  if (!owner_name || String(owner_name).trim().length < 2) {
    return { success: false, message: 'Please enter your name.' };
  }
  if (!owner_contact || String(owner_contact).trim().length < 5) {
    return { success: false, message: 'Please enter a valid phone number or WhatsApp contact.' };
  }
  if (!exact_address || String(exact_address).trim().length < 5) {
    return { success: false, message: 'Please provide the complete physical address.' };
  }
  if (!connector) {
    return { success: false, message: 'Please select a connector type.' };
  }

  const numPower = Number(power_kw);
  if (Number.isNaN(numPower) || numPower <= 0) {
    return { success: false, message: 'Please enter a valid charging power in kW (e.g. 7.4).' };
  }

  const numPrice = Number(price_num);
  if (Number.isNaN(numPrice) || numPrice <= 0) {
    return { success: false, message: 'Please enter a valid price amount.' };
  }

  const validLat = Number(lat) || 28.5355;
  const validLng = Number(lng) || 77.2000;

  const derivedApprox = approx_address?.trim() || `${region || 'NCR'} (Approximate area)`;
  const formattedPrice = price_unit === 'kWh' ? `₹${numPrice.toFixed(2)} / kWh` : price_unit === 'hour' ? `₹${numPrice.toFixed(2)} / hr` : `₹${numPrice.toFixed(2)} / session`;

  const newCharger = {
    id: `hc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: String(title).trim().slice(0, 100),
    owner_name: String(owner_name).trim().slice(0, 60),
    owner_contact: String(owner_contact).trim().slice(0, 50),
    region: region || 'Delhi',
    exact_address: String(exact_address).trim().slice(0, 200),
    approx_address: derivedApprox.slice(0, 150),
    is_address_public: Boolean(is_address_public),
    lat: validLat,
    lng: validLng,
    connector: String(connector).slice(0, 50),
    power_kw: numPower,
    type: 'HOME_CHARGER',
    price: formattedPrice,
    price_num: numPrice,
    price_unit,
    schedule: String(schedule || 'Daily by appointment').trim().slice(0, 100),
    access_instructions: String(access_instructions || 'Ring doorbell or call upon arrival').trim().slice(0, 300),
    status: 'pending', // Starts as pending review
    created_at: new Date().toISOString(),
    admin_notes: null,
    is_homeowner: true,
  };

  const current = safeGetItem(STORAGE_KEYS.HOME_CHARGERS, []);
  const list = Array.isArray(current) ? current : [];
  list.unshift(newCharger);
  safeSetItem(STORAGE_KEYS.HOME_CHARGERS, list);

  return {
    success: true,
    message: 'Your charger listing was submitted! It is now Pending Review in the Admin Portal and will appear on the public map once approved.',
    charger: newCharger,
  };
}

/**
 * Updates a homeowner charger listing (e.g. edit price, schedule, access instructions, or pause/resume).
 * @param {string} id
 * @param {Partial<any>} updates
 * @returns {{ success: boolean, message: string, charger?: any }}
 */
export function updateHomeCharger(id, updates) {
  const current = safeGetItem(STORAGE_KEYS.HOME_CHARGERS, []);
  if (!Array.isArray(current)) return { success: false, message: 'Charger listing not found.' };

  const index = current.findIndex(c => c.id === id);
  if (index === -1) return { success: false, message: 'Charger listing not found.' };

  const existing = current[index];
  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  current[index] = updated;
  safeSetItem(STORAGE_KEYS.HOME_CHARGERS, current);

  return {
    success: true,
    message: 'Charger listing updated successfully.',
    charger: updated,
  };
}

/**
 * Removes a homeowner charger listing.
 * @param {string} id
 * @returns {boolean}
 */
export function deleteHomeCharger(id) {
  const current = safeGetItem(STORAGE_KEYS.HOME_CHARGERS, []);
  if (!Array.isArray(current)) return false;

  const filtered = current.filter(c => c.id !== id);
  safeSetItem(STORAGE_KEYS.HOME_CHARGERS, filtered);
  recordAdminAudit('DELETE_LISTING', 'home_charger', id, 'Listing deleted');
  return true;
}

/**
 * Admin action: Update listing status (Approve, Decline, Pause, Pending).
 * @param {string} id
 * @param {'approved'|'declined'|'paused'|'pending'} newStatus
 * @param {string} [adminNotes]
 * @returns {{ success: boolean, message: string }}
 */
export function adminSetListingStatus(id, newStatus, adminNotes = '') {
  const valid = ['approved', 'declined', 'paused', 'pending'];
  if (!valid.includes(newStatus)) {
    return { success: false, message: 'Invalid status.' };
  }

  const res = updateHomeCharger(id, {
    status: newStatus,
    admin_notes: adminNotes || null,
    declined_reason: newStatus === 'declined' ? (adminNotes || 'Declined by administrator') : null,
    reviewed_at: new Date().toISOString(),
  });

  if (res.success) {
    recordAdminAudit('SET_STATUS', 'home_charger', id, `Status updated to ${newStatus}. Notes: ${adminNotes || 'None'}`);
    return {
      success: true,
      message: `Listing status successfully updated to ${newStatus.toUpperCase()}.`,
      charger: res.charger,
    };
  }

  return res;
}

// ============================================================================
// 6. DRIVER BOOKING REQUESTS FOR HOME CHARGERS
// ============================================================================

/**
 * Submits a booking request from an EV driver to a private homeowner.
 * @param {Object} payload
 * @returns {{ success: boolean, message: string, booking?: any }}
 */
export function addBookingRequest(payload) {
  const charger_id = payload.charger_id;
  const driver_name = payload.driver_name;
  const driver_contact = payload.driver_contact || payload.driver_phone || payload.phone || payload.contact;
  const vehicle_model = payload.vehicle_model;
  const requested_slot = payload.requested_slot || (payload.date && payload.time_slot ? `${payload.date} ${payload.time_slot}` : payload.date || payload.time_slot);
  const duration_hours = payload.duration_hours || 2;
  const driver_notes = payload.driver_notes || payload.notes || '';

  if (!charger_id) return { success: false, message: 'Charger ID is required.' };
  if (!driver_name || String(driver_name).trim().length < 2) {
    return { success: false, message: 'Please enter your name.' };
  }
  if (!driver_contact || String(driver_contact).trim().length < 5) {
    return { success: false, message: 'Please provide phone or WhatsApp contact.' };
  }
  if (!requested_slot) {
    return { success: false, message: 'Please select a date and time slot.' };
  }

  const homeChargers = getHomeChargers('all');
  const targetCharger = homeChargers.find(c => String(c.id) === String(charger_id));

  const newBooking = {
    id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    charger_id,
    charger_title: targetCharger ? targetCharger.title : 'Home Charger',
    owner_name: targetCharger ? targetCharger.owner_name : 'Host',
    owner_contact: targetCharger ? targetCharger.owner_contact : '',
    driver_name: String(driver_name).trim().slice(0, 60),
    driver_contact: String(driver_contact).trim().slice(0, 50),
    vehicle_model: String(vehicle_model || 'EV').trim().slice(0, 60),
    requested_slot,
    duration_hours: Number(duration_hours) || 2,
    driver_notes: String(driver_notes).trim().slice(0, 200),
    status: 'pending_host', // 'pending_host' | 'confirmed' | 'declined' | 'cancelled'
    created_at: new Date().toISOString(),
    local_prototype: true,
  };

  const bookings = safeGetItem(STORAGE_KEYS.BOOKINGS, []);
  const list = Array.isArray(bookings) ? bookings : [];
  list.unshift(newBooking);
  safeSetItem(STORAGE_KEYS.BOOKINGS, list);

  return {
    success: true,
    message: 'Booking request sent to host! (Simulated local prototype). Exact address will be revealed upon host confirmation.',
    booking: newBooking,
  };
}

/**
 * Retrieves booking requests (optionally filtered by charger_id).
 * @param {string|null} [chargerId]
 * @returns {Array<any>}
 */
export function getBookingRequests(chargerId = null) {
  const bookings = safeGetItem(STORAGE_KEYS.BOOKINGS, []);
  if (!Array.isArray(bookings)) return [];
  if (!chargerId) return bookings;
  return bookings.filter(b => String(b.charger_id) === String(chargerId));
}

/**
 * Updates a booking request status (confirmed / accepted / declined / cancelled).
 * @param {string} bookingId
 * @param {'confirmed'|'accepted'|'declined'|'cancelled'} newStatus
 * @returns {{ success: boolean, booking?: any }}
 */
export function updateBookingStatus(bookingId, newStatus) {
  const normalizedStatus = newStatus === 'accepted' ? 'confirmed' : newStatus;
  const bookings = safeGetItem(STORAGE_KEYS.BOOKINGS, []);
  if (!Array.isArray(bookings)) return { success: false, message: 'No bookings found' };

  let updatedBooking = null;
  const updated = bookings.map(b => {
    if (b.id === bookingId) {
      updatedBooking = { ...b, status: normalizedStatus, updated_at: new Date().toISOString() };
      return updatedBooking;
    }
    return b;
  });
  safeSetItem(STORAGE_KEYS.BOOKINGS, updated);
  return { success: Boolean(updatedBooking), booking: updatedBooking };
}

// ============================================================================
// 7. COMPLAINTS & PUBLIC CHARGER REQUESTS
// ============================================================================

/**
 * Retrieves complaints.
 * @returns {Array<any>}
 */
export function getComplaints() {
  const complaints = safeGetItem(STORAGE_KEYS.COMPLAINTS, []);
  return Array.isArray(complaints) ? complaints : [];
}

/**
 * Adds a new complaint.
 * @param {Object} payload
 * @returns {{ success: boolean, message: string, complaint?: any }}
 */
export function addComplaint(payload) {
  const charger_id = payload.charger_id || payload.target_id || 'general';
  const charger_title = payload.charger_title || payload.subject || 'General Station Issue';
  const complainant_name = payload.complainant_name || 'Anonymous EV Driver';
  const complainant_contact = payload.complainant_contact || payload.contact || '';
  const issue_type = payload.issue_type || payload.category || 'Broken Equipment';
  const description = payload.description || payload.message || '';

  if (!description || description.trim().length < 5) {
    return { success: false, message: 'Please provide at least 5 characters describing the complaint.' };
  }

  const newComplaint = {
    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    charger_id,
    charger_title,
    complainant_name,
    complainant_contact,
    issue_type,
    description: description.trim().slice(0, 500),
    status: 'open', // 'open' | 'in_progress' | 'resolved'
    created_at: new Date().toISOString(),
    admin_notes: '',
  };

  const list = getComplaints();
  list.unshift(newComplaint);
  safeSetItem(STORAGE_KEYS.COMPLAINTS, list);

  return {
    success: true,
    message: 'Complaint recorded locally. Administrators can review and take action in the Admin Portal.',
    complaint: newComplaint,
  };
}

/**
 * Updates complaint status (Admin action).
 * @param {string} complaintId
 * @param {'open'|'in_progress'|'resolved'} newStatus
 * @param {string} [adminNotes]
 * @returns {{ success: boolean, complaint?: any }}
 */
export function updateComplaintStatus(complaintId, newStatus, adminNotes = '') {
  const list = getComplaints();
  let updatedComplaint = null;
  const updated = list.map(c => {
    if (c.id === complaintId) {
      updatedComplaint = { ...c, status: newStatus, admin_notes: adminNotes || c.admin_notes, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : c.resolved_at };
      return updatedComplaint;
    }
    return c;
  });
  safeSetItem(STORAGE_KEYS.COMPLAINTS, updated);
  recordAdminAudit('UPDATE_COMPLAINT', 'complaint', complaintId, `Status: ${newStatus}. Note: ${adminNotes || 'None'}`);
  return { success: Boolean(updatedComplaint), complaint: updatedComplaint };
}

/**
 * Retrieves public charger requests.
 * @returns {Array<any>}
 */
export function getChargerRequests() {
  const requests = safeGetItem(STORAGE_KEYS.CHARGER_REQUESTS, []);
  return Array.isArray(requests) ? requests : [];
}

/**
 * Updates public charger request status (Admin action).
 * @param {string} requestId
 * @param {'under_review'|'planned'|'approved'|'rejected'} newStatus
 * @param {string} [adminNotes]
 * @returns {{ success: boolean, request?: any }}
 */
export function updateChargerRequestStatus(requestId, newStatus, adminNotes = '') {
  const list = getChargerRequests();
  let updatedReq = null;
  const updated = list.map(r => {
    if (r.id === requestId) {
      updatedReq = { ...r, status: newStatus, admin_notes: adminNotes || r.admin_notes };
      return updatedReq;
    }
    return r;
  });
  safeSetItem(STORAGE_KEYS.CHARGER_REQUESTS, updated);
  recordAdminAudit('UPDATE_REQUEST', 'charger_request', requestId, `Status: ${newStatus}. Note: ${adminNotes || 'None'}`);
  return { success: Boolean(updatedReq), request: updatedReq };
}

// ============================================================================
// 8. ADMIN AUDIT & DECISION HISTORY
// ============================================================================

/**
 * Records an administrator action in the audit log.
 * @param {string} action
 * @param {string} entityType
 * @param {string|number} entityId
 * @param {string} notes
 */
export function recordAdminAudit(action, entityType, entityId, notes) {
  const logItem = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action,
    entity_type: entityType,
    entity_id: entityId,
    notes,
    timestamp: new Date().toISOString(),
    admin_user: 'Admin (Local Demo Session)',
  };

  const logs = safeGetItem(STORAGE_KEYS.ADMIN_AUDIT, []);
  const list = Array.isArray(logs) ? logs : [];
  list.unshift(logItem);
  safeSetItem(STORAGE_KEYS.ADMIN_AUDIT, list.slice(0, 100)); // Keep latest 100 entries
}

/**
 * Retrieves admin audit log entries.
 * @returns {Array<any>}
 */
export function getAdminAuditLog() {
  const logs = safeGetItem(STORAGE_KEYS.ADMIN_AUDIT, []);
  return Array.isArray(logs) ? logs : [];
}

// ============================================================================
// EXPORT COMPREHENSIVE ADAPTER OBJECT
// ============================================================================
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
  setFeedbackReviewed,
  getHomeChargers,
  getApprovedHomeChargers,
  addHomeCharger,
  updateHomeCharger,
  deleteHomeCharger,
  adminSetListingStatus,
  addBookingRequest,
  getBookingRequests,
  updateBookingStatus,
  getComplaints,
  addComplaint,
  updateComplaintStatus,
  getChargerRequests,
  updateChargerRequestStatus,
  recordAdminAudit,
  getAdminAuditLog,
};

export default StorageAdapter;
