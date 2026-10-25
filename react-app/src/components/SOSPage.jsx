import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  AlertCircle, 
  ArrowLeft, 
  Zap, 
  BatteryCharging, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  Home, 
  HelpCircle,
  Locate,
  ExternalLink,
  ShieldAlert,
  Car,
  Bike
} from 'lucide-react';
import { calculateDistanceKm, formatDistanceKm } from '../services/storageAdapter';

// Delhi NCR Urgent Emergency Preset Locations for manual fallback
const MANUAL_LOCATION_PRESETS = [
  { name: 'Connaught Place (Central Delhi)', lat: 28.6315, lng: 77.2167 },
  { name: 'Cyber City (Gurugram)', lat: 28.4950, lng: 77.0890 },
  { name: 'Sector 18 / Atta Market (Noida)', lat: 28.5700, lng: 77.3200 },
  { name: 'Indirapuram (Ghaziabad)', lat: 28.6410, lng: 77.3750 },
  { name: 'Nehru Place (South Delhi)', lat: 28.5490, lng: 77.2530 },
  { name: 'Dwarka Sector 21 (West Delhi)', lat: 28.5520, lng: 77.0580 },
  { name: 'Golf Course Extension (Gurugram)', lat: 28.4020, lng: 77.0780 },
  { name: 'Kherki Daula Toll / NH-48 (Manesar)', lat: 28.3980, lng: 76.9950 },
];

/**
 * Assesses vehicle-to-charger connector compatibility based on available specifications.
 * Strictly avoids implying compatibility when specifications are unknown.
 * @param {string} vehicleType 'car' | 'bike' | 'other'
 * @param {Object} charger
 * @returns {{ level: 'compatible'|'warning'|'incompatible'|'unknown', label: string, notes: string }}
 */
function evaluateCompatibility(vehicleType, charger) {
  const connector = (charger.connector || '').toLowerCase();
  const isFastDC = charger.type === 'DC_FAST' || connector.includes('ccs') || connector.includes('chademo');
  const is3Pin = connector.includes('3-pin') || connector.includes('15a') || connector.includes('socket');
  const isType2 = connector.includes('type 2') || connector.includes('mennekes');

  if (vehicleType === 'bike') {
    if (is3Pin) {
      return {
        level: 'compatible',
        label: 'Compatible (Standard 15A 2W Plug)',
        notes: 'Standard 15A 3-pin AC socket fits most Indian electric 2-wheelers directly.',
      };
    }
    if (isType2) {
      return {
        level: 'warning',
        label: 'Check Adapter (Type 2 Socket)',
        notes: 'Requires a Type-2 to 3-pin converter or Type-2 portable bike charging cable.',
      };
    }
    if (isFastDC) {
      return {
        level: 'incompatible',
        label: 'Incompatible (High-Voltage DC Only)',
        notes: 'CCS-2 / DC Fast guns cannot charge standard electric 2-wheelers.',
      };
    }
    return {
      level: 'unknown',
      label: 'Compatibility Unknown',
      notes: 'Check vehicle connector specifications before proceeding.',
    };
  }

  if (vehicleType === 'car') {
    if (isFastDC) {
      return {
        level: 'compatible',
        label: 'Compatible (CCS-2 Fast DC)',
        notes: 'Standard DC Fast plug supported by Nexon EV, ZS EV, Ioniq 5, Curvv, etc.',
      };
    }
    if (isType2) {
      return {
        level: 'compatible',
        label: 'Compatible (Type 2 AC)',
        notes: 'Standard European/Indian Type 2 AC charging inlet.',
      };
    }
    if (is3Pin) {
      return {
        level: 'warning',
        label: 'Slow Emergency Trickle (15A AC)',
        notes: 'Requires OEM 3-pin portable emergency charging cable (~2.5–3.3 kW).',
      };
    }
    return {
      level: 'unknown',
      label: 'Compatibility Unknown',
      notes: 'Check vehicle connector specifications before proceeding.',
    };
  }

  // 'other' vehicle type
  return {
    level: 'unknown',
    label: 'Compatibility Unknown',
    notes: 'Commercial/Custom EV: Verify socket type, voltage, and protocol requirements.',
  };
}

