# ⚡ Electrify Mobility

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg?logo=leaflet)](https://leafletjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

**Electrify Mobility** is a modern, high-performance web platform designed to empower Electric Vehicle (EV) drivers across Delhi-NCR. It provides real-time discovery of EV charging hubs, turnkey navigation with turn-by-turn routing, live connector availability status, community ratings, and advance slot reservations—all wrapped in a sleek, responsive dark-mode interface.

---

## 🌟 Key Features

### 🗺️ Interactive GIS Map & Custom Markers
- Built using **React-Leaflet** and **Leaflet** with high-clarity **Esri World Street Map** tiles.
- Dynamic color-coded SVG map pins:
  - 🟢 **Emerald Pins**: DC Fast Charging Hubs (50kW – 120kW).
  - 🔵 **Blue Pins**: Level 2 AC Slow Chargers (15kW – 22kW).
- Interactive popup overlays providing instant access to operator brand, address, pricing, direct route calculation, and booking triggers.
- Smooth camera panning and animated fly-to transitions (`map.flyTo`) when focusing on any station.

### 🧭 Real-Time OSRM Turn-by-Turn Routing
- Integrated with **Leaflet Routing Machine** powered by the **Open Source Routing Machine (OSRM)**.
- Automatically calculates the driving route from your current GPS location (or central Delhi benchmark) to any target charging hub.
- Custom-tailored dark-mode turn-by-turn instruction overlay displaying trip distances, estimated travel time, and maneuvers without cluttering the map.

### 📍 Geolocation & "Near Me" Discovery
- HTML5 Geolocation API integration allows drivers to pinpoint their live coordinates with a single click.
- Displays a prominent user location indicator and re-centers the map to reveal immediately accessible charging points.

### 🔍 Multi-Parameter Search & Instant Filtering
- **Keyword Search**: Instant search matching station name, street address, or charging network operator (Tata Power, Statiq, Ather Grid, EESL, Zeon, ChargePoint).
- **Charger Speed Filter**: Toggle between *All Speeds*, *⚡ DC Fast Charger*, and *🔌 Level 2 AC*.
- **NCR Sub-Region Filter**: Filter stations across Delhi, Gurugram, Noida, and Ghaziabad.
- Live station counter reflecting dynamic query results.

### 📅 Time-Slot Reservation Modal
- In-app slot reservation modal to reserve charging spots ahead of arrival.
- Select from available morning, afternoon, and evening time slots (e.g., 10:30 AM, 01:00 PM, 04:30 PM).
- Instant booking confirmation and status notifications.

### 👍 Community Upvoting & Reliability Score
- EV drivers can upvote reliable and functional charging points to help other drivers discover dependable infrastructure.
- Real-time vote incrementing persisted during user session.

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend / BaaS** | [Supabase](https://supabase.com/) (`@supabase/supabase-js`) | PostgreSQL, Row-Level Security, Realtime subscriptions, Anonymous Auth |
| **Frontend Framework** | [React 19](https://react.dev/) | Component architecture, state hooks, modern lifecycle |
| **Build Tooling** | [Vite 8](https://vite.dev/) | Blazing fast HMR, Rollup bundling |
| **Map Engine** | [Leaflet](https://leafletjs.com/) & [React-Leaflet v5](https://react-leaflet.js.org/) | Geospatial mapping, marker layer rendering |
| **Routing Service** | [Leaflet Routing Machine](http://www.liedman.net/leaflet-routing-machine/) | OSRM-based navigation and direction calculation |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`) | Utility-first responsive design, modern dark aesthetic |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, lightweight UI icons |
| **Linter** | [Oxlint](https://oxc.rs/) | High-speed JavaScript/JSX linting |
| **Bundling Plugin** | [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) | Standalone single-file HTML distribution support |

---

## 📁 Repository Structure

```text
Electrify-Mobility/
├── README.md                      # Primary project documentation
└── react-app/                     # Frontend client workspace
    ├── index.html                 # Single page application HTML shell
    ├── package.json               # Dependencies and build scripts
    ├── vite.config.js             # Vite configuration with Tailwind & singlefile plugins
    ├── .oxlintrc.json             # Oxlint configuration
    ├── public/
    │   ├── favicon.svg            # Electrify Mobility lightning brand favicon
    │   └── icons.svg              # SVG asset collection
    └── src/
        ├── App.jsx                # Main application component (state, sidebar, search & filters, modal)
        ├── MapComponent.jsx       # Leaflet map container, custom icons, popup & routing controller
        ├── data.js                # Curated Delhi-NCR charging station dataset & connector specs
        ├── index.css              # Global styles, Tailwind directives & Leaflet dark theme customizations
        └── main.jsx               # React 19 root mounting
```

---

## 📊 Station Dataset & Schema (`data.js`)

Each charging station entry is modeled with comprehensive EV attributes:

```javascript
{
  id: 201,
  title: "Statiq Superfast Charging Hub - Cyber City",
  operator: "Statiq",
  address: "DLF Cyber City, Phase 2, Sector 24",
  region: "Gurugram",
  lat: 28.4950,
  lng: 77.0895,
  type: "DC_FAST",           // 'DC_FAST' | 'AC_SLOW'
  kw: 60,                    // Power rating in kW
  price: "₹18.50 / kWh",     // Tariff
  connectors: ["CCS-2", "GB/T"], // Supported plug types
  available: 3,              // Available plugs right now
  total: 4,                  // Total installed dispensers
  votes: 12                  // Community upvotes
}
```

### Coverage Highlights:
- **Delhi**: Connaught Place (CP), Aerocity Hub, Nehru Place Bus Terminal
- **Gurugram**: DLF Cyber City, MG Road Metro Station
- **Noida & Greater Noida**: Sector 18 (Mall of India), Commercial Belt Alpha 1
- **Ghaziabad**: Shipra Mall, Indirapuram

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version `18.x` or higher recommended)
- `npm` (bundled with Node.js) or `pnpm` / `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/Electrify-Mobility.git
   cd Electrify-Mobility
   ```

2. **Navigate to the frontend workspace:**
   ```bash
   cd react-app
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

---

## 💻 Running the Application

### Start Development Server
Launch the Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```

The application will be accessible at:
```text
http://localhost:5173/
```

### Build for Production
To create an optimized, minified production build:
```bash
npm run build
```
The output will be generated inside the `react-app/dist/` directory.

### Preview Production Build
```bash
npm run preview
```

### Run Code Quality Linter
```bash
npm run lint
```

---

## 🗺️ How to Use

1. **Browse & Explore**: Drag, zoom, and pan across the interactive Delhi-NCR map.
2. **Find Near You**: Click the **"Near Me"** button on the top navigation bar to center the map on your current location.
3. **Filter Stations**: Use the search input or dropdowns in the sidebar to filter by speed (DC Fast vs. AC Slow) or region (Delhi, Gurugram, Noida).
4. **Inspect Station Details**: Click on any sidebar card or map marker to view connector standards, kilowatt capacity, and tariff rates.
5. **Get Driving Directions**: Click the **"Route"** button on any station to view live OSRM turn-by-turn directions.
6. **Reserve a Slot**: Click **"Reserve"**, pick your preferred time slot, and confirm your booking.
7. **Support the Community**: Click the thumbs-up icon on cards to upvote dependable stations.

---

## 🔮 Roadmap & Upcoming Features

- [ ] **Live Network API Integration**: Connect with real-time OCPI/OCPP feeds (Tata Power EZ Charge, Statiq, Bolt.earth) for live plug availability.
- [ ] **Add Charger Form**: Interactive community submission form to crowdsource new private and public charging locations.
- [ ] **Battery Range Estimator**: Route planner that computes estimated battery % consumption based on vehicle model and distance.
- [ ] **User Authentication & Payment Gateway**: Integration with Razorpay / UPI for payment processing during slot reservation.
- [ ] **User Reviews & Station Photos**: Allow drivers to leave photos, review notes, and connector issue reports.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
