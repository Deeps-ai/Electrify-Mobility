import { useState, useEffect, useMemo, useCallback } from 'react';
import { DELHI_NCR_STATIONS } from './data';
import MapComponent from './MapComponent';
import HomeownerListingModal from './components/HomeownerListingModal';
import HomeownerBookingModal from './components/HomeownerBookingModal';
import AdminPortal from './components/AdminPortal';
import {
  getStations,
  getReportsByStation,
  addReport,
  getReviews,
  addReview,
  submitFeedback,
  getLocalFeedbackList,
  getThrottleStatus,
  getHomeChargers,
} from './services/storageAdapter';
import { 
  Search, 
  Zap, 
  MapPin, 
  Locate, 
  CheckCircle2, 
  Navigation, 
  X, 
  Activity, 
  Clock, 
  Star, 
  MessageSquare, 
  Info, 
  AlertTriangle,
  Home,
  Shield,
  Lock
} from 'lucide-react';

/**
 * Formats ISO timestamp to human-readable relative time using a reactive `now` timestamp.
 * Avoids direct Date.now() calls during render for React 19 purity.
 * @param {string} isoString
 * @param {number} now
 * @returns {string}
 */
function formatRelativeTime(isoString, now) {
  if (!isoString) return '';
  const time = new Date(isoString).getTime();
  if (Number.isNaN(time)) return '';
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function App() {
  // Navigation / View Mode: 'app' (Driver Map) vs 'admin' (Admin Portal as separate interface)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) ? 'admin' : 'app';
    }
    return 'app';
  });

  // Base data states
  const [publicStations, setPublicStations] = useState(DELHI_NCR_STATIONS);
  const [homeChargers, setHomeChargers] = useState(() => getHomeChargers('all'));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  
  const [activeRoute, setActiveRoute] = useState(null);
  const [focusedStation, setFocusedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Reactive time and local storage states
  const [now, setNow] = useState(() => Date.now());
  const [reportsByStation, setReportsByStation] = useState(() => getReportsByStation(Date.now()));
  const [reviewsList, setReviewsList] = useState(() => getReviews());
  const [localFeedbackItems, setLocalFeedbackItems] = useState(() => getLocalFeedbackList());

  // Modals state
  const [bookingModal, setBookingModal] = useState(null); // Public station reservation
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Homeowner Modals state
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedBookingHomeCharger, setSelectedBookingHomeCharger] = useState(null);

  // Status Report Modal state
  const [reportModal, setReportModal] = useState(null);
  const [reportStatus, setReportStatus] = useState('working');
  const [reportWaitMinutes, setReportWaitMinutes] = useState(0);
  const [reportNote, setReportNote] = useState('');
  const [reportThrottleState, setReportThrottleState] = useState({ isThrottled: false, remainingSeconds: 0, remainingMinutes: 0 });
  const [reportFeedbackMsg, setReportFeedbackMsg] = useState(null);

  // Reviews Modal state
  const [reviewsModal, setReviewsModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);

  // General Feedback Modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('suggestion');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);

  // 1. Sync viewMode with URL hash (#admin)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setViewMode('admin');
      } else {
        setViewMode('app');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigateToAdmin = () => {
    setViewMode('admin');
    if (typeof window !== 'undefined') {
      window.location.hash = '#admin';
    }
  };

  const navigateToApp = () => {
    setViewMode('app');
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  // 2. Load stations & homeowner chargers via storage adapter
  const refreshAllData = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setReportsByStation(getReportsByStation(current));
    setReviewsList(getReviews());
    setHomeChargers(getHomeChargers('all'));
    setLocalFeedbackItems(getLocalFeedbackList());
  }, []);

  useEffect(() => {
    async function loadData() {
      const data = await getStations();
      if (Array.isArray(data) && data.length > 0) {
        setPublicStations(data);
      }
      refreshAllData();
    }
    loadData();
  }, [refreshAllData]);

  // 3. Periodic timer (every 60s) and window focus listeners
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      setReportsByStation(getReportsByStation(current));
    }, 60000);

    const handleFocus = () => {
      refreshAllData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshAllData]);

  // 4. Combined discovery list: Public stations + Approved homeowner chargers
  const allChargers = useMemo(() => {
    const approvedHomes = homeChargers.filter(c => c.status === 'approved');
    return [...publicStations, ...approvedHomes];
  }, [publicStations, homeChargers]);

  // 5. Rating stats per station (calculated from local reviews)
  const ratingsByStation = useMemo(() => {
    const map = {};
    allChargers.forEach(st => {
      const stationReviews = reviewsList.filter(r => String(r.station_id) === String(st.id));
      if (stationReviews.length === 0) {
        map[st.id] = { averageRating: null, reviewCount: 0 };
      } else {
        const sum = stationReviews.reduce((acc, r) => acc + r.rating, 0);
        map[st.id] = { 
          averageRating: Number((sum / stationReviews.length).toFixed(1)), 
          reviewCount: stationReviews.length 
        };
      }
    });
    return map;
  }, [allChargers, reviewsList]);

  // 6. Charger filtering (by search, type: ALL | PUBLIC | HOME | DC_FAST | AC_SLOW, and region)
  const filteredStations = useMemo(() => {
    return allChargers.filter(st => {
      const titleStr = (st.title || '').toLowerCase();
      const addrStr = (st.address || st.exact_address || st.approx_address || '').toLowerCase();
      const operatorStr = (st.operator || st.owner_name || '').toLowerCase();
      const query = search.toLowerCase();

      const matchSearch = titleStr.includes(query) || addrStr.includes(query) || operatorStr.includes(query);

      let matchType = true;
      if (typeFilter === 'PUBLIC') {
        matchType = !st.is_homeowner;
      } else if (typeFilter === 'HOME') {
        matchType = Boolean(st.is_homeowner);
      } else if (typeFilter === 'DC_FAST') {
        matchType = st.type === 'DC_FAST';
      } else if (typeFilter === 'AC_SLOW') {
        matchType = st.type === 'AC_SLOW' || st.is_homeowner;
      }

      const matchRegion = regionFilter === 'ALL' || st.region === regionFilter;
      return matchSearch && matchType && matchRegion;
    });
  }, [allChargers, search, typeFilter, regionFilter]);

  // Handle card click: focus station and smooth scroll map on mobile
  const handleStationClick = (st) => {
    setFocusedStation({ ...st });
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const mapEl = document.getElementById('map-container');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Status report modal actions
  const openReportModal = useCallback((st) => {
    setReportModal(st);
    setReportStatus('working');
    setReportWaitMinutes(0);
    setReportNote('');
    setReportFeedbackMsg(null);

    const throttle = getThrottleStatus(st.id, Date.now());
    setReportThrottleState(throttle);
  }, []);

  const submitStatusReport = (e) => {
    e.preventDefault();
    if (!reportModal) return;

    const submissionTime = Date.now();
    const result = addReport({
      station_id: reportModal.id,
      status: reportStatus,
      note: reportNote,
      wait_minutes: reportWaitMinutes,
    }, submissionTime);

    if (!result.success) {
      if (result.throttled) {
        setReportThrottleState({
          isThrottled: true,
          remainingSeconds: result.remainingSeconds || 300,
          remainingMinutes: Math.ceil((result.remainingSeconds || 300) / 60),
        });
      }
      setReportFeedbackMsg({ type: 'error', text: result.message });
      return;
    }

    setNow(submissionTime);
    setReportsByStation(getReportsByStation(submissionTime));
    setReportFeedbackMsg({ type: 'success', text: result.message });

    setTimeout(() => {
      setReportModal(null);
      setReportFeedbackMsg(null);
    }, 1500);
  };

  // Review modal actions
  const openReviewsModal = useCallback((st) => {
    setReviewsModal(st);
    setReviewRating(5);
    setReviewComment('');
    setReviewAuthor('');
    setReviewError(null);
    setReviewSuccess(null);
  }, []);

  const submitReviewHandler = (e) => {
    e.preventDefault();
    if (!reviewsModal) return;

    setReviewError(null);
    setReviewSuccess(null);

    const result = addReview({
      station_id: reviewsModal.id,
      rating: reviewRating,
      comment: reviewComment,
      author_name: reviewAuthor,
    });

    if (!result.success) {
      setReviewError(result.message);
      return;
    }

    setReviewSuccess(result.message);
    setReviewComment('');
    setReviewsList(getReviews());

    setTimeout(() => {
      setReviewSuccess(null);
    }, 3000);
  };

  // General feedback actions
  const openGeneralFeedback = (initialCategory = 'suggestion') => {
    setFeedbackModalOpen(true);
    setFeedbackCategory(initialCategory);
    setFeedbackMessage('');
    setFeedbackContact('');
    setFeedbackError(null);
    setFeedbackSuccess(null);
    setShowFeedbackHistory(false);
  };

  const submitGeneralFeedback = (e) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    const result = submitFeedback({
      category: feedbackCategory,
      message: feedbackMessage,
      contact: feedbackContact,
    });

    if (!result.success) {
      setFeedbackError(result.message);
      return;
    }

    setFeedbackSuccess(result.message);
    setFeedbackMessage('');
    setFeedbackContact('');
    setLocalFeedbackItems(getLocalFeedbackList());
  };

  const currentStationReviews = useMemo(() => {
    if (!reviewsModal) return [];
    return reviewsList.filter(r => String(r.station_id) === String(reviewsModal.id));
  }, [reviewsModal, reviewsList]);

  // Public booking actions (Phase 1 local simulation)
  const openBooking = (st) => {
    setBookingModal(st);
    setSelectedSlot(null);
  };

  const confirmBooking = () => {
    if (!selectedSlot) {
      alert("Please select a time slot first.");
      return;
    }

    const bookingKey = `res_${bookingModal.id}_${selectedSlot}`;
    if (typeof window !== 'undefined' && window.localStorage?.getItem(bookingKey)) {
      alert(`This time slot (${selectedSlot}) is already reserved for this station. Please choose another slot.`);
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(bookingKey, 'reserved');
      }
    } catch {
      // Safe fallback
    }

    alert(`Reservation confirmed for ${bookingModal.title}!\nSlot: ${selectedSlot}\n(Saved locally on this device)`);
    setSelectedSlot(null);
    setBookingModal(null);
  };

  // Routing helper
  const startRoute = (st) => {
    if (!userLocation) {
      alert("Tap Near Me first to retrieve your location.");
      return;
    }
    setActiveRoute({ ...st, _reqId: Date.now() });
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const mapEl = document.getElementById('map-container');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Geolocation helper
  const locateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
      },
      (error) => {
        let msg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please enable location access in browser settings to locate chargers near you.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location information is currently unavailable.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please try again.";
        }
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // RENDER ADMIN PORTAL IF ON ADMIN ROUTE / VIEW MODE
  if (viewMode === 'admin') {
    return <AdminPortal onExit={navigateToApp} />;
  }

  // RENDER MAIN DRIVER & HOMEOWNER DISCOVERY EXPERIENCE
  return (
    <div className="bg-gray-950 text-gray-100 font-sans h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <header className="safe-header h-14 sm:h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 sm:px-6 z-20 shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 bg-emerald-500 text-gray-950 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight">
                Electrify <span className="text-emerald-400">Mobility</span>
              </h1>
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Public & Home Chargers
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {activeRoute && (
            <button 
              type="button"
              onClick={() => setActiveRoute(null)} 
              className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-medium px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer"
              title="Clear active route"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
              <span className="hidden min-[400px]:inline">Clear</span>
            </button>
          )}

          {/* Homeowner Charger Listing Button */}
          <button 
            type="button"
            onClick={() => setIsListingModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer shadow-sm"
            title="List your private home EV charger for rent"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
            <span className="hidden min-[480px]:inline">List Charger</span>
          </button>

          <button 
            type="button"
            onClick={() => openGeneralFeedback('suggestion')}
            className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-medium px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            title="Send local feedback"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> 
            <span className="hidden min-[580px]:inline">Feedback</span>
          </button>

          <button 
            type="button"
            onClick={locateUser} 
            className="flex items-center gap-1 bg-gray-800 text-emerald-400 border border-emerald-500/30 font-medium px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            title="Locate nearest chargers"
          >
            <Locate className="w-3.5 h-3.5" /> 
            <span className="hidden min-[580px]:inline">Near Me</span>
          </button>

          {/* Admin Portal Gateway */}
          <button 
            type="button"
            onClick={navigateToAdmin}
            className="flex items-center gap-1 bg-gray-900 hover:bg-purple-950/60 text-purple-400 border border-purple-800/80 font-bold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            title="Switch to Admin Portal (Approvals & Complaints)"
          >
            <Shield className="w-3.5 h-3.5" /> 
            <span className="hidden min-[680px]:inline">Admin</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Column on mobile (Map 45% on top, Sidebar 55% scrollable below), Row on md+ (Sidebar left, Map right) */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 relative overflow-hidden">
        {/* Sidebar / Station List */}
        <aside className="order-2 md:order-1 w-full md:w-[450px] flex-1 md:flex-none md:h-full bg-gray-900 border-t md:border-t-0 md:border-r border-gray-800 flex flex-col z-10 shadow-2xl min-h-0">
          
          {/* Phase 1 Local Notice Banner */}
          <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-3 py-1.5 text-[11px] text-emerald-300 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Public stations & rentable home chargers (Prototype)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsListingModalOpen(true)}
              className="text-[10px] text-purple-400 hover:underline font-bold"
            >
              + List Mine
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-2.5 sm:p-4 border-b border-gray-800 space-y-2 sm:space-y-3 bg-gray-900/90 backdrop-blur shrink-0 max-h-[120px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search station, host, or area..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-emerald-500 transition" 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)} 
                className="bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Chargers (Public & Home)</option>
                <option value="PUBLIC">⚡ Public Stations Only</option>
                <option value="HOME">🏠 Rentable Home Chargers</option>
                <option value="DC_FAST">⚡ DC Fast Only</option>
                <option value="AC_SLOW">🔌 Level 2 AC Only</option>
              </select>
              <select 
                value={regionFilter} 
                onChange={e => setRegionFilter(e.target.value)} 
                className="bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All NCR Regions</option>
                <option value="Delhi">Delhi</option>
                <option value="Gurugram">Gurugram</option>
                <option value="Noida">Noida</option>
                <option value="Ghaziabad">Ghaziabad</option>
              </select>
            </div>
          </div>

          <div className="px-3 sm:px-4 py-2 bg-gray-950 border-b border-gray-800/80 flex justify-between text-xs font-semibold text-gray-400 shrink-0">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> AVAILABLE IN NCR</span>
            <span className="text-emerald-400 font-bold">{filteredStations.length} Chargers</span>
          </div>

          {/* Scrollable station cards list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 safe-bottom min-h-0">
            {filteredStations.map(st => {
              const ratingStats = ratingsByStation[st.id];

              // ======================================================
              // HOMEOWNER RENTABLE CHARGER CARD
              // ======================================================
              if (st.is_homeowner) {
                const displayAddress = st.is_address_public
                  ? (st.exact_address || st.address)
                  : (st.approx_address || `${st.region} (Approximate area)`);

                return (
                  <div
                    key={st.id}
                    onClick={() => handleStationClick(st)}
                    className="bg-gray-900 border border-purple-900/50 hover:border-purple-500 rounded-xl p-3 sm:p-4 transition cursor-pointer group shadow-sm relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                          🏠 Rentable Home Charger
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                          Host: {st.owner_name}
                        </span>
                      </div>

                      <span className="font-black text-purple-400 text-xs shrink-0">
                        {st.price}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-100 text-sm mt-2 group-hover:text-purple-400 transition leading-snug">
                      {st.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-start gap-1 leading-normal">
                      <MapPin className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                      <span>{displayAddress}</span>
                    </p>

                    {!st.is_address_public && (
                      <p className="text-[10px] text-purple-300 font-medium mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>Approximate location shown. Exact address revealed upon booking confirmation.</span>
                      </p>
                    )}

                    {/* Specs pill */}
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] bg-purple-950/30 p-2 rounded-lg border border-purple-900/40 text-gray-300">
                      <div><span className="text-gray-500">Power:</span> <strong>{st.power_kw} kW</strong></div>
                      <div className="truncate"><span className="text-gray-500">Plug:</span> <strong>{st.connector}</strong></div>
                      <div className="col-span-2 truncate text-[10px] text-gray-400">🕒 {st.schedule}</div>
                    </div>

                    {/* Actions */}
                    <div className="mt-2.5 pt-2.5 border-t border-gray-800 flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openReviewsModal(st); }}
                        className="flex items-center gap-1 text-amber-400 font-bold hover:underline cursor-pointer bg-gray-950/60 px-2 py-0.5 rounded border border-gray-800"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{ratingStats?.averageRating ? `${ratingStats.averageRating} (${ratingStats.reviewCount})` : 'Reviews'}</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedBookingHomeCharger(st); }}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition font-bold cursor-pointer text-xs shadow-sm"
                        >
                          Request Booking
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startRoute(st); }} 
                          className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer text-xs"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Route
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // ======================================================
              // PUBLIC STATION CARD
              // ======================================================
              const isFast = st.type === 'DC_FAST';
              const report = reportsByStation[st.id];
              const status = report?.status;

              const statusBadge = status === 'working' 
                ? { label: '🟢 Working', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
                : status === 'broken'
                ? { label: '🔴 Broken', color: 'bg-red-500/10 text-red-400 border-red-500/30' }
                : status === 'occupied'
                ? { label: '🟡 Occupied', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
                : null;

              return (
                <div 
                  key={st.id} 
                  onClick={() => handleStationClick(st)} 
                  className="bg-gray-900 border border-gray-800 hover:border-emerald-500/50 rounded-xl p-3 sm:p-4 transition cursor-pointer group shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${isFast ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'} border`}>
                        {isFast ? '⚡ DC Fast' : '🔌 AC Slow'}
                      </span>
                      {statusBadge ? (
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-gray-800 text-gray-400 border-gray-700">
                          Normal Status
                        </span>
                      )}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openReportModal(st); }} 
                      className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-lg text-xs font-semibold border border-gray-700 transition shrink-0 cursor-pointer"
                      title="Report live charger status"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-400" /> Report
                    </button>
                  </div>

                  <h3 className="font-bold text-gray-100 text-sm mt-2 group-hover:text-emerald-400 transition leading-snug">{st.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 leading-normal">
                    <MapPin className="w-3 h-3 shrink-0" /> {st.address}
                  </p>

                  {/* Rating & Reviews row */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openReviewsModal(st); }}
                      className="flex items-center gap-1 text-amber-400 font-bold hover:underline cursor-pointer bg-gray-950/60 px-2 py-0.5 rounded border border-gray-800"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{ratingStats?.averageRating ? `${ratingStats.averageRating} (${ratingStats.reviewCount})` : 'Reviews'}</span>
                    </button>
                    <span className="text-emerald-400 font-bold text-xs">{st.price || 'N/A'}</span>
                  </div>

                  {/* Active Report Banner */}
                  {report ? (
                    <div className="mt-2 text-[11px] text-gray-300 bg-gray-950/70 p-2 rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3 text-emerald-400" /> 
                          Updated {report.minutesAgo === 0 ? 'just now' : `${report.minutesAgo} min ago`}
                        </span>
                        {report.wait_minutes > 0 && (
                          <span className="text-amber-400 font-semibold">Wait ~{report.wait_minutes}m</span>
                        )}
                      </div>
                      {report.note && (
                        <p className="mt-1 text-gray-400 italic text-[10px] break-words">
                          &ldquo;{report.note}&rdquo;
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[10px] text-gray-500 italic">
                      No status reports in last 2 hrs (Standard status active)
                    </div>
                  )}

                  {/* Station action row */}
                  <div className="mt-2.5 pt-2.5 border-t border-gray-800 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-gray-400">{st.connectors?.join(', ') || 'Standard Plug'}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openBooking(st); }} 
                        className="bg-gray-800 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-lg transition font-semibold cursor-pointer text-xs"
                      >
                        Reserve
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startRoute(st); }} 
                        className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer text-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Route
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Map Area */}
        <main id="map-container" className="order-1 md:order-2 w-full md:w-auto h-[45%] md:h-full md:flex-1 min-h-[250px] md:min-h-0 relative bg-gray-800 shrink-0 md:shrink">
          <MapComponent 
            stations={filteredStations} 
            focusedStation={focusedStation} 
            activeRoute={activeRoute} 
            userLocation={userLocation} 
            onReserve={openBooking} 
            onRoute={startRoute}
            onReport={openReportModal}
            onOpenReviews={openReviewsModal}
            onRequestBooking={(charger) => setSelectedBookingHomeCharger(charger)}
            reportsByStation={reportsByStation}
            ratingsByStation={ratingsByStation}
          />
        </main>
      </div>

      {/* ====================================================================== */}
      {/* HOMEOWNER LISTING MODAL */}
      {/* ====================================================================== */}
      <HomeownerListingModal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        homeChargers={homeChargers}
        onRefresh={refreshAllData}
      />

      {/* ====================================================================== */}
      {/* HOMEOWNER BOOKING REQUEST MODAL */}
      {/* ====================================================================== */}
      <HomeownerBookingModal
        isOpen={Boolean(selectedBookingHomeCharger)}
        onClose={() => setSelectedBookingHomeCharger(null)}
        charger={selectedBookingHomeCharger}
        onBookingSuccess={() => refreshAllData()}
      />

      {/* ====================================================================== */}
      {/* MODAL 1: STATUS REPORT MODAL */}
      {/* ====================================================================== */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 sm:p-6 relative shadow-2xl max-h-[90dvh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => setReportModal(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-lg text-gray-100">Report Station Status</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">{reportModal.title}</p>

            <div className="bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-300 mb-4 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Local Storage Mode: </span>
                Status reports expire after 2 hours. Reports are stored in this browser only and throttled to 1 report every 5 minutes per charger.
              </div>
            </div>

            {reportThrottleState.isThrottled && (
              <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-300 mb-4 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Cooldown active: </span>
                  You recently reported this charger. Please wait <span className="font-bold underline">{reportThrottleState.remainingMinutes} min ({reportThrottleState.remainingSeconds}s)</span> before submitting another update.
                </div>
              </div>
            )}

            {reportFeedbackMsg && (
              <div className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${reportFeedbackMsg.type === 'error' ? 'bg-red-950/50 border border-red-500/40 text-red-300' : 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'}`}>
                {reportFeedbackMsg.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{reportFeedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={submitStatusReport} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Live Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReportStatus('working')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      reportStatus === 'working' 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/30' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>🟢 Working</span>
                    <span className="text-[9px] font-normal text-gray-400">Ready to charge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportStatus('occupied')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      reportStatus === 'occupied' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/30' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>🟡 Occupied</span>
                    <span className="text-[9px] font-normal text-gray-400">All guns in use</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportStatus('broken')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      reportStatus === 'broken' 
                        ? 'bg-red-500/20 border-red-500 text-red-400 ring-2 ring-red-500/30' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>🔴 Broken</span>
                    <span className="text-[9px] font-normal text-gray-400">Out of order</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Estimated Wait Time (minutes)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="180" 
                  value={reportWaitMinutes} 
                  onChange={(e) => setReportWaitMinutes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Short Note (Optional, max 200 chars)</label>
                <input 
                  type="text" 
                  maxLength={200}
                  placeholder="e.g. Gun #2 working fine, CCS-2 ready" 
                  value={reportNote} 
                  onChange={(e) => setReportNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-emerald-500" 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={reportThrottleState.isThrottled}
                  className={`w-full font-extrabold py-3 rounded-xl transition flex justify-center items-center gap-2 ${
                    reportThrottleState.isThrottled
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 cursor-pointer shadow-lg'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" /> 
                  {reportThrottleState.isThrottled ? `Throttled (${reportThrottleState.remainingSeconds}s cooldown)` : 'Submit Status Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 2: REVIEWS & RATINGS MODAL */}
      {/* ====================================================================== */}
      {reviewsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 relative shadow-2xl max-h-[90dvh] flex flex-col">
            <button 
              type="button"
              onClick={() => setReviewsModal(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              aria-label="Close reviews"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="font-bold text-lg text-gray-100">Charger Reviews & Ratings</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 truncate">{reviewsModal.title}</p>

            <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-amber-400">
                    {ratingsByStation[reviewsModal.id]?.averageRating ? ratingsByStation[reviewsModal.id].averageRating : '—'}
                  </span>
                  <span className="text-xs text-gray-400">/ 5.0</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Based on {currentStationReviews.length} local {currentStationReviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(starNum => {
                  const avg = ratingsByStation[reviewsModal.id]?.averageRating || 0;
                  const isFilled = starNum <= Math.round(avg);
                  return (
                    <Star 
                      key={starNum} 
                      className={`w-4 h-4 ${isFilled ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} 
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3.5">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Write a Review</h4>
                
                {reviewError && (
                  <div className="mb-2 p-2 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs">
                    {reviewError}
                  </div>
                )}
                {reviewSuccess && (
                  <div className="mb-2 p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs">
                    {reviewSuccess}
                  </div>
                )}

                <form onSubmit={submitReviewHandler} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Your Rating</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map(starValue => (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setReviewRating(starValue)}
                          className="p-1 hover:scale-110 transition cursor-pointer"
                          aria-label={`${starValue} stars`}
                        >
                          <Star 
                            className={`w-6 h-6 ${starValue <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-amber-400 ml-2">
                        {reviewRating} Stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Comment (3–500 characters)</label>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="How was your charging experience? Speed, accessibility, cable condition..."
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-100 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={50}
                      value={reviewAuthor}
                      onChange={(e) => setReviewAuthor(e.target.value)}
                      placeholder="Your name or handle (optional)"
                      className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-100 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-4 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0"
                    >
                      Post Review
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Saved Reviews ({currentStationReviews.length})</h4>
                {currentStationReviews.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                    No reviews yet for this charger. Be the first to leave one!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentStationReviews.map(rev => (
                      <div key={rev.id} className="bg-gray-950/50 border border-gray-800/80 rounded-xl p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-200">{rev.author_name || 'EV Driver'}</span>
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star 
                                  key={s} 
                                  className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500">{formatRelativeTime(rev.created_at, now)}</span>
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed mt-1 break-words">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 3: GENERAL FEEDBACK MODAL */}
      {/* ====================================================================== */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 sm:p-6 relative shadow-2xl max-h-[90dvh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => setFeedbackModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              aria-label="Close feedback"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-lg text-gray-100">App Feedback & Suggestions</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Help us improve the Electrify Mobility experience</p>

            <div className="bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-300 mb-4 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Phase 1 Notice: </span>
                Feedback is saved locally in this browser only. It is not transmitted to a remote server or the project team in Phase 1.
              </div>
            </div>

            {feedbackError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{feedbackError}</span>
              </div>
            )}
            {feedbackSuccess && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Recorded! </span>
                  {feedbackSuccess}
                </div>
              </div>
            )}

            <form onSubmit={submitGeneralFeedback} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Feedback Topic</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bug', label: '🐛 Bug Report' },
                    { id: 'missing_charger', label: '⚡ Missing Charger' },
                    { id: 'suggestion', label: '💡 Suggestion' },
                    { id: 'other', label: '💬 Other' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFeedbackCategory(cat.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-left cursor-pointer ${
                        feedbackCategory === cat.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/30'
                          : 'bg-gray-950 border-gray-800 text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Message (5–1000 characters)
                </label>
                <textarea
                  rows={4}
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder={
                    feedbackCategory === 'missing_charger'
                      ? 'Tell us about the charger: Operator, exact location, connector types...'
                      : feedbackCategory === 'bug'
                      ? 'Describe what happened, what device/browser you are on, and steps to reproduce...'
                      : 'Share your feature suggestion or ideas...'
                  }
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Email / Contact (Optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={feedbackContact}
                  onChange={(e) => setFeedbackContact(e.target.value)}
                  placeholder="name@example.com (optional)"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 cursor-pointer shadow-lg text-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Feedback Locally
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-800 text-center">
              <button
                type="button"
                onClick={() => setShowFeedbackHistory(!showFeedbackHistory)}
                className="text-xs text-gray-400 hover:text-emerald-400 transition cursor-pointer"
              >
                {showFeedbackHistory ? 'Hide local feedback history' : `View saved local feedback (${localFeedbackItems.length})`}
              </button>

              {showFeedbackHistory && (
                <div className="mt-2.5 text-left space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {localFeedbackItems.length === 0 ? (
                    <p className="text-[11px] text-gray-500 italic text-center">No feedback recorded on this device yet.</p>
                  ) : (
                    localFeedbackItems.map(item => (
                      <div key={item.id} className="bg-gray-950 p-2 rounded-lg border border-gray-800 text-[11px]">
                        <div className="flex justify-between items-center text-gray-400 font-semibold mb-0.5">
                          <span className="capitalize text-emerald-400">{item.category.replace('_', ' ')}</span>
                          <span className="text-[10px] text-gray-500">{formatRelativeTime(item.created_at, now)}</span>
                        </div>
                        <p className="text-gray-300 break-words">{item.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 4: PUBLIC BOOKING / RESERVATION MODAL */}
      {/* ====================================================================== */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 sm:p-6 relative shadow-2xl max-h-[90dvh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => { setBookingModal(null); setSelectedSlot(null); }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg text-gray-100 mb-1">Reserve Public Slot</h3>
            <p className="text-xs text-gray-400 mb-4">{bookingModal.title}</p>
            
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Time Slot</label>
            <div className="grid grid-cols-3 gap-2 mt-2 mb-6">
              {['10:30 AM', '01:00 PM', '04:30 PM'].map(slot => (
                <button 
                  key={slot} 
                  type="button"
                  onClick={() => setSelectedSlot(slot)} 
                  className={`py-2 rounded-lg transition text-xs font-bold cursor-pointer ${selectedSlot === slot ? 'bg-emerald-500 text-gray-950' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                >
                  {slot}
                </button>
              ))}
            </div>
            
            <button 
              type="button"
              onClick={confirmBooking} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold py-3.5 rounded-xl transition flex justify-center items-center gap-2 cursor-pointer shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5" /> Confirm Reservation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
