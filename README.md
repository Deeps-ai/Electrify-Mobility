# Electrify Mobility

Electrify Mobility is a modern web application designed to help electric vehicle (EV) owners locate and route to charging stations efficiently. 

## Features

- **Interactive Map**: Built with React Leaflet to provide a seamless mapping experience.
- **Charging Stations Locator**: View nearby EV charging stations on the map.
- **Real-time Routing**: Get optimal driving routes from your location to the selected charging station using Open Source Routing Machine (OSRM).
- **Reservation System**: Quickly reserve a charging slot directly from the station's map popup.

## Tech Stack

- **Frontend Framework**: React (via Vite)
- **Map Integration**: `react-leaflet`, `leaflet`, `leaflet-routing-machine`
- **Styling**: Tailwind CSS (assumed based on class names)

## Getting Started

### Prerequisites

- Node.js installed on your machine.

### Installation

1. Clone the repository and navigate to the project directory.
2. Go into the `react-app` folder:
   ```bash
   cd react-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

Start the Vite development server:
```bash
npm run dev
```

Open your browser and navigate to the local URL (usually `http://localhost:5173`) to view the application.
