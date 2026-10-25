import assert from 'node:assert';

// Mock localStorage for Node test environment
const store = new Map();
global.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  },
};

const {
  getActiveReports,
  getReportsByStation,
  addReport,
  getThrottleStatus,
  getReviews,
  getStationRatingStats,
  addReview,
  submitFeedback,
  getLocalFeedbackList,
  REPORT_EXPIRY_MS,
  REPORT_THROTTLE_MS,
} = await import('./src/services/storageAdapter.js');

console.log('--- Testing Storage Adapter (Phase 1) ---');

// TEST 1: Initial stations & seed reviews
const initialReviews = getReviews(201);
assert(initialReviews.length >= 2, 'Expected seed reviews for station 201');
const stats201 = getStationRatingStats(201);
assert(typeof stats201.averageRating === 'number', 'Expected averageRating for 201');
console.log('✓ TEST 1 Passed: Initial reviews and stats initialized safely.');

// TEST 2: Add status report (Working, Broken, Occupied)
const baseTime = 1000000000000;
const report1 = addReport({
  station_id: 201,
  status: 'occupied',
  note: 'Wait ~15 mins, gun #1 busy',
  wait_minutes: 15,
}, baseTime);

assert.strictEqual(report1.success, true, 'Report 1 should succeed');
assert.strictEqual(report1.report.status, 'occupied');
assert.strictEqual(report1.report.wait_minutes, 15);
assert.strictEqual(report1.report.note, 'Wait ~15 mins, gun #1 busy');

const activeReports = getActiveReports(baseTime);
assert(activeReports.some(r => r.station_id === 201 && r.status === 'occupied'), 'Report should be active');

const map = getReportsByStation(baseTime);
assert(map[201], 'Station 201 should have active report');
assert.strictEqual(map[201].minutesAgo, 0);
console.log('✓ TEST 2 Passed: Status report created and retrieved.');

// TEST 3: Throttling (5-minute cooldown per charger per browser)
// Attempt report 2 minutes later for same station
const throttleCheck = getThrottleStatus(201, baseTime + 2 * 60 * 1000);
assert.strictEqual(throttleCheck.isThrottled, true, 'Should be throttled at 2 mins');
assert.strictEqual(throttleCheck.remainingMinutes, 3, 'Should have 3 mins remaining');

const throttledReport = addReport({
  station_id: 201,
  status: 'working',
}, baseTime + 2 * 60 * 1000);

assert.strictEqual(throttledReport.success, false, 'Throttled submission should fail');
assert.strictEqual(throttledReport.throttled, true, 'Should return throttled flag');
assert(throttledReport.message.includes('Throttled'), 'Should include friendly throttle message');

// After 5 minutes + 1 second, throttle expires
const unthrottledCheck = getThrottleStatus(201, baseTime + REPORT_THROTTLE_MS + 1000);
assert.strictEqual(unthrottledCheck.isThrottled, false, 'Throttle should expire after 5 minutes');

const secondReport = addReport({
  station_id: 201,
  status: 'working',
  note: 'Now available!',
}, baseTime + REPORT_THROTTLE_MS + 1000);
assert.strictEqual(secondReport.success, true, 'Report after throttle cooldown should succeed');
console.log('✓ TEST 3 Passed: 5-minute throttling enforced and expires properly.');

// TEST 4: Expiration (2 hours)
// Check at 1 hour 59 mins: should still be active
const time1h59m = (baseTime + REPORT_THROTTLE_MS + 1000) + (119 * 60 * 1000);
const activeBeforeExpiry = getReportsByStation(time1h59m);
assert(activeBeforeExpiry[201], 'Report should be active at 1h 59m');

// Check at 2 hours 1 minute: report should be expired and purged
const time2h1m = (baseTime + REPORT_THROTTLE_MS + 1000) + (REPORT_EXPIRY_MS + 60000);
const activeAfterExpiry = getReportsByStation(time2h1m);
assert.strictEqual(activeAfterExpiry[201], undefined, 'Report should be purged and undefined after 2 hours');

const purgedList = getActiveReports(time2h1m);
assert(!purgedList.some(r => r.station_id === 201), 'Expired report purged from storage');
console.log('✓ TEST 4 Passed: 2-hour report expiration and storage purge verified.');

// TEST 5: Charger Reviews & Star Ratings
const initialCount = getReviews(203).length;
const reviewRes = addReview({
  station_id: 203,
  rating: 5,
  comment: 'Great charger right in CP inner circle!',
  author_name: 'Dev P.',
});
assert.strictEqual(reviewRes.success, true);
assert.strictEqual(getReviews(203).length, initialCount + 1);

const stats203 = getStationRatingStats(203);
assert.strictEqual(stats203.averageRating, 5);

// Validation checks for review
const badRating = addReview({ station_id: 203, rating: 6, comment: 'Too high' });
assert.strictEqual(badRating.success, false, 'Rating > 5 should fail');

const shortComment = addReview({ station_id: 203, rating: 4, comment: 'a' });
assert.strictEqual(shortComment.success, false, 'Short comment should fail');
console.log('✓ TEST 5 Passed: Reviews flow, validation, and station average rating verified.');

// TEST 6: General Feedback (Local-only)
const feedbackRes = submitFeedback({
  category: 'missing_charger',
  message: 'New Tata Power 60kW charger open at Mall of India basement.',
  contact: 'driver@example.com',
});
assert.strictEqual(feedbackRes.success, true);
assert(feedbackRes.message.includes('locally'), 'Should disclose local storage');

const allFeedback = getLocalFeedbackList();
assert(allFeedback.some(f => f.category === 'missing_charger'), 'Feedback stored in local list');

// Validation checks for feedback
const emptyFeedback = submitFeedback({ category: 'bug', message: 'err' });
assert.strictEqual(emptyFeedback.success, false, 'Feedback < 5 chars should fail');
console.log('✓ TEST 6 Passed: General feedback flow and local persistence verified.');

// TEST 7: Corrupted / Malformed localStorage resilience
global.window.localStorage.setItem('electrify_local_reports', 'invalid-json{{{');
const resilientReports = getActiveReports();
assert(Array.isArray(resilientReports), 'Should handle malformed reports JSON gracefully without throwing');

global.window.localStorage.setItem('electrify_local_reviews', '["corrupted", 123, null]');
const resilientReviews = getReviews(201);
assert(Array.isArray(resilientReviews), 'Should handle malformed reviews JSON gracefully');
console.log('✓ TEST 7 Passed: Safe error handling and malformed data resilience verified.');

console.log('\nALL 7 TESTS PASSED SUCCESSFULLY! 🚀');
