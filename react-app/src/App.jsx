import { useState, useEffect } from 'react';
import { DELHI_NCR_STATIONS } from './data';
import MapComponent from './MapComponent';
import { Search, Zap, Plug, MapPin, Locate, PlusCircle, CheckCircle2, Navigation, ThumbsUp, X } from 'lucide-react';

export default function App() {
  const [stations, setStations] = useState(DELHI_NCR_STATIONS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  
  const [activeRoute, setActiveRoute] = useState(null);
  const [focusedStation, setFocusedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  const [bookingModal, setBookingModal] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const filteredStations = stations.filter(st => {
    const matchesSearch = [st.title, st.address, st.operator].some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || st.type === typeFilter;
    const r = regionFilter.toLowerCase();
    const matchesRegion = regionFilter === 'ALL' || st.region.toLowerCase().includes(r) || st.address.toLowerCase().includes(r);
    return matchesSearch && matchesType && matchesRegion;
  });

  const handleVote = (id, e) => {
    e.stopPropagation();
    setStations(prev => prev.map(s => s.id === id ? { ...s, votes: (s.votes || 0) + 1 } : s));
  };

  const confirmBooking = () => {
    if (!selectedSlot) return alert('Please select a time slot first.');
    alert(`Booking successful for ${bookingModal.title}!\nSlot: ${selectedSlot}`);
    setBookingModal(null);
  };

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
      });
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  return (
    <div className="bg-gray-950 text-gray-100 font-sans h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500 text-gray-950 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Electrifing <span className="text-emerald-400">Mobility</span></h1>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={locateUser} className="flex items-center gap-2 bg-gray-800 text-emerald-400 border border-emerald-500/30 font-medium px-4 py-2 rounded-xl text-sm transition">
            <Locate className="w-4 h-4" /> Near Me
          </button>
          <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-4 py-2 rounded-xl text-sm transition">
            <PlusCircle className="w-4 h-4" /> Add Charger
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-[450px] bg-gray-900 border-r border-gray-800 flex flex-col z-10 shadow-2xl shrink-0">
          <div className="p-4 border-b border-gray-800 space-y-3 bg-gray-900/90 backdrop-blur">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input type="text" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-emerald-500 transition" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500">
                <option value="ALL">All Speeds</option>
                <option value="DC_FAST">⚡ DC Fast Charger</option>
                <option value="AC_SLOW">🔌 Level 2 AC</option>
              </select>
              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500">
                <option value="ALL">All NCR Regions</option>
                <option value="Delhi">Delhi</option>
                <option value="Gurugram">Gurugram</option>
                <option value="Noida">Noida</option>
              </select>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-gray-950 border-b border-gray-800/80 flex justify-between text-xs font-semibold text-gray-400">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> CHARGERS IN NCR</span>
            <span className="text-emerald-400 font-bold">{filteredStations.length} Stations</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {filteredStations.map(st => {
              const isFast = st.type === 'DC_FAST';
              return (
                <div key={st.id} onClick={() => setFocusedStation(st)} className="bg-gray-900 border border-gray-800 hover:border-emerald-500/50 rounded-xl p-4 transition cursor-pointer group shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${isFast ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'} border`}>
                      {isFast ? '⚡ DC Fast' : '🔌 AC Slow'}
                    </span>
                    <button onClick={(e) => handleVote(st.id, e)} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-lg text-xs font-bold transition">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /> {st.votes || 0}
                    </button>
                  </div>
                  <h3 className="font-bold text-gray-100 text-sm mt-2.5 group-hover:text-emerald-400 transition">{st.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" /> {st.address}
                  </p>
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">{st.price}</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setBookingModal(st); }} className="bg-gray-800 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg transition font-semibold">Reserve</button>
                      <button onClick={(e) => { e.stopPropagation(); setActiveRoute(st); }} className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-semibold px-3 py-1.5 rounded-lg transition">
                        <Navigation className="w-3.5 h-3.5" /> Route
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Map Area */}
        <main className="flex-1 relative bg-gray-800">
          <MapComponent 
            stations={filteredStations} 
            focusedStation={focusedStation} 
            activeRoute={activeRoute}
            userLocation={userLocation}
            onReserve={setBookingModal}
            onRoute={setActiveRoute}
          />
        </main>
      </div>

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setBookingModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-lg text-gray-100 mb-4">Reserve: {bookingModal.title}</h3>
            
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Time Slot</label>
            <div className="grid grid-cols-3 gap-2 mt-2 mb-6">
              {['10:30 AM', '01:00 PM', '04:30 PM'].map(slot => (
                <button key={slot} onClick={() => setSelectedSlot(slot)} className={`py-2 rounded-lg transition text-xs font-bold ${selectedSlot === slot ? 'bg-emerald-500 text-gray-950' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>
                  {slot}
                </button>
              ))}
            </div>
            
            <button onClick={confirmBooking} className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold py-3.5 rounded-xl transition flex justify-center items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Confirm Reservation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
