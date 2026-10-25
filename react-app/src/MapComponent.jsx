import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icon resolution for production bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MAP_CENTER = [28.6139, 77.2090];
const MAP_ZOOM = 11;

// Configurable OSRM service URL with public demo server as fallback
const OSRM_SERVICE_URL = import.meta.env.VITE_OSRM_URL || 'https://router.project-osrm.org/route/v1';

// Optional Carto API Key (from carto.com/basemaps/apikey)
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Returns tile URL, attribution, and CSS class based on the selected layer.
 * - 'dark': Uses CartoDB if an API key is set, or OpenStreetMap with dark CSS filter (no key required, zero watermarks).
 * - 'street': Standard full-color OpenStreetMap tiles.
 * @param {'dark'|'street'} layerType
 */
const getTileSettings = (layerType) => {
  if (layerType === 'dark') {
    if (CARTO_API_KEY) {
      return {
        url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
        attribution: CARTO_ATTRIBUTION,
        className: '',
      };
    }
    // High-performance OpenStreetMap with dark CSS filter: 100% free, no API key, zero watermarks
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: OSM_ATTRIBUTION,
      className: 'dark-tiles',
    };
  }

  // Standard OpenStreetMap street view
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
    className: '',
  };
};

/**
 * Validates geographical coordinates (latitude [-90, 90], longitude [-180, 180]).
 * @param {unknown} lat
 * @param {unknown} lng
 * @returns {boolean}
 */
const isValidCoordinate = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (typeof lat === 'boolean' || typeof lng === 'boolean') return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  return (
    !Number.isNaN(numLat) &&
    !Number.isNaN(numLng) &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180
  );
};

/**
 * Validates whether location is a valid [lat, lng] array.
 * @param {unknown} loc
 * @returns {boolean}
 */
const isValidLatLngTuple = (loc) => {
  return Array.isArray(loc) && loc.length >= 2 && isValidCoordinate(loc[0], loc[1]);
};

const getMarkerColor = (status, isFast) => {
  if (status === 'working') return '#10b981'; // emerald green
  if (status === 'broken') return '#ef4444'; // red
  if (status === 'occupied') return '#f59e0b'; // amber
  return isFast ? '#10b981' : '#3b82f6'; // default by charger type
};

// Module-level icon cache to prevent recreating L.divIcon on every render
const iconCache = new Map();

/**
 * Returns a memoized L.divIcon instance based on status and charger speed.
 * Includes distinct shapes/icons and aria-labels so color alone is not required for accessibility.
 * @param {string|null|undefined} status
 * @param {boolean} isFast
 * @returns {L.DivIcon}
 */
const getStationIcon = (status, isFast) => {
  const normalizedStatus = (status === 'working' || status === 'broken' || status === 'occupied')
    ? status
    : 'none';
  const speedKey = isFast ? 'fast' : 'normal';
  const cacheKey = `${normalizedStatus}_${speedKey}`;

  let cached = iconCache.get(cacheKey);
  if (!cached) {
    const color = getMarkerColor(status, isFast);

    let innerSvg = '';
    let accessibleLabel = '';

    if (normalizedStatus === 'working') {
      // Checkmark icon for Working
      innerSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      accessibleLabel = 'Status: Working (Reported active)';
    } else if (normalizedStatus === 'broken') {
      // X icon for Broken
      innerSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      accessibleLabel = 'Status: Broken (Reported unavailable)';
    } else if (normalizedStatus === 'occupied') {
      // Clock/wait icon for Occupied
      innerSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
      accessibleLabel = 'Status: Occupied (In use)';
    } else if (isFast) {
      // Lightning bolt for DC Fast
      innerSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
      accessibleLabel = 'DC Fast Charger (Standard operational)';
    } else {
      // Plug icon for AC Slow
      innerSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 2 18 2 18 7 14 7 14 11 14 22 10 22 10 11 6 11 6 7 6 2"></polygon></svg>';
      accessibleLabel = 'AC Slow Charger (Standard operational)';
    }

    cached = L.divIcon({
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      html: `
        <div 
          role="img" 
          aria-label="${accessibleLabel}" 
          title="${accessibleLabel}"
          style="width:32px; height:32px; border-radius:50%; border:2px solid #030712; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 15px -3px rgba(0,0,0,0.5); background-color: ${color}; color:#030712;"
        >
          ${innerSvg}
        </div>`
    });
    iconCache.set(cacheKey, cached);
  }

  return cached;
};

/**
 * Map controller handling camera view, responsive resize observation, persistent user location marker, and routing control.
 */
