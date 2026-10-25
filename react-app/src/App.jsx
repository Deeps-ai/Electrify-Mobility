import { useState, useEffect, useMemo } from 'react';
import { DELHI_NCR_STATIONS } from './data';
import MapComponent from './MapComponent';
import { supabase, isSupabaseConfigured, getOrInitUser } from './supabase';
import { 
  Search, 
  Zap, 
  MapPin, 
  Locate, 
  PlusCircle, 
  CheckCircle2, 
  Navigation, 
  X, 
  Activity, 
  Clock 
} from 'lucide-react';

export default function App() {
  const [stations, setStations] = useState(DELHI_NCR_STATIONS);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  
  const [activeRoute, setActiveRoute] = useState(null);
  const [focusedStation, setFocusedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  // Modals
  const [bookingModal, setBookingModal] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [reportModal, setReportModal] = useState(null);
  const [reportStatus, setReportStatus] = useState('working');
  const [reportWaitMinutes, setReportWaitMinutes] = useState(0);
  const [reportNote, setReportNote] = useState('');

  // 1. Fetch stations from Supabase with DELHI_NCR_STATIONS as fallback
  useEffect(() => {
    async function fetchStations() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('stations')
            .select('*')
            .order('id', { ascending: true });
          
          if (!error && data && data.length > 0) {
            setStations(data);
            return;
          }
        } catch (err) {
          console.warn('Could not load stations from Supabase, using local data:', err);
        }
      }
      setStations(DELHI_NCR_STATIONS);
    }
    fetchStations();
  }, []);

  // 2. Fetch reports from last 2 hours and subscribe to Supabase Realtime
  useEffect(() => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    async function fetchReports() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('reports')
            .select('*')
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false });
          
          if (!error && data) {
            setReports(data);
          }
        } catch (err) {
          console.warn('Could not load reports from Supabase:', err);
        }
      }
    }
    fetchReports();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('realtime-reports')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
          setReports(prev => [payload.new, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 3. Process reports: pick latest report per station and compute minutesAgo
  const reportsByStation = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (!map[r.station_id] || new Date(r.created_at) > new Date(map[r.station_id].created_at)) {
        const diffMs = now - new Date(r.created_at).getTime();
        const minutesAgo = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        map[r.station_id] = { ...r, minutesAgo };
      }
    });
    return map;
  }, [reports, now]);

  // 4. Filtering stations
  const filteredStations = useMemo(() => {
    return stations.filter(st => {
      const matchSearch = (st.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (st.address || '').toLowerCase().includes(search.toLowerCase()) ||
                          (st.operator || '').toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'ALL' || st.type === typeFilter;
      const matchRegion = regionFilter === 'ALL' || st.region === regionFilter;
      return matchSearch && matchType && matchRegion;
    });
  }, [stations, search, typeFilter, regionFilter]);

  // Handle station card click: focus and fly to station, smooth scroll map into view on mobile
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
  const openReportModal = (st) => {
    setReportModal(st);
    setReportStatus('working');
    setReportWaitMinutes(0);
    setReportNote('');
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportModal) return;

    const reportPayload = {
      station_id: reportModal.id,
      status: reportStatus,
      wait_minutes: parseInt(reportWaitMinutes, 10) || 0,
      note: reportNote || ''
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const user = await getOrInitUser();
        const { error } = await supabase.from('reports').insert({
          ...reportPayload,
          user_id: user.id
        });

        if (error) {
          alert(`Failed to submit report: ${error.message}`);
          return;
        }
      } catch (err) {
        alert(`Report submission error: ${err.message}`);
        return;
      }
    } else {
      // Local fallback
      const localReport = {
        id: Date.now(),
        ...reportPayload,
        created_at: new Date().toISOString()
      };
      setReports(prev => [localReport, ...prev]);
    }

    alert('Report submitted successfully! Thank you for helping the EV community.');
    setReportModal(null);
  };

  // Booking modal actions
  const openBooking = (st) => {
    setBookingModal(st);
    setSelectedSlot(null);
  };

  const confirmBooking = async () => {
    if (!selectedSlot) {
      alert("Please select a time slot first.");
      return;
    }

    const now = new Date();
    const [time, modifier] = selectedSlot.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000); // 30 min duration

    if (isSupabaseConfigured && supabase) {
      try {
        const user = await getOrInitUser();
        const { error } = await supabase.from('reservations').insert({
          station_id: bookingModal.id,
          user_id: user.id,
          slot_start: slotStart.toISOString(),
          slot_end: slotEnd.toISOString(),
          status: 'confirmed'
        });

        if (error) {
          if (error.code === '23505') {
            alert(`This slot (${selectedSlot}) is already booked for this station. Please choose another slot.`);
          } else {
            alert(`Reservation failed: ${error.message}`);
          }
          return;
        }
      } catch (err) {
        alert(`Reservation error: ${err.message}`);
        return;
      }
    } else {
      // Local fallback constraint check
      const bookingKey = `res_${bookingModal.id}_${slotStart.toISOString().slice(0, 10)}_${selectedSlot}`;
      if (localStorage.getItem(bookingKey)) {
        alert(`This time slot (${selectedSlot}) is already reserved for this station. Please choose another slot.`);
        return;
      }
      localStorage.setItem(bookingKey, 'reserved');
    }

    alert(`Booking successful for ${bookingModal.title}!\nSlot: ${selectedSlot}`);
    setSelectedSlot(null);
    setBookingModal(null);
  };

  // Routing helper: attaches request timestamp counter so tapping Route repeatedly on the same station triggers re-routing
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

  // Geolocation helper with descriptive error callback
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
          msg = "Location permission was denied. Please allow location access in your browser settings to find chargers near you.";
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

  // Handler for Add Charger
  const handleAddCharger = () => {
    alert("Add Charger: Community charger submissions are coming soon! Stay tuned.");
  };

  return (
    <div className="bg-gray-950 text-gray-100 font-sans h-dvh flex flex-col overflow-hidden">
      {/* Header with safe-area padding for notched devices */}
      <header className="safe-header h-14 sm:h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 sm:px-6 z-20 shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 bg-emerald-500 text-gray-950 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-extrabold tracking-tight">Electrify <span className="text-emerald-400">Mobility</span></h1>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {activeRoute && (
            <button 
              onClick={() => setActiveRoute(null)} 
              className="flex items-center gap-1 sm:gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-medium px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer"
              title="Clear active route"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
              <span className="hidden min-[400px]:inline">Clear</span>
            </button>
          )}

          <button 
            onClick={locateUser} 
            className="flex items-center gap-1 sm:gap-1.5 bg-gray-800 text-emerald-400 border border-emerald-500/30 font-medium px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            title="Locate nearest chargers"
          >
            <Locate className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden min-[400px]:inline">Near Me</span>
          </button>

          <button 
            onClick={handleAddCharger} 
            className="flex items-center gap-1 sm:gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            title="Submit a new charging station"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden min-[400px]:inline sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Charger</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Column on mobile (Map 45% on top, Sidebar 55% scrollable below), Row on md+ (Sidebar left, Map right) */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 relative overflow-hidden">
        {/* Sidebar / Station List */}
        <aside className="order-2 md:order-1 w-full md:w-[450px] flex-1 md:flex-none md:h-full bg-gray-900 border-t md:border-t-0 md:border-r border-gray-800 flex flex-col z-10 shadow-2xl min-h-0">
          {/* Search and Filters: compact, guaranteed <= 120px height */}
          <div className="p-2.5 sm:p-4 border-b border-gray-800 space-y-2 sm:space-y-3 bg-gray-900/90 backdrop-blur shrink-0 max-h-[120px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search locations..." 
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
                <option value="ALL">All Speeds</option>
                <option value="DC_FAST">⚡ DC Fast Charger</option>
                <option value="AC_SLOW">🔌 Level 2 AC</option>
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
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> CHARGERS IN NCR</span>
            <span className="text-emerald-400 font-bold">{filteredStations.length} Stations</span>
          </div>

          {/* Scrollable station cards list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 safe-bottom min-h-0">
            {filteredStations.map(st => {
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
                      {statusBadge && (
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      )}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openReportModal(st); }} 
                      className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-lg text-xs font-semibold border border-gray-700 transition shrink-0 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-400" /> Report
                    </button>
                  </div>

                  <h3 className="font-bold text-gray-100 text-sm mt-2 group-hover:text-emerald-400 transition leading-snug">{st.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 leading-normal">
                    <MapPin className="w-3 h-3 shrink-0" /> {st.address}
                  </p>

                  {report && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 bg-gray-950/60 px-2.5 py-1.5 rounded-lg border border-gray-800/80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> Updated {report.minutesAgo} min ago
                      </span>
                      {report.wait_minutes > 0 && (
                        <span className="text-amber-400 font-medium">Wait ~{report.wait_minutes}m</span>
                      )}
                    </div>
                  )}

                  {/* Station action row: responsive with flex-wrap and gap to prevent overflow */}
                  <div className="mt-2.5 pt-2.5 border-t border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-emerald-400 shrink-0">{st.price || 'N/A'}</span>
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

        {/* Map Area: on mobile placed on top (45% height with guaranteed min-h-[250px]); on md+ flex-1 full height */}
        <main id="map-container" className="order-1 md:order-2 w-full md:w-auto h-[45%] md:h-full md:flex-1 min-h-[250px] md:min-h-0 relative bg-gray-800 shrink-0 md:shrink">
          <MapComponent 
            stations={filteredStations} 
            focusedStation={focusedStation} 
            activeRoute={activeRoute} 
            userLocation={userLocation} 
            onReserve={openBooking} 
            onRoute={startRoute}
            onReport={openReportModal}
            reportsByStation={reportsByStation}
          />
        </main>
      </div>

      {/* 1. Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 sm:p-6 relative shadow-2xl max-h-[90dvh] overflow-y-auto mx-4 sm:mx-0">
            <button 
              type="button"
              onClick={() => { setBookingModal(null); setSelectedSlot(null); }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg text-gray-100 mb-1">Reserve Slot</h3>
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
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold py-3.5 rounded-xl transition flex justify-center items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" /> Confirm Reservation
            </button>
          </div>
        </div>
      )}

      {/* 2. Report Status Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 sm:p-6 relative shadow-2xl max-h-[90dvh] overflow-y-auto mx-4 sm:mx-0">
            <button 
              type="button"
              onClick={() => setReportModal(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-lg text-gray-100">Report Station Status</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">{reportModal.title}</p>

            <form onSubmit={submitReport} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Live Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReportStatus('working')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      reportStatus === 'working' 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>🟢 Working</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportStatus('occupied')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      reportStatus === 'occupied' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>🟡 Occupied</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportStatus('broken')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      reportStatus === 'broken' 
                        ? 'bg-red-500/20 border-red-500 text-red-400' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span>🔴 Broken</span>
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
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Note (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Gun #2 working fine, CCS2 ready" 
                  value={reportNote} 
                  onChange={(e) => setReportNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold py-3 rounded-xl transition flex justify-center items-center gap-2 cursor-pointer">
                  <CheckCircle2 className="w-5 h-5" /> Submit Status Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
