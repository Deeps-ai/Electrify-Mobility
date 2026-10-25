# Electrify Mobility - Frontend Client (`react-app`)

This directory houses the React 19 + Vite frontend application for **Electrify Mobility**.

## 🚀 Quick Start

From this directory (`react-app`):

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview

# Run Oxlint
npm run lint
```

## 🏗️ Architecture & Component Overview

- **[`src/App.jsx`](file:///c:/Users/Deepanshu/OneDrive/Desktop/Projectss/Electrify%20Moblity/Electrify-Mobility/react-app/src/App.jsx)**:
  - Top header with "Near Me" geolocation trigger and "Add Charger" action.
  - Search and filter bar for DC Fast vs. AC Slow chargers and NCR regions (Delhi, Gurugram, Noida).
  - Station listing sidebar with real-time community upvoting.
  - Slot reservation dialog modal with selectable time slots and confirmation handler.
- **[`src/MapComponent.jsx`](file:///c:/Users/Deepanshu/OneDrive/Desktop/Projectss/Electrify%20Moblity/Electrify-Mobility/react-app/src/MapComponent.jsx)**:
  - Leaflet map view using Esri World Street Map tiles.
  - Custom SVG map markers distinguishing DC Fast (emerald) and AC Slow (blue) chargers.
  - `MapController` sub-component managing animated camera pans (`flyTo`) and OSRM turn-by-turn routing via `leaflet-routing-machine`.
- **[`src/data.js`](file:///c:/Users/Deepanshu/OneDrive/Desktop/Projectss/Electrify%20Moblity/Electrify-Mobility/react-app/src/data.js)**:
  - Curated dataset of Delhi-NCR EV charging hubs (Statiq, Tata Power EZ Charge, Ather Grid, EESL, Zeon) with connector standards, pricing, and live capacities.
- **[`src/index.css`](file:///c:/Users/Deepanshu/OneDrive/Desktop/Projectss/Electrify%20Moblity/Electrify-Mobility/react-app/src/index.css)**:
  - Tailwind CSS imports and custom dark-theme overrides for Leaflet map containers, popups, and OSRM routing panels.
- **[`vite.config.js`](file:///c:/Users/Deepanshu/OneDrive/Desktop/Projectss/Electrify%20Moblity/Electrify-Mobility/react-app/vite.config.js)**:
  - Bundling configured with `@vitejs/plugin-react`, `@tailwindcss/vite`, and `vite-plugin-singlefile`.

For full project documentation and roadmap details, see the root [README.md](file:///c:/Users/Deepanshu/OneDrive/Desktop/Projectss/Electrify%20Moblity/Electrify-Mobility/README.md).
