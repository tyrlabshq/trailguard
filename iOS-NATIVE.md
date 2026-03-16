# TrailGuard — Native iOS

This directory contains the native SwiftUI + TCA iOS implementation of TrailGuard.
The React Native reference implementation lives in `app/` and is kept for reference only.

## Quick Start

### Prerequisites
- Xcode 15+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`
- Swift 5.9+

### Generate Xcode Project

```bash
cd ~/.openclaw/workspace/projects/trailguard
xcodegen generate
open TrailGuard.xcodeproj
```

### Dependencies (via Swift Package Manager)

Resolved automatically by Xcode on first open:
- [ComposableArchitecture](https://github.com/pointfreeco/swift-composable-architecture) v1.9+
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift) v2.5+

## Project Structure

```
Sources/TrailGuard/
├── App/
│   ├── AppEntry.swift          ← @main entry point
│   └── AppReducer.swift        ← Root TCA reducer (composes all features)
├── Features/
│   ├── CrashDetection/         ← CoreMotion impact detection + alert pipeline
│   ├── DeadManSwitch/          ← Check-in timer + BGTaskScheduler
│   ├── GroupRide/              ← Group creation, live map, roles
│   ├── TrailConditions/        ← Community trail reports + map pins
│   ├── SOS/                    ← Manual SOS hold-to-confirm + active screen
│   └── EmergencyCard/          ← Required medical info + contacts
├── Models/
│   ├── User.swift
│   ├── Ride.swift + Waypoint
│   ├── EmergencyCard.swift
│   ├── GroupSession.swift
│   └── TrailCondition.swift
├── Services/
│   ├── LocationService.swift   ← CoreLocation, background updates, waypoint buffer
│   ├── MotionService.swift     ← CoreMotion, activity-gated accelerometer
│   ├── NotificationService.swift ← APNs, critical alerts, DMS notifications
│   └── SupabaseClient.swift    ← TCA dependency for all Supabase calls
└── UI/Components/              ← Shared SwiftUI components
```

## Architecture

**TCA (The Composable Architecture)** throughout:
- Each feature has a `*Reducer.swift` (State + Action + Body) and `*View.swift`
- `AppReducer` composes all feature reducers via `Scope`
- Dependencies (`LocationService`, `MotionService`, `SupabaseClient`) injected via `@Dependency`
- Tests use TCA `TestStore` — see `Tests/TrailGuardTests/`

## Environment Setup

Add to your Xcode scheme's environment variables (or use a `.xcconfig`):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Build Status

🚧 **Scaffold phase** — all files are shells with TODO comments.
Feature implementation follows the phases in the MVP spec:
- **Phase 1** (8w): Auth, onboarding, emergency card, ride recording, crash detection, SOS
- **Phase 2** (4w): DMS, group ride, offline maps, Garmin display
- **Phase 3** (4w): Paywall, StoreKit 2, App Store prep

## Key Decisions

- **Crash detection gates on activity type** — accelerometer only runs when CMMotionActivityManager detects "automotive" context, reducing battery drain significantly.
- **APNs critical alerts** — DMS escalation requires Apple entitlement. Apply early (safety justification in the App Store Connect request is key).
- **Supabase Realtime for group map** — WebSocket updates every 10s per rider. `rider_locations` table is ephemeral (TTL via cron every 5min for stale rows).
- **Waypoints batched** — buffered in memory, flushed every 30s. CoreData local backup for offline resilience.

## References

- MVP Spec: `artifacts/reports/2026-03-16_1103_trailguard-mvp-spec.md`
- App Store Copy: `artifacts/reports/2026-03-16_1100_TJ_trailguard-appstore.md`