export default function SOSPage({ 
  onBack, 
  allEligibleChargers = [], 
  reportsByStation = {}, 
  onNavigateToCharger,
  onRequestHomeBooking,
  initialUserLocation = null,
  onLocationDetected = null
}) {
  // Urgent context states
  const [batteryPercent, setBatteryPercent] = useState(12);
  const [vehicleType, setVehicleType] = useState('car'); // 'car' | 'bike' | 'other'
  
  // Location detection states
  const [userCoords, setUserCoords] = useState(() => {
    if (initialUserLocation) {
      if (Array.isArray(initialUserLocation) && initialUserLocation.length === 2) {
        return { lat: initialUserLocation[0], lng: initialUserLocation[1] };
      }
      if (typeof initialUserLocation === 'object' && initialUserLocation.lat && initialUserLocation.lng) {
        return initialUserLocation;
      }
    }
    return null;
  });
  const [locationStatus, setLocationStatus] = useState(() => {
    return initialUserLocation ? 'granted' : 'detecting';
  }); // 'prompt' | 'detecting' | 'granted' | 'denied' | 'unavailable' | 'manual'
  const [locationErrorMsg, setLocationErrorMsg] = useState(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  const handleDetectLocation = useCallback((isManual = false) => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setLocationErrorMsg('Geolocation is not supported by your browser. Please select a landmark below.');
      return;
    }

    if (isManual) {
      setLocationStatus('detecting');
      setLocationErrorMsg(null);
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const detected = { lat: coords.latitude, lng: coords.longitude };
        setUserCoords(detected);
        setLocationStatus('granted');
        onLocationDetected?.([coords.latitude, coords.longitude]);
      },
      (error) => {
        setLocationStatus('denied');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationErrorMsg('Location permission was denied. Please select your current area manually below to find nearest chargers.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationErrorMsg('GPS location is currently unavailable. Please pick a nearby landmark.');
        } else {
          setLocationErrorMsg('Location request timed out. Please pick a nearby landmark.');
        }
        // Fallback to first manual preset if user coordinates unset
        setUserCoords(prev => prev || { lat: MANUAL_LOCATION_PRESETS[0].lat, lng: MANUAL_LOCATION_PRESETS[0].lng });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [onLocationDetected]);

  // Attempt automatic geolocation on mount if not already provided
  useEffect(() => {
    if (!initialUserLocation) {
      const timer = setTimeout(() => {
        handleDetectLocation(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialUserLocation, handleDetectLocation]);

  const handleSelectPreset = (preset, idx) => {
    setSelectedPresetIndex(idx);
    setUserCoords({ lat: preset.lat, lng: preset.lng });
    setLocationStatus('manual');
    setLocationErrorMsg(null);
    onLocationDetected?.([preset.lat, preset.lng]);
  };

  // Rank eligible chargers
  const rankedChargers = useMemo(() => {
    if (!Array.isArray(allEligibleChargers) || allEligibleChargers.length === 0) return [];
    
    // Only approved and active public stations or public homeowner chargers
    // (Storage adapter and App.jsx already filter out private, pending, declined, and paused chargers)
    const valid = allEligibleChargers.filter(c => {
      const lat = c.lat || c.latitude;
      const lng = c.lng || c.longitude;
      return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
    });

    // Compute distance and evaluate compatibility
    const processed = valid.map(c => {
      const lat = Number(c.lat || c.latitude);
      const lng = Number(c.lng || c.longitude);
      
      let distanceKm = null;
      let distanceText = null;

      if (userCoords?.lat != null && userCoords?.lng != null) {
        distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, lat, lng);
        distanceText = formatDistanceKm(distanceKm);
      }

      const compatibility = evaluateCompatibility(vehicleType, c);
      const report = reportsByStation[c.id];
      const liveStatus = report?.status; // 'working' | 'broken' | 'occupied' | undefined

      return {
        ...c,
        computedLat: lat,
        computedLng: lng,
        distanceKm,
        distanceText,
        compatibility,
        liveStatus,
        report,
      };
    });

    // Ranking algorithm:
    // 1. Compatible chargers first
    // 2. Closest distance first
    // 3. Known working before broken
    return processed.sort((a, b) => {
      // Compatibility penalty
      const compScore = { compatible: 0, warning: 1, unknown: 2, incompatible: 3 };
      const compA = compScore[a.compatibility.level] ?? 2;
      const compB = compScore[b.compatibility.level] ?? 2;
      if (compA !== compB) return compA - compB;

      // Status penalty (avoid broken chargers in SOS)
      const statusScore = { working: 0, undefined: 1, occupied: 2, broken: 3 };
      const statA = statusScore[a.liveStatus] ?? 1;
      const statB = statusScore[b.liveStatus] ?? 1;
      if (statA !== statB) return statA - statB;

      // Distance
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });
  }, [allEligibleChargers, userCoords, vehicleType, reportsByStation]);

  return (
    <div className="min-h-dvh bg-gray-950 text-gray-100 flex flex-col font-sans">
      {/* Top Emergency SOS Header */}
      <header className="h-16 bg-red-950/80 border-b border-red-500/30 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-600 text-white rounded-xl shadow-md flex items-center justify-center animate-pulse">
            <AlertCircle className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-red-100">
                SOS <span className="text-red-400">Emergency Charger Finder</span>
              </h1>
              <span className="text-[10px] bg-red-900/90 text-red-200 font-extrabold px-2 py-0.5 rounded-full border border-red-700">
                Priority Dispatch
              </span>
            </div>
            <p className="text-[11px] text-red-300/80 hidden sm:block">Find the closest reachable chargers when your battery is critically low</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Back to Standard Map</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
        
        {/* Critical Emergency Context Panel */}
        <div className="bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border border-red-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                Urgent Driver Status
              </h2>
              <p className="text-xs text-gray-400">Specify your vehicle type and battery level so we can prioritize suitable chargers.</p>
            </div>
            <span className="text-[11px] text-amber-400 font-medium bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              ⚠️ Contextual only — remaining range is not estimated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Battery Percentage */}
            <div className="space-y-2 bg-gray-950/60 p-3.5 rounded-xl border border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <BatteryCharging className={`w-4 h-4 ${batteryPercent <= 15 ? 'text-red-400' : 'text-amber-400'}`} />
                  Current Battery:
                </label>
                <span className={`text-base font-black px-2.5 py-0.5 rounded-lg ${
                  batteryPercent <= 10 ? 'bg-red-500 text-white' : batteryPercent <= 20 ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-gray-800 text-gray-200'
                }`}>
                  {batteryPercent}%
                </span>
              </div>
              
              <input
                type="range"
                min="1"
                max="100"
                value={batteryPercent}
                onChange={(e) => setBatteryPercent(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
              />

              <p className="text-[10px] text-gray-500 leading-tight">
                * Battery percentage is user-provided context. Because energy consumption varies with weather, speed, and vehicle weight, we do not guess remaining kilometers.
              </p>
            </div>

            {/* Vehicle Type Selector */}
            <div className="space-y-2 bg-gray-950/60 p-3.5 rounded-xl border border-gray-800">
              <label className="text-xs font-bold text-gray-300 block">
                Vehicle Category:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleType('car')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    vehicleType === 'car'
                      ? 'bg-red-600/20 border-red-500 text-red-200 font-bold shadow-sm'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <Car className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-xs block">Car (4W)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleType('bike')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    vehicleType === 'bike'
                      ? 'bg-red-600/20 border-red-500 text-red-200 font-bold shadow-sm'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <Bike className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-xs block">Bike (2W)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleType('other')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    vehicleType === 'other'
                      ? 'bg-red-600/20 border-red-500 text-red-200 font-bold shadow-sm'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <Zap className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-xs block">Other EV</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                Used to filter and warn about incompatible plugs (e.g. CCS-2 vs 15A 3-pin plugs).
              </p>
            </div>
          </div>
        </div>

        {/* Location Detection & Fallback Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-gray-200">
                Emergency Location Reference:
              </h3>
              {locationStatus === 'granted' && (
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  GPS Active
                </span>
              )}
              {locationStatus === 'manual' && (
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Landmark Selected
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locationStatus === 'detecting'}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
            >
              <Locate className="w-3.5 h-3.5" />
              <span>{locationStatus === 'detecting' ? 'Acquiring GPS...' : 'Use My GPS Location'}</span>
            </button>
          </div>

          {locationErrorMsg && (
            <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{locationErrorMsg}</span>
            </div>
          )}

          {/* Manual Location Presets */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">
              Or pick your nearest Delhi NCR area manually:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {MANUAL_LOCATION_PRESETS.map((preset, idx) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset, idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border shrink-0 ${
                    locationStatus === 'manual' && selectedPresetIndex === idx
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-gray-950 text-gray-300 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ranked Emergency Results Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-gray-100">
              Ranked Reachable Chargers ({rankedChargers.length})
            </h3>
            <span className="text-[11px] text-gray-400">Sorted by distance & eligibility</span>
          </div>
        </div>

        {/* Results List */}
        {rankedChargers.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-gray-600 mx-auto" />
            <h4 className="text-sm font-bold text-gray-200">No Eligible Chargers Found Nearby</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              We couldn&apos;t find approved, active chargers matching your coordinates. Try choosing another Delhi NCR landmark above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankedChargers.map((charger, index) => {
              const isHomeowner = Boolean(charger.is_homeowner);
              const comp = charger.compatibility;
              const isWorking = charger.liveStatus === 'working';
              const isBroken = charger.liveStatus === 'broken';
              const isOccupied = charger.liveStatus === 'occupied';

              return (
                <div 
                  key={charger.id}
                  className={`bg-gray-900 border rounded-2xl p-4 sm:p-5 transition space-y-3 shadow-md ${
                    index === 0 && comp.level === 'compatible' && !isBroken
                      ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/20 via-gray-900 to-gray-900'
                      : isBroken
                      ? 'border-red-900/40 opacity-70'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {/* Top Badges Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {index === 0 && comp.level === 'compatible' && !isBroken && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500 text-gray-950 tracking-wider">
                          ⭐ Recommended Closest
                        </span>
                      )}

                      {/* Station Type */}
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        isHomeowner
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                      }`}>
                        {isHomeowner ? '🏠 Rentable Home Charger' : '⚡ Public Station'}
                      </span>

                      {/* Distance */}
                      {charger.distanceText && (
                        <span className="text-xs font-black text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> {charger.distanceText}
                        </span>
                      )}

                      {/* Power */}
                      <span className="text-[11px] font-bold text-gray-300 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                        {charger.power_kw ? `${charger.power_kw} kW` : (charger.type === 'DC_FAST' ? '50+ kW DC' : '7.4 kW AC')}
                      </span>
                    </div>

                    {/* Live Availability Status */}
                    <div>
                      {isWorking && (
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                          🟢 Working (Reported active)
                        </span>
                      )}
                      {isOccupied && (
                        <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                          🟡 Occupied (~{charger.report?.wait_minutes || 15}m wait)
                        </span>
                      )}
                      {isBroken && (
                        <span className="text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">
                          🔴 Reported Broken (Avoid in emergency)
                        </span>
                      )}
                      {!charger.liveStatus && (
                        <span className="text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded">
                          ⚪ Status unconfirmed (No recent report)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Location */}
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-gray-100">{charger.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                      <span>{charger.is_address_public === false ? charger.approx_address : (charger.address || charger.exact_address)}</span>
                    </p>
                  </div>

                  {/* Vehicle Compatibility Banner */}
                  <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    comp.level === 'compatible'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : comp.level === 'warning'
                      ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                      : comp.level === 'incompatible'
                      ? 'bg-red-950/40 border-red-500/30 text-red-300'
                      : 'bg-gray-950 border-gray-800 text-gray-300'
                  }`}>
                    {comp.level === 'compatible' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {comp.level === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {comp.level === 'incompatible' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                    {comp.level === 'unknown' && <HelpCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                    <div>
                      <strong className="font-bold">{comp.label}: </strong>
                      <span className="text-[11px] opacity-90">{comp.notes}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-800/80">
                    <div className="text-xs text-gray-400">
                      <span>Rate: </span>
                      <strong className="text-emerald-400">{charger.price || 'Standard Tariffs'}</strong>
                      {charger.schedule && <span className="ml-2 text-gray-500 font-mono">({charger.schedule})</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* External Google Navigation */}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${charger.computedLat},${charger.computedLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-700 transition"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Google Maps
                      </a>

                      {/* Homeowner Request Booking */}
                      {isHomeowner && (
                        <button
                          type="button"
                          onClick={() => onRequestHomeBooking?.(charger)}
                          className="flex items-center gap-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5" /> Book with Host
                        </button>
                      )}

                      {/* In-App Route on Map */}
                      <button
                        type="button"
                        onClick={() => onNavigateToCharger?.(charger)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigate on Map</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
