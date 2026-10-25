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
  getAdminAuditLog,
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

// TEST 8: Homeowner charger creation & validation
const initialChargers = getHomeChargers();
const newListing = addHomeCharger({
  title: 'Sector 50 Villa Private 11kW Type-2',
  owner_name: 'Vikram Mehta',
  phone: '+91 98765 43210',
  full_address: 'House 42, Block C, Nirvana Country, Sector 50, Gurugram',
  is_address_public: false,
  approx_address: 'Nirvana Country, Sector 50, Gurugram',
  latitude: 28.418,
  longitude: 77.062,
  connector_type: 'Type 2 AC',
  power_kw: 11,
  pricing_rate: 13,
  pricing_unit: 'per_kwh',
  schedule: 'Daily 7:00 PM - 11:00 PM',
  booking_preference: 'in_app',
  access_instructions: 'Ring bell at gate #2. Extension cable available if needed.',
});

assert.strictEqual(newListing.success, true, 'Listing creation should succeed');
assert(newListing.charger && newListing.charger.id, 'Created charger must have an id');
assert.strictEqual(newListing.charger.status, 'pending', 'New listing should start in "pending" status');
assert.strictEqual(newListing.charger.is_address_public, false, 'is_address_public should be preserved');
assert.strictEqual(getHomeChargers().length, initialChargers.length + 1, 'Total chargers should increment by 1');
console.log('✓ TEST 8 Passed: Homeowner charger creation and pending status verified.');

// TEST 9: Admin portal actions on listings (Approve, Pause, Decline)
// It should NOT be in approved list initially
const approvedBefore = getApprovedHomeChargers();
assert(!approvedBefore.some(c => c.id === newListing.charger.id), 'Pending charger must not be in approved list');

// Admin Approves
const approveRes = adminSetListingStatus(newListing.charger.id, 'approved', 'Verified owner contact');
assert.strictEqual(approveRes.success, true);
assert.strictEqual(approveRes.charger.status, 'approved');

const approvedAfter = getApprovedHomeChargers();
assert(approvedAfter.some(c => c.id === newListing.charger.id), 'Approved charger must now be in approved list');

// Admin Pauses
const pauseRes = adminSetListingStatus(newListing.charger.id, 'paused', 'Temporary pause');
assert.strictEqual(pauseRes.success, true);
assert.strictEqual(pauseRes.charger.status, 'paused');
assert(!getApprovedHomeChargers().some(c => c.id === newListing.charger.id), 'Paused charger should not appear in active discovery');

// Admin Declines with reason
const declineRes = adminSetListingStatus(newListing.charger.id, 'declined', 'Address could not be verified');
assert.strictEqual(declineRes.success, true);
assert.strictEqual(declineRes.charger.status, 'declined');
assert.strictEqual(declineRes.charger.declined_reason, 'Address could not be verified');

// Re-approve for downstream tests
adminSetListingStatus(newListing.charger.id, 'approved', 'Re-verified');
console.log('✓ TEST 9 Passed: Admin listing lifecycle (pending -> approved -> paused -> declined) verified.');

// TEST 10: Homeowner edit and delete
const updatedRes = updateHomeCharger(newListing.charger.id, {
  pricing_rate: 14,
  schedule: 'Mon-Fri 6:00 PM - 10:00 PM',
});
assert.strictEqual(updatedRes.success, true);
assert.strictEqual(updatedRes.charger.pricing_rate, 14);
assert.strictEqual(updatedRes.charger.schedule, 'Mon-Fri 6:00 PM - 10:00 PM');
console.log('✓ TEST 10 Passed: Homeowner listing update verified.');

// TEST 11: EV Driver booking requests
const bookingRes = addBookingRequest({
  charger_id: newListing.charger.id,
  driver_name: 'Rohit Sharma',
  driver_phone: '+91 99112 33445',
  vehicle_model: 'Tata Nexon EV Max',
  date: '2026-10-26',
  time_slot: '07:00 PM - 09:00 PM',
  duration_hours: 2,
  notes: 'Need 50% top-up for morning airport run',
});

assert.strictEqual(bookingRes.success, true);
assert(bookingRes.booking && bookingRes.booking.id);
assert.strictEqual(bookingRes.booking.status, 'pending_host');

const hostBookings = getBookingRequests(newListing.charger.id);
assert(hostBookings.some(b => b.id === bookingRes.booking.id), 'Booking request should be retrievable for host');

// Host confirms booking
const confirmedRes = updateBookingStatus(bookingRes.booking.id, 'confirmed');
assert.strictEqual(confirmedRes.success, true);
assert.strictEqual(confirmedRes.booking.status, 'confirmed');
console.log('✓ TEST 11 Passed: Driver booking request creation and host confirmation verified.');

// TEST 12: Complaints & Public Charger Requests
const allCompsInitial = getComplaints();
assert(Array.isArray(allCompsInitial), 'getComplaints returns array');

const compRes = addComplaint({
  category: 'charger_fault',
  subject: 'Gun 2 latch broken',
  description: 'Gun 2 CCS2 latch is cracked and does not lock into Nexon EV.',
  target_id: '201',
  complainant_name: 'Ananya S.',
  contact: 'ananya@example.com',
});
assert.strictEqual(compRes.success, true);
assert.strictEqual(compRes.complaint.status, 'open');

const updateComp = updateComplaintStatus(compRes.complaint.id, 'in_progress', 'Technician dispatched');
assert.strictEqual(updateComp.success, true);
assert.strictEqual(updateComp.complaint.status, 'in_progress');

const allReqs = getChargerRequests();
assert(Array.isArray(allReqs) && allReqs.length > 0, 'getChargerRequests returns requests list');

const updateReq = updateChargerRequestStatus('req_1', 'planned', 'Added to Q1 2027 deployment pipeline');
assert.strictEqual(updateReq.success, true);
assert.strictEqual(updateReq.request.status, 'planned');

// Test deletion of charger
const delSuccess = deleteHomeCharger(newListing.charger.id);
assert.strictEqual(delSuccess, true, 'deleteHomeCharger should return true');
assert(!getHomeChargers().some(c => c.id === newListing.charger.id), 'Deleted charger should not be in list');
console.log('✓ TEST 12 Passed: Complaints, charger requests, and deletion verified.');

// TEST 13: Admin audit logging
const auditLogs = getAdminAuditLog();
assert(Array.isArray(auditLogs) && auditLogs.length >= 3, 'Audit logs should track admin actions');
assert(auditLogs.some(log => log.entity_type === 'home_charger'), 'Should log home charger moderation');
console.log('✓ TEST 13 Passed: Admin audit trail recorded successfully.');

console.log('\nALL 13 TESTS PASSED SUCCESSFULLY! 🚀');
