import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';

const MAP_CENTER = [28.6139, 77.2090];
const MAP_ZOOM = 11;
const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

const createIcon = (isFast) => L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: `
    <div style="width:32px; height:32px; border-radius:50%; border:2px solid #030712; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 15px -3px rgba(0,0,0,0.5); background-color: ${isFast ? '#10b981' : '#3b82f6'}; color:#030712;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="${isFast ? '13 2 3 14 12 14 11 22 21 10 12 10 13 2' : '6 2 18 2 18 7 14 7 14 11 14 22 10 22 10 11 6 11 6 7 6 2' }"></polygon></svg>
    </div>`
});

// Component to handle map view updates
function MapController({ focusedStation, activeRoute, userLocation }) {
  const map = useMap();
  const [routingControl, setRoutingControl] = useState(null);

  // Focus station
  useEffect(() => {
    if (focusedStation) {
      map.flyTo([focusedStation.lat, focusedStation.lng], 15, { duration: 1.2 });
    }
  }, [focusedStation, map]);

  // Locate user
  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 14);
      L.circleMarker(userLocation, { radius: 8, fillColor: '#3b82f6', color: '#ffffff', weight: 2, fillOpacity: 1 }).addTo(map);
    }
  }, [userLocation, map]);

  // Routing with custom cleaner UI
  useEffect(() => {
    if (activeRoute) {
      if (routingControl) map.removeControl(routingControl);
      
      const startPoint = userLocation ? L.latLng(userLocation[0], userLocation[1]) : L.latLng(MAP_CENTER[0], MAP_CENTER[1]);
      const endPoint = L.latLng(activeRoute.lat, activeRoute.lng);
      
      const control = L.Routing.control({
        waypoints: [startPoint, endPoint],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        // Override the default ugly routing box by hiding it in CSS or custom formatter
        createMarker: function() { return null; }, // hide default waypoints
        lineOptions: {
          styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }]
        }
      }).addTo(map);

      // We apply custom CSS in index.css to make the routing box look beautiful
      setRoutingControl(control);
    }
    // eslint-disable-next-line
  }, [activeRoute, map]);

  return null;
}

export default function MapComponent({ stations, focusedStation, activeRoute, userLocation, onReserve, onRoute }) {
  return (
    <div className="h-full w-full relative">
      <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: '100%', width: '100%', zIndex: 10 }} zoomControl={false}>
        <TileLayer url={TILE_URL} attribution="&copy; Esri" />
        
        {stations.map(st => (
          <Marker key={st.id} position={[st.lat, st.lng]} icon={createIcon(st.type === 'DC_FAST')}>
            <Popup>
              <div className="font-sans min-w-[200px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">{st.operator}</span>
                </div>
                <h4 className="font-bold text-gray-100 text-sm mt-1">{st.title}</h4>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onReserve(st)} className="bg-emerald-500 text-gray-950 font-bold px-3 py-1.5 text-xs rounded-lg hover:bg-emerald-400 transition w-full">Reserve</button>
                  <button onClick={() => onRoute(st)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 text-xs rounded-lg transition w-full">Route</button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapController focusedStation={focusedStation} activeRoute={activeRoute} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
}
