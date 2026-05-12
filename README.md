# F1 Live Dashboard

A modern Formula 1 analytics dashboard built with:

* Next.js
* React
* TailwindCSS
* FastAPI
* FastF1

The project provides interactive Formula 1 session exploration, podium visualization, driver details, and track analysis using official telemetry and timing data from FastF1.

---
## 📸 Screenshots

<p align="center">
  <img src="docs/1.png" alt="Screenshot 1" width="800"/>
</p>

<p align="center">
  <img src="docs/2.png" alt="Screenshot 2" width="800"/>
</p>

<p align="center">
  <img src="docs/3.png" alt="Screenshot 3" width="800"/>
</p>

<p align="center">
  <img src="docs/4.png" alt="Screenshot 4" width="800"/>
</p>

<p align="center">
  <img src="docs/5.png" alt="Screenshot 5" width="800"/>
</p>
---

# Features

## Current Features

### Session Browser

* Browse Formula 1 sessions by season
* Group sessions by country
* Expandable session lists
* Dynamic session loading from backend API

### Session Details

* Open detailed session pages
* View race results and classifications
* Interactive navigation between sessions

### Podium Visualization

* Dynamic podium blocks for P1–P3
* Driver modal popup with:

  * Driver photo
  * Team name
  * Broadcast name
  * Driver number
  * Finishing position

### Driver Information

* Fetch driver data dynamically from FastF1
* Reusable driver detail components
* Driver lookup using session and driver number

### Circuit Data

* Track metadata endpoints
* Corner information
* Marshal sectors
* Circuit rotation data
* Track coordinate extraction

### Responsive Dashboard UI

* TailwindCSS-based design
* Mobile-friendly layout
* Dark mode compatible
* Dashboard-ready component structure

---

# Planned Features

## Live Telemetry Tracking

Real-time telemetry visualization:

* Live car positions
* Speed traces
* Gear changes
* Throttle and brake telemetry
* Sector deltas
* Gap analysis

## Race Replay Animation

Animated race simulation:

* Replay complete races
* Driver movement on SVG track map
* Overtake animations
* Sector timing playback
* Safety car and pit stop visualization

## Advanced Track Visualization

* SVG circuit rendering
* Interactive corner labels
* DRS zones
* Racing lines
* Speed heatmaps
* Mini sectors

## Driver Analytics

* Lap comparison
* Qualifying analysis
* Tire strategy visualization
* Stint analysis
* Consistency metrics

## Team Analytics

* Constructor performance
* Pit stop analysis
* Team pace comparison
* Telemetry overlays

## Historical Analysis

* Multi-season comparisons
* Driver progression
* Circuit evolution
* Historical lap records

## FastF1 Integration Expansion

Future integrations may include:

* Weather data
* Tire compounds
* Radio messages
* Live timing
* Track status flags
* Safety car periods
* Pit stop timing
* Sector telemetry
* Delta timing

---

# Project Structure

```bash
project-root/
│
├── backend/
│   ├── main.py
│   ├── api/
│   └── services/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
│
└── README.md
```

---

# Backend Stack

## Technologies

* FastAPI
* FastF1
* Pandas
* NumPy
* Uvicorn

## Responsibilities

* Fetch telemetry and timing data
* Process FastF1 sessions
* Serialize telemetry into JSON
* Provide REST API endpoints

---

# Frontend Stack

## Technologies

* Next.js
* React
* TailwindCSS
* TypeScript

## Responsibilities

* Dashboard UI
* Interactive components
* Track rendering
* Race visualizations
* Driver modals
* Session navigation

---

# Installation

## Requirements

### Backend

* Python 3.11+

### Frontend

* Node.js 20+
* npm

---

# Backend Setup

## 1. Clone repository

```bash
git clone <repository-url>
cd project-root
```

## 2. Create virtual environment

```bash
python -m venv .venv
```

## 3. Activate virtual environment

### Linux / Ubuntu

```bash
source .venv/bin/activate
```

### Windows

```bash
.venv\Scripts\activate
```

## 4. Install backend dependencies

```bash
pip install fastapi uvicorn fastf1 pandas numpy
```

## 5. Run backend server

```bash
uvicorn main:app --reload
```

Backend will run on:

```text
http://127.0.0.1:8000
```

---

# Frontend Setup

## 1. Navigate to frontend

```bash
cd frontend
```

## 2. Install dependencies

```bash
npm install
```

## 3. Run development server

```bash
npm run dev
```

Frontend will run on:

```text
http://localhost:3000
```
# Example Screens

Potential dashboard views:

* Season explorer
* Race result cards
* Podium blocks
* Driver popup modals
* Interactive SVG track map
* Telemetry overlays
* Race replay animations

---

# Performance Goals

The project is designed to support:

* Cached telemetry processing
* Efficient API serialization
* Reusable React components
* Responsive SVG rendering
* Real-time telemetry updates

---

# Long-Term Goals

The objective is to evolve this project into a complete Formula 1 telemetry and analytics platform capable of:

* Live race monitoring
* Historical race analysis
* Interactive telemetry exploration
* Professional-grade race visualization
* Multi-driver telemetry comparison
* AI-assisted race insights

---

# Known Challenges

* FastF1 telemetry serialization
* Large telemetry dataset optimization
* SVG rendering performance
* Real-time synchronization
* Track coordinate transformations

---

# Credits

## Data Source

* FastF1
* Formula 1 timing data

## Libraries

* React
* Next.js
* TailwindCSS
* FastAPI
* Pandas
* NumPy

---

# License

This project is intended for educational and analytical purposes.

Formula 1 and related trademarks belong to their respective owners.
