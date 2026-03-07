# 🛡️ TrailGuard

**Universal buddy system for trail riders — snowmobiles, ATVs, dirt bikes, UTVs.**

Works year-round, works everywhere, works for everyone.

## Core Features
- 📡 **Satellite Bridge** — Garmin inReach + SPOT integration for off-grid tracking
- 🚨 **Dead Man's Switch** — Auto-alert if rider stops moving unexpectedly
- 💥 **Crash Detection** — Accelerometer-based with auto-SOS and emergency info card
- 🗺️ **Offline-First Maps** — Full trail maps downloadable, work with zero signal
- 👥 **Group Safety Roles** — Leader / Sweep designation, rally points, count-me-out timer
- ⚠️ **Condition Overlays** — Live trail conditions from the community
- 🌨️ **Avalanche Zones** — Winter overlay from avalanche.org

## Stack
- **App:** React Native (iOS + Android)
- **Backend:** Node.js + Express + WebSocket
- **DB:** PostgreSQL + PostGIS
- **Maps:** Mapbox (offline tiles)
- **Satellite:** Garmin Explore API, SPOT API, Zoleo API
- **Infra:** Docker, Redis

## Repo Structure
```
app/        React Native mobile app
backend/    Node.js API + WebSocket server
shared/     Shared TypeScript types + utilities
docs/       Architecture + API docs
```

## Getting Started

```bash
# Backend
cd backend && npm install && npm run dev

# App (iOS)
cd app && npm install
cd ios && pod install
open TrailGuard.xcworkspace
```

## Domain
trailguard.com (to be registered)