function MapController({ focusedStation, activeRoute, userLocation, onRouteError }) {
  const map = useMap();
  const routingControlRef = useRef(null);
  const userMarkerRef = useRef(null);
  const lastFlyToPosRef = useRef(null);
  const onRouteErrorRef = useRef(onRouteError);

  useEffect(() => {
    onRouteErrorRef.current = onRouteError;
  }, [onRouteError]);

  // ResizeObserver: invalidate map size whenever container changes or rotates so tiles never render blank
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    map.invalidateSize();

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  // Focus station on map
  useEffect(() => {
    if (focusedStation && isValidCoordinate(focusedStation.lat, focusedStation.lng)) {
      map.flyTo([Number(focusedStation.lat), Number(focusedStation.lng)], 15, { duration: 1.2 });
    }
  }, [focusedStation, map]);

  // User location marker and flyTo handling: create marker once, move with setLatLng, flyTo only on meaningful change
  useEffect(() => {
    if (!isValidLatLngTuple(userLocation)) {
      return;
    }

    const currentLatLng = L.latLng(Number(userLocation[0]), Number(userLocation[1]));

    // Update existing marker position or create once
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(currentLatLng);
    } else {
      userMarkerRef.current = L.circleMarker(currentLatLng, {
        radius: 8,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).addTo(map);
    }

    // flyTo only on first fix or when moved more than 50 meters
    if (!lastFlyToPosRef.current) {
      map.flyTo(currentLatLng, 14);
      lastFlyToPosRef.current = currentLatLng;
    } else {
      const distance = lastFlyToPosRef.current.distanceTo(currentLatLng);
      if (distance > 50) {
        map.flyTo(currentLatLng, 14);
        lastFlyToPosRef.current = currentLatLng;
      }
    }
  }, [userLocation, map]);

  // Clean up user location marker only on unmount
  useEffect(() => {
    return () => {
      if (userMarkerRef.current) {
        try {
          map.removeLayer(userMarkerRef.current);
        } catch {
          // Safe ignore on unmount
        }
        userMarkerRef.current = null;
      }
    };
  }, [map]);

  // Helper to create routing control
  const createRoutingControl = useCallback((startLatLng, endLatLng) => {
    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
    const control = L.Routing.control({
      router: L.Routing.osrmv1({
        serviceUrl: OSRM_SERVICE_URL,
      }),
      waypoints: [startLatLng, endLatLng],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      show: isDesktop, // Collapse routing panel on screens under 768px so it does not cover the map
      createMarker: () => null,
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }]
      }
    });

    control.on('routingerror', (err) => {
      onRouteErrorRef.current?.(err);
    });

    control.addTo(map);
    return control;
  }, [map]);

  // Routing: reacts to both activeRoute and userLocation, with fallback to Delhi center if userLocation is absent
  useEffect(() => {
    if (!activeRoute) {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch {
          // Safe ignore
        }
        routingControlRef.current = null;
      }
      return;
    }

    if (!isValidCoordinate(activeRoute.lat, activeRoute.lng)) {
      return;
    }

    const startPoint = isValidLatLngTuple(userLocation)
      ? L.latLng(Number(userLocation[0]), Number(userLocation[1]))
      : L.latLng(MAP_CENTER[0], MAP_CENTER[1]);

    const endPoint = L.latLng(Number(activeRoute.lat), Number(activeRoute.lng));

    if (routingControlRef.current) {
      // Update waypoints without destroying and recreating the control
      routingControlRef.current.setWaypoints([startPoint, endPoint]);
    } else {
      routingControlRef.current = createRoutingControl(startPoint, endPoint);
    }
  }, [activeRoute, userLocation, map, createRoutingControl]);

  // Always clean up routing control on unmount
  useEffect(() => {
    return () => {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch {
          // Safe ignore
        }
        routingControlRef.current = null;
      }
    };
  }, [map]);

  return null;
}

/**
 * @typedef {Object} Station
 * @property {string|number} id - Unique identifier for the station
 * @property {number|string} lat - Latitude coordinate
 * @property {number|string} lng - Longitude coordinate
 * @property {string} [title] - Station title/name
 * @property {string} [address] - Station physical address
 * @property {string} [operator] - Charging network operator name
 * @property {string} [price] - Charging price display string
 * @property {string} [type] - Charger type (e.g. 'DC_FAST' or 'AC_SLOW')
 */

/**
 * @typedef {Object} StationReport
 * @property {'working'|'broken'|'occupied'|string} [status] - Current operational status
 * @property {number|string} [minutesAgo] - Minutes elapsed since status report
 * @property {string} [note] - Optional user note
 * @property {number} [wait_minutes] - Estimated wait time in minutes
 */

