import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Locate, 
  MapPin, 
  Navigation, 
  Zap, 
  Star, 
  Clock, 
  Activity, 
  Home, 
  Lock, 
  CheckCircle2, 
  Info,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

/**
 * SlideInSidePanel component
 * Provides a consistent slide-in panel on the homepage.
 * - Slides in when "Near Me" is clicked, ranking nearby chargers by distance.
 * - Shows manual location presets if location access is unavailable or denied.
 * - Supports inspecting charger details and recent community reports.
 * - Closes automatically when "Route" is selected so the route and map are visible.
 * - Smooth CSS transitions, Close button, and Escape key listener.
 */
export default function SlideInSidePanel({
  isOpen,
  onClose,
  panelMode = 'near_me', // 'near_me' | 'charger_details' | 'live_reports'
  onSetPanelMode,
  userLocation,
  onLocateMe,
  onSelectManualLocation,
  landmarkPresets = [],
  chargersWithDistance = [],
  focusedCharger = null,
  onSelectCharger,
  onStartRoute,
  onReserve,
  onRequestHomeBooking,
  onOpenReport,
  onOpenReviews,
  reportsByStation = {},
  ratingsByStation = {},
}) {
  const [nearMeFilter, setNearMeFilter] = useState('ALL'); // 'ALL' | 'DC_FAST' | 'AC_SLOW' | 'HOME'
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  // 1. Keyboard 'Escape' key listener to close panel smoothly
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 2. Rank chargers by distance for 'near_me' mode
  const rankedNearMeChargers = useMemo(() => {
    if (!Array.isArray(chargersWithDistance)) return [];

    let filtered = chargersWithDistance;
    if (nearMeFilter === 'DC_FAST') {
      filtered = filtered.filter(c => c.type === 'DC_FAST');
    } else if (nearMeFilter === 'AC_SLOW') {
      filtered = filtered.filter(c => c.type === 'AC_SLOW' || c.is_homeowner);
    } else if (nearMeFilter === 'HOME') {
      filtered = filtered.filter(c => Boolean(c.is_homeowner));
    }

    // Sort by distance (closest first), fallback to original order
    return [...filtered].sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return 0;
    });
  }, [chargersWithDistance, nearMeFilter]);

  // 3. Handle Route selection: triggers route and closes panel automatically
  const handleRouteClick = (charger) => {
    onStartRoute(charger);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay (dismisses panel on click) */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Slide-In Side Panel Container */}
      <aside
        role="dialog"
        aria-hidden={!isOpen}
        className={`fixed md:absolute right-0 top-14 sm:top-16 md:top-0 bottom-0 z-40 w-full sm:w-[460px] lg:w-[490px] bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Panel Header */}
        <div className="h-14 sm:h-16 px-4 bg-gray-950 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            {panelMode === 'charger_details' && (
              <button
                type="button"
                onClick={() => onSetPanelMode?.('near_me')}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-100 transition cursor-pointer"
                title="Back to Nearby Chargers"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              {panelMode === 'near_me' ? (
                <Locate className="w-4 h-4" />
              ) : panelMode === 'charger_details' ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-gray-100">
                  {panelMode === 'near_me' 
                    ? 'Nearby Chargers' 
                    : panelMode === 'charger_details' 
                    ? 'Charger Overview' 
                    : 'Live Station Reports'}
                </h2>
                {panelMode === 'near_me' && userLocation && (
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    GPS Active
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400">
                {panelMode === 'near_me' 
                  ? 'Ranked by straight-line distance from your location' 
                  : panelMode === 'charger_details' 
                  ? 'Detailed specifications & reviews' 
                  : 'Crowd-sourced updates across Delhi NCR'}
              </p>
            </div>
          </div>

          {/* Close Controls */}
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-900 border border-gray-800 rounded font-mono">
              Esc
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
              title="Close panel (Escape)"
              aria-label="Close side panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 min-h-0">
          
          {/* ================================================================= */}
          {/* 1. NEAR ME MODE */}
          {/* ================================================================= */}
          {panelMode === 'near_me' && (
            <div className="space-y-3">
              
              {/* Location Status Card */}
              {userLocation ? (
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs space-y-2 text-emerald-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Locate className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold">Your Location: </span>
                        <span className="font-mono text-[11px]">
                          [{userLocation[0].toFixed(3)}, {userLocation[1].toFixed(3)}]
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={onLocateMe}
                        className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold px-2 py-1 rounded-lg border border-emerald-500/40 transition cursor-pointer"
                        title="Update location using device GPS"
                      >
                        GPS
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAreaPicker(!showAreaPicker)}
                        className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold px-2 py-1 rounded-lg border border-gray-700 transition cursor-pointer"
                        title="Select a different Delhi NCR area"
                      >
                        {showAreaPicker ? 'Close' : 'Change Area'}
                      </button>
                    </div>
                  </div>

                  {showAreaPicker && (
                    <div className="pt-2 border-t border-emerald-900/40">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 mb-1.5">
                        Select a Delhi NCR Landmark Area:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {landmarkPresets.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              onSelectManualLocation(preset);
                              setShowAreaPicker(false);
                            }}
                            className="p-1.5 bg-gray-950/90 hover:bg-gray-800 border border-emerald-500/20 hover:border-emerald-400/50 rounded-lg text-left text-[11px] text-gray-200 truncate transition cursor-pointer"
                            title={preset.name}
                          >
                            📍 {preset.name.split('(')[0].trim()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* No Location Yet: Offer Geolocation & Landmark Presets directly in panel */
                <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl text-xs space-y-2.5">
                  <div className="flex items-start gap-2 text-amber-200">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Location Permission Needed</div>
                      <div className="text-[11px] text-amber-300/80 mt-0.5">
                        Enable browser GPS or select a Delhi NCR area manually to calculate accurate distances to each charger.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onLocateMe}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Locate className="w-3.5 h-3.5" />
                    <span>Detect My Current Location (GPS)</span>
                  </button>

                  <div className="pt-2 border-t border-amber-900/40">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-1.5">
                      Or Choose a Delhi NCR Landmark Area:
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {landmarkPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => onSelectManualLocation(preset)}
                          className="p-1.5 bg-gray-950/80 hover:bg-gray-800 border border-amber-500/20 hover:border-amber-400/50 rounded-lg text-left text-[11px] text-gray-200 truncate transition cursor-pointer"
                          title={preset.name}
                        >
                          📍 {preset.name.split('(')[0].trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Filter Tabs for Nearby Chargers */}
              {userLocation && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setNearMeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition text-xs shrink-0 cursor-pointer ${
                      nearMeFilter === 'ALL'
                        ? 'bg-emerald-500 text-gray-950 shadow-sm'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    All ({chargersWithDistance.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNearMeFilter('DC_FAST')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs shrink-0 cursor-pointer ${
                      nearMeFilter === 'DC_FAST'
                        ? 'bg-emerald-500 text-gray-950 shadow-sm'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    ⚡ DC Fast
                  </button>
                  <button
                    type="button"
                    onClick={() => setNearMeFilter('AC_SLOW')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs shrink-0 cursor-pointer ${
                      nearMeFilter === 'AC_SLOW'
                        ? 'bg-emerald-500 text-gray-950 shadow-sm'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    🔌 AC Slow
                  </button>
                  <button
                    type="button"
                    onClick={() => setNearMeFilter('HOME')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs shrink-0 cursor-pointer ${
                      nearMeFilter === 'HOME'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-800 text-purple-300 hover:bg-gray-700'
                    }`}
                  >
                    🏠 Home Rentable
                  </button>
                </div>
              )}

              {/* Ranked Chargers Cards List */}
              <div className="space-y-2.5">
                {rankedNearMeChargers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 bg-gray-950 rounded-2xl border border-gray-800">
                    <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs">No chargers matching the selected filter.</p>
                  </div>
                ) : (
                  rankedNearMeChargers.map((charger) => {
                    const isHome = Boolean(charger.is_homeowner);
                    const isFast = charger.type === 'DC_FAST';
                    const report = reportsByStation[charger.id];
                    const rating = ratingsByStation[charger.id];

                    const displayAddress = isHome
                      ? (charger.is_address_public ? (charger.exact_address || charger.address) : (charger.approx_address || `${charger.region} (Approximate area)`))
                      : charger.address;

                    return (
                      <div
                        key={charger.id}
                        className={`p-3 sm:p-3.5 rounded-xl border transition group shadow-sm bg-gray-950/70 hover:bg-gray-950 ${
                          isHome ? 'border-purple-900/60 hover:border-purple-500' : 'border-gray-800 hover:border-emerald-500/60'
                        }`}
                      >
                        {/* Top Badges Row */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Distance Badge */}
                            {charger.distanceText ? (
                              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                📍 {charger.distanceText}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                                Distance uncalculated
                              </span>
                            )}

                            {isHome ? (
                              <span className="text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">
                                🏠 Home
                              </span>
                            ) : (
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                isFast ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              }`}>
                                {isFast ? '⚡ DC Fast' : '🔌 AC Slow'}
                              </span>
                            )}

                            {report?.status === 'working' && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                🟢 Working
                              </span>
                            )}
                            {report?.status === 'occupied' && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                                🟡 Occupied
                              </span>
                            )}
                            {report?.status === 'broken' && (
                              <span className="text-[9px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/30">
                                🔴 Broken
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {rating?.averageRating && (
                              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{rating.averageRating}</span>
                              </span>
                            )}
                            <span className="text-xs font-black text-emerald-400">
                              {charger.price || 'Standard Tariffs'}
                            </span>
                          </div>
                        </div>

                        {/* Title and Address */}
                        <h3 className="font-extrabold text-sm text-gray-100 group-hover:text-emerald-400 transition leading-snug">
                          {charger.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-start gap-1 leading-normal">
                          <MapPin className="w-3 h-3 text-gray-500 shrink-0 mt-0.5" />
                          <span className="truncate">{displayAddress}</span>
                        </p>

                        {/* Specs Pill */}
                        <div className="mt-2 text-[11px] text-gray-400 bg-gray-900/90 p-2 rounded-lg border border-gray-800/80 flex items-center justify-between">
                          <span>Power: <strong className="text-gray-200">{charger.kw || charger.power_kw} kW</strong></span>
                          <span className="truncate max-w-[170px]">Plug: <strong className="text-gray-200">{charger.connectors?.join(', ') || charger.connector}</strong></span>
                        </div>

                        {/* Actions Row */}
                        <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCharger?.(charger);
                              onSetPanelMode?.('charger_details');
                            }}
                            className="text-xs font-semibold text-gray-300 hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-1.5">
                            {isHome ? (
                              <button
                                type="button"
                                onClick={() => onRequestHomeBooking?.(charger)}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-sm"
                              >
                                Book Host
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onReserve?.(charger)}
                                className="bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg text-xs transition border border-gray-700 cursor-pointer"
                              >
                                Reserve
                              </button>
                            )}

                            {/* ROUTE BUTTON: Starts route AND automatically closes panel */}
                            <button
                              type="button"
                              onClick={() => handleRouteClick(charger)}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 cursor-pointer shadow-sm"
                              title="Start route and view on map"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Route</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. CHARGER DETAILS MODE */}
          {/* ================================================================= */}
          {panelMode === 'charger_details' && focusedCharger && (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    focusedCharger.is_homeowner 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
                      : focusedCharger.type === 'DC_FAST' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}>
                    {focusedCharger.is_homeowner ? '🏠 Rentable Home Charger' : focusedCharger.type === 'DC_FAST' ? '⚡ DC Fast Station' : '🔌 Level 2 AC Station'}
                  </span>

                  {focusedCharger.distanceText && (
                    <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      📍 {focusedCharger.distanceText}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-gray-100 leading-snug">
                  {focusedCharger.title}
                </h3>
                
                <p className="text-xs text-gray-400 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                  <span>
                    {focusedCharger.is_homeowner 
                      ? (focusedCharger.is_address_public ? focusedCharger.exact_address : focusedCharger.approx_address) 
                      : focusedCharger.address}
                  </span>
                </p>

                {focusedCharger.is_homeowner && !focusedCharger.is_address_public && (
                  <div className="text-[11px] text-purple-300 bg-purple-950/40 p-2 rounded-xl border border-purple-900/40 flex items-start gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Approximate area shown to protect host privacy. Exact address is provided upon booking confirmation.</span>
                  </div>
                )}
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Charging Speed</span>
                  <strong className="text-sm text-gray-100 font-extrabold">
                    {focusedCharger.kw || focusedCharger.power_kw} kW
                  </strong>
                </div>
                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Tariff / Rate</span>
                  <strong className="text-sm text-emerald-400 font-extrabold">
                    {focusedCharger.price || 'Standard tariffs'}
                  </strong>
                </div>
                <div className="col-span-2 bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Connectors & Guns</span>
                  <span className="text-gray-200 font-semibold">
                    {focusedCharger.connectors?.join(', ') || focusedCharger.connector || 'Standard Port'}
                  </span>
                </div>
                {focusedCharger.schedule && (
                  <div className="col-span-2 bg-gray-950 p-3 rounded-xl border border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Availability Hours:</span>
                    </span>
                    <strong className="text-gray-200">{focusedCharger.schedule}</strong>
                  </div>
                )}
              </div>

              {/* Live Status Report */}
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Community Status</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenReport?.(focusedCharger)}
                    className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    + Report Update
                  </button>
                </div>

                {reportsByStation[focusedCharger.id] ? (
                  <div className="text-xs bg-gray-900 p-2.5 rounded-lg border border-gray-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">
                        {reportsByStation[focusedCharger.id].status === 'working' ? '🟢 Reported Working' : reportsByStation[focusedCharger.id].status === 'occupied' ? '🟡 Reported Occupied' : '🔴 Reported Broken'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {reportsByStation[focusedCharger.id].minutesAgo === 0 ? 'just now' : `${reportsByStation[focusedCharger.id].minutesAgo}m ago`}
                      </span>
                    </div>
                    {reportsByStation[focusedCharger.id].note && (
                      <p className="text-gray-400 italic text-[11px]">
                        &ldquo;{reportsByStation[focusedCharger.id].note}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 italic">
                    No community updates in the past 2 hours. Standard operational status applies.
                  </p>
                )}
              </div>

              {/* Driver Reviews Row */}
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-300 block">Driver Reviews & Rating</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">
                      {ratingsByStation[focusedCharger.id]?.averageRating ? `${ratingsByStation[focusedCharger.id].averageRating} / 5.0` : 'No reviews yet'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      ({ratingsByStation[focusedCharger.id]?.reviewCount || 0} reviews)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenReviews?.(focusedCharger)}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  View Reviews
                </button>
              </div>

              {/* Primary Action Buttons */}
              <div className="pt-2 border-t border-gray-800 flex items-center gap-2">
                {/* ROUTE BUTTON: Starts route and closes panel */}
                <button
                  type="button"
                  onClick={() => handleRouteClick(focusedCharger)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Start Route on Map</span>
                </button>

                {focusedCharger.is_homeowner ? (
                  <button
                    type="button"
                    onClick={() => onRequestHomeBooking?.(focusedCharger)}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Home className="w-4 h-4" />
                    <span>Book with Host</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onReserve?.(focusedCharger)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reserve Slot</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fallback if in charger_details without a focused charger */}
          {panelMode === 'charger_details' && !focusedCharger && (
            <div className="p-8 text-center text-gray-400 bg-gray-950 rounded-2xl border border-gray-800 space-y-2">
              <Zap className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-xs">No charger selected. Pick a charger from the map or list.</p>
              <button
                type="button"
                onClick={() => onSetPanelMode?.('near_me')}
                className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                Browse Nearby Chargers
              </button>
            </div>
          )}

        </div>
      </aside>
    </>
  );
}