/**
 * @typedef {Object} MapComponentProps
 * @property {Station[]} stations - Array of station objects
 * @property {Station|null} [focusedStation] - Currently focused station
 * @property {Station|null} [activeRoute] - Target station for routing
 * @property {[number, number]|null} [userLocation] - Current user coordinates [lat, lng]
 * @property {(station: Station) => void} onReserve - Callback triggered when reserving a station
 * @property {(station: Station) => void} onRoute - Callback triggered when requesting route to a station
 * @property {((station: Station) => void)|null} [onReport] - Optional callback triggered to report station status
 * @property {((station: Station) => void)|null} [onOpenReviews] - Optional callback to view and submit reviews
 * @property {Record<string|number, StationReport>} [reportsByStation] - Station status reports indexed by station id
 * @property {Record<string|number, { averageRating: number|null, reviewCount: number }>} [ratingsByStation] - Station rating stats
 * @property {((error: Error | unknown) => void)} [onRouteError] - Optional callback when routing fails
 */

/**
 * Interactive Leaflet Map component displaying charging stations, user location, and turn-by-turn routes.
 * @param {MapComponentProps} props
 */
export default function MapComponent({ 
  stations, 
  focusedStation, 
  activeRoute, 
  userLocation, 
  onReserve, 
  onRoute, 
  onReport, 
  onOpenReviews,
  reportsByStation = {},
  ratingsByStation = {},
  onRouteError
}) {
  const [routeErrorToast, setRouteErrorToast] = useState(null);
  const [prevActiveRoute, setPrevActiveRoute] = useState(activeRoute);
  const [layerType, setLayerType] = useState('dark');

  const tileSettings = useMemo(() => getTileSettings(layerType), [layerType]);

  // Reset error toast when activeRoute changes
  if (activeRoute !== prevActiveRoute) {
    setPrevActiveRoute(activeRoute);
    if (routeErrorToast) {
      setRouteErrorToast(null);
    }
  }

  // Auto-dismiss routing error toast after 5 seconds
  useEffect(() => {
    if (routeErrorToast) {
      const timer = setTimeout(() => {
        setRouteErrorToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [routeErrorToast]);

  const handleRouteError = useCallback((err) => {
    const message = err?.error?.message || err?.message || 'Unable to calculate route. Please try again later.';
    setRouteErrorToast(message);
    if (typeof onRouteError === 'function') {
      onRouteError(err || new Error(message));
    }
  }, [onRouteError]);

  // Memoize station markers keyed on stations, reportsByStation, and ratingsByStation
  const stationMarkers = useMemo(() => {
    if (!Array.isArray(stations)) {
      return null;
    }

    return stations
      .filter(st => st && isValidCoordinate(st.lat, st.lng))
      .map(st => {
        const report = reportsByStation?.[st.id];
        const status = report?.status;
        const statusText = status === 'working' ? 'Working' : status === 'broken' ? 'Broken' : status === 'occupied' ? 'Occupied' : null;
        const statusBadgeLabel = status === 'working' ? '🟢 Working' : status === 'broken' ? '🔴 Broken' : status === 'occupied' ? '🟡 Occupied' : null;
        const statusColor = status === 'working' ? 'bg-emerald-100 text-emerald-800' : status === 'broken' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';

        // Fallbacks for missing fields
        const operator = st.operator || 'N/A';
        const price = st.price || 'N/A';
        const title = st.title || 'N/A';
        const address = st.address || 'N/A';

        // Guard report.minutesAgo
        const minutesAgoText = (report?.minutesAgo !== undefined && report?.minutesAgo !== null && report?.minutesAgo !== '')
          ? (Number(report.minutesAgo) === 0 ? 'just now' : `${report.minutesAgo} min ago`)
          : 'recently';

        const ratingStats = ratingsByStation?.[st.id];

        return (
          <Marker 
            key={st.id} 
            position={[Number(st.lat), Number(st.lng)]} 
            icon={getStationIcon(status, st.type === 'DC_FAST')}
          >
            <Popup maxWidth={260} autoPan={true} autoPanPadding={[12, 12]}>
              <div className="font-sans min-w-[210px] max-w-[240px]">
                <div className="flex justify-between items-center mb-1 gap-2">
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded truncate max-w-[120px]">{operator}</span>
                  <span className="text-xs font-bold text-emerald-700 shrink-0">{price}</span>
                </div>

                {statusText ? (
                  <div className="my-1.5 p-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded font-extrabold text-[10px] uppercase ${statusColor}`}>
                        {statusBadgeLabel}
                      </span>
                      <span className="text-gray-500 text-[10px] font-medium">
                        Updated {minutesAgoText}
                      </span>
                    </div>
                    {report?.note && (
                      <p className="mt-1 text-[10px] text-gray-700 bg-white/90 p-1 rounded border border-gray-200 leading-snug italic break-words">
                        &ldquo;{report.note}&rdquo;
                      </p>
                    )}
                    {report?.wait_minutes > 0 && (
                      <span className="text-amber-700 font-semibold text-[10px] block mt-0.5">
                        ⏱ Est. wait: ~{report.wait_minutes} min
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="my-1.5 p-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded font-extrabold text-[10px] uppercase bg-emerald-100 text-emerald-800">
                        🟢 Normal Status
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Operational</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 italic">
                      No community reports in last 2 hrs
                    </p>
                  </div>
                )}

                <h4 className="font-bold text-gray-900 text-sm mt-1 leading-snug">{title}</h4>
                <p className="text-xs text-gray-600 mt-0.5 leading-tight line-clamp-2">{address}</p>

                {/* Rating button / summary row */}
                <div className="mt-1.5 pt-1.5 border-t border-gray-200 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => onOpenReviews?.(st)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>⭐ {ratingStats?.averageRating ? `${ratingStats.averageRating} (${ratingStats.reviewCount})` : 'No reviews'}</span>
                    <span className="text-[10px] font-normal text-gray-500">· Reviews</span>
                  </button>
                  <span className="text-[10px] font-semibold text-gray-500">
                    {st.type === 'DC_FAST' ? '⚡ DC Fast' : '🔌 AC Slow'}
                  </span>
                </div>
                
                <div className="flex gap-1.5 mt-2.5">
                  <button 
                    type="button"
                    onClick={() => onReserve?.(st)} 
                    className="bg-emerald-500 text-gray-950 font-bold px-2.5 py-2 text-xs rounded-lg hover:bg-emerald-400 transition flex-1 cursor-pointer min-h-[40px] flex items-center justify-center"
                  >
                    Reserve
                  </button>
                  <button 
                    type="button"
                    onClick={() => onRoute?.(st)} 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-2 text-xs rounded-lg transition flex-1 cursor-pointer min-h-[40px] flex items-center justify-center"
                  >
                    Route
                  </button>
                  {onReport && (
                    <button 
                      type="button"
                      onClick={() => onReport(st)} 
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-2 py-2 text-xs rounded-lg transition border border-gray-300 cursor-pointer min-h-[40px] flex items-center justify-center"
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      });
  }, [stations, reportsByStation, ratingsByStation, onReserve, onRoute, onReport, onOpenReviews]);

  return (
    <div className="h-full w-full relative min-h-[250px] md:min-h-0">
      {/* Map Layer Switcher: toggle between Dark view and OpenStreetMap Street view */}
      <div className="absolute top-2.5 left-2.5 z-[1000] flex items-center bg-gray-900/90 border border-gray-700/80 rounded-xl p-0.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => setLayerType('dark')}
          className={`px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
            layerType === 'dark'
              ? 'bg-emerald-500 text-gray-950 font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-gray-800'
          }`}
          title="Switch to Dark map"
        >
          <span>🌙 Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setLayerType('street')}
          className={`px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
            layerType === 'street'
              ? 'bg-emerald-500 text-gray-950 font-bold shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-gray-800'
          }`}
          title="Switch to standard OpenStreetMap Street view"
        >
          <span>🗺️ Street</span>
        </button>
      </div>

      {/* Accessible Marker Legend */}
      <div 
        role="region"
        aria-label="Map Marker Color Legend"
        className="absolute bottom-2 left-2 z-[1000] bg-gray-900/90 border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-[10px] text-gray-300 shadow-lg backdrop-blur-md hidden sm:flex items-center gap-2.5 pointer-events-auto"
      >
        <span className="font-bold text-gray-200">Legend:</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-gray-950"></span> Working (✓)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block border border-gray-950"></span> Occupied (⏱)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block border border-gray-950"></span> Broken (✕)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block border border-gray-950"></span> Default (Speed)</span>
      </div>

      {/* Non-blocking inline routing error toast */}
      {routeErrorToast && (
        <div 
          role="alert"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/95 border border-red-500/50 text-white text-xs px-3.5 py-2 rounded-lg shadow-xl flex items-center gap-2 backdrop-blur-sm pointer-events-auto max-w-[90vw]"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="truncate">{routeErrorToast}</span>
          <button 
            type="button" 
            onClick={() => setRouteErrorToast(null)} 
            className="text-gray-400 hover:text-white font-bold ml-1 text-sm leading-none focus:outline-none cursor-pointer"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      <MapContainer 
        center={MAP_CENTER} 
        zoom={MAP_ZOOM} 
        style={{ height: '100%', width: '100%', zIndex: 10 }} 
        zoomControl={false}
        touchZoom={true}
        dragging={true}
      >
        <TileLayer 
          key={layerType}
          url={tileSettings.url} 
          attribution={tileSettings.attribution} 
          className={tileSettings.className}
          maxZoom={19}
        />
        
        {stationMarkers}

        <MapController 
          focusedStation={focusedStation} 
          activeRoute={activeRoute} 
          userLocation={userLocation} 
          onRouteError={handleRouteError}
        />
      </MapContainer>
    </div>
  );
}
