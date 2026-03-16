// RideRecordingReducer.swift
// TrailGuard — Features/RideRecording
//
// TCA state machine for GPS ride recording.
// States: idle → countdown → recording → paused → finished
// Tracks location via CoreLocation, batches waypoints to Supabase every 10 locations.

import ComposableArchitecture
import CoreLocation
import Foundation
import Supabase

@Reducer
struct RideRecordingReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var phase: Phase = .idle
        var countdownSeconds: Int = 3

        // Active ride data
        var rideId: UUID?
        var startedAt: Date?
        var elapsedSeconds: Int = 0
        var distanceMiles: Double = 0
        var currentSpeedMPH: Double = 0
        var maxSpeedMPH: Double = 0
        var elevationFeet: Double = 0

        // Route polyline coordinates
        var routeCoordinates: [CoordinatePoint] = []
        var lastLocation: CoordinatePoint?

        // Waypoint buffer
        var pendingWaypoints: [WaypointPayload] = []
        var totalWaypointsSaved: Int = 0

        // Supabase state
        var isSaving: Bool = false
        var saveError: String?

        // Pause tracking
        var pausedAt: Date?
        var totalPausedSeconds: Int = 0

        enum Phase: Equatable {
            case idle
            case countdown
            case recording
            case paused
            case finished
        }

        // Derived
        var isTracking: Bool { phase == .recording }
        var durationFormatted: String {
            let h = elapsedSeconds / 3600
            let m = (elapsedSeconds % 3600) / 60
            let s = elapsedSeconds % 60
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        var distanceFormatted: String {
            String(format: "%.1f mi", distanceMiles)
        }
        var speedFormatted: String {
            String(format: "%.0f mph", max(0, currentSpeedMPH))
        }
        var elevationFormatted: String {
            String(format: "%.0f ft", elevationFeet)
        }
    }

    // MARK: - Lightweight coordinate (Equatable, no CLLocationCoordinate2D)

    struct CoordinatePoint: Equatable, Identifiable {
        let id = UUID()
        let latitude: Double
        let longitude: Double
        let altitude: Double
        let speed: Double       // m/s from CLLocation
        let heading: Double
        let timestamp: Date
    }

    // MARK: - Waypoint insert payload (no server-generated id)

    struct WaypointPayload: Equatable, Encodable {
        let ride_id: String
        let lat: Double
        let lng: Double
        let altitude_m: Double?
        let speed_mph: Double?
        let heading: Double?
        let recorded_at: String
    }

    // MARK: - Action

    enum Action {
        // User
        case startRideTapped
        case pauseRideTapped
        case resumeRideTapped
        case stopRideTapped
        case confirmStop
        case cancelStop
        case rideFinishedDismissed

        // Countdown
        case countdownTick
        case countdownFinished

        // Recording
        case tick
        case locationUpdated(CoordinatePoint)
        case locationStreamEnded

        // Waypoint batching
        case flushWaypoints
        case waypointsSaved(Int)
        case waypointSaveFailed(String)

        // Ride lifecycle (Supabase)
        case rideCreated(UUID)
        case rideCreateFailed(String)
        case rideEnded
        case rideEndFailed(String)
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase
    @Dependency(\.continuousClock) var clock
    @Dependency(\.locationService) var locationService
    @Dependency(\.uuid) var uuid
    @Dependency(\.date) var date

    // MARK: - Cancel IDs

    private enum CancelID {
        case countdown
        case timer
        case locationStream
    }

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            // MARK: Start Ride → Countdown
            case .startRideTapped:
                state.phase = .countdown
                state.countdownSeconds = 3
                return .run { send in
                    // Request location permission before starting
                    await locationService.requestAlwaysAuthorization()
                    for await _ in clock.timer(interval: .seconds(1)) {
                        await send(.countdownTick)
                    }
                }
                .cancellable(id: CancelID.countdown, cancelInFlight: true)

            case .countdownTick:
                state.countdownSeconds -= 1
                if state.countdownSeconds <= 0 {
                    return .concatenate(
                        .cancel(id: CancelID.countdown),
                        .send(.countdownFinished)
                    )
                }
                return .none

            // MARK: Countdown → Recording
            case .countdownFinished:
                state.phase = .recording
                state.startedAt = date.now
                state.elapsedSeconds = 0
                state.distanceMiles = 0
                state.currentSpeedMPH = 0
                state.maxSpeedMPH = 0
                state.elevationFeet = 0
                state.routeCoordinates = []
                state.pendingWaypoints = []
                state.totalWaypointsSaved = 0
                state.totalPausedSeconds = 0
                state.pausedAt = nil

                return .merge(
                    // Create ride in Supabase
                    .run { send in
                        do {
                            let userId = try await supabase.auth.session.user.id
                            let rideId = UUID()
                            struct InsertPayload: Encodable {
                                let id: String
                                let rider_id: String
                                let started_at: String
                            }
                            let iso = ISO8601DateFormatter()
                            let payload = InsertPayload(
                                id: rideId.uuidString,
                                rider_id: userId.uuidString,
                                started_at: iso.string(from: Date())
                            )
                            try await supabase
                                .from("rides")
                                .insert(payload)
                                .execute()
                            await send(.rideCreated(rideId))
                        } catch {
                            await send(.rideCreateFailed(error.localizedDescription))
                        }
                    },
                    // Start elapsed timer
                    .run { send in
                        for await _ in clock.timer(interval: .seconds(1)) {
                            await send(.tick)
                        }
                    }
                    .cancellable(id: CancelID.timer, cancelInFlight: true),
                    // Start location stream
                    .run { send in
                        let stream = locationService.startUpdating()
                        for await location in stream {
                            let point = CoordinatePoint(
                                latitude: location.coordinate.latitude,
                                longitude: location.coordinate.longitude,
                                altitude: location.altitude,
                                speed: location.speed,
                                heading: location.course,
                                timestamp: location.timestamp
                            )
                            await send(.locationUpdated(point))
                        }
                        await send(.locationStreamEnded)
                    }
                    .cancellable(id: CancelID.locationStream, cancelInFlight: true)
                )

            case let .rideCreated(rideId):
                state.rideId = rideId
                return .none

            case let .rideCreateFailed(error):
                state.saveError = error
                return .none

            // MARK: Timer Tick
            case .tick:
                guard state.phase == .recording else { return .none }
                state.elapsedSeconds += 1
                return .none

            // MARK: Location Update
            case let .locationUpdated(point):
                guard state.phase == .recording else { return .none }

                // Calculate distance from last point
                if let last = state.lastLocation {
                    let from = CLLocation(latitude: last.latitude, longitude: last.longitude)
                    let to = CLLocation(latitude: point.latitude, longitude: point.longitude)
                    let meters = to.distance(from: from)
                    state.distanceMiles += meters / 1609.344
                }

                // Speed: CLLocation.speed is m/s, convert to mph
                let speedMPH = max(0, point.speed * 2.23694)
                state.currentSpeedMPH = speedMPH
                if speedMPH > state.maxSpeedMPH {
                    state.maxSpeedMPH = speedMPH
                }

                // Elevation in feet
                state.elevationFeet = point.altitude * 3.28084

                state.lastLocation = point
                state.routeCoordinates.append(point)

                // Buffer waypoint for batch write
                if let rideId = state.rideId {
                    let iso = ISO8601DateFormatter()
                    let wp = WaypointPayload(
                        ride_id: rideId.uuidString,
                        lat: point.latitude,
                        lng: point.longitude,
                        altitude_m: point.altitude,
                        speed_mph: speedMPH,
                        heading: point.heading >= 0 ? point.heading : nil,
                        recorded_at: iso.string(from: point.timestamp)
                    )
                    state.pendingWaypoints.append(wp)
                }

                // Flush every 10 waypoints
                if state.pendingWaypoints.count >= 10 {
                    return .send(.flushWaypoints)
                }
                return .none

            case .locationStreamEnded:
                return .none

            // MARK: Waypoint Flush
            case .flushWaypoints:
                guard !state.pendingWaypoints.isEmpty, !state.isSaving else { return .none }
                state.isSaving = true
                let batch = state.pendingWaypoints
                state.pendingWaypoints = []
                return .run { send in
                    do {
                        try await supabase
                            .from("ride_waypoints")
                            .insert(batch)
                            .execute()
                        await send(.waypointsSaved(batch.count))
                    } catch {
                        await send(.waypointSaveFailed(error.localizedDescription))
                    }
                }

            case let .waypointsSaved(count):
                state.isSaving = false
                state.totalWaypointsSaved += count
                return .none

            case let .waypointSaveFailed(error):
                state.isSaving = false
                state.saveError = error
                return .none

            // MARK: Pause
            case .pauseRideTapped:
                guard state.phase == .recording else { return .none }
                state.phase = .paused
                state.pausedAt = date.now
                locationService.stopUpdating()
                return .concatenate(
                    .cancel(id: CancelID.timer),
                    .cancel(id: CancelID.locationStream),
                    // Flush remaining waypoints
                    state.pendingWaypoints.isEmpty ? .none : .send(.flushWaypoints)
                )

            // MARK: Resume
            case .resumeRideTapped:
                guard state.phase == .paused else { return .none }
                state.phase = .recording
                if let pausedAt = state.pausedAt {
                    state.totalPausedSeconds += Int(date.now.timeIntervalSince(pausedAt))
                }
                state.pausedAt = nil
                return .merge(
                    .run { send in
                        for await _ in clock.timer(interval: .seconds(1)) {
                            await send(.tick)
                        }
                    }
                    .cancellable(id: CancelID.timer, cancelInFlight: true),
                    .run { send in
                        let stream = locationService.startUpdating()
                        for await location in stream {
                            let point = CoordinatePoint(
                                latitude: location.coordinate.latitude,
                                longitude: location.coordinate.longitude,
                                altitude: location.altitude,
                                speed: location.speed,
                                heading: location.course,
                                timestamp: location.timestamp
                            )
                            await send(.locationUpdated(point))
                        }
                    }
                    .cancellable(id: CancelID.locationStream, cancelInFlight: true)
                )

            // MARK: Stop
            case .stopRideTapped:
                // View handles confirmation dialog
                return .none

            case .confirmStop:
                state.phase = .finished
                locationService.stopUpdating()
                let rideId = state.rideId
                let stats = RideStats(
                    distanceMiles: state.distanceMiles,
                    maxSpeedMPH: state.maxSpeedMPH,
                    durationSeconds: state.elapsedSeconds
                )
                let remainingWaypoints = state.pendingWaypoints
                state.pendingWaypoints = []

                return .concatenate(
                    .cancel(id: CancelID.timer),
                    .cancel(id: CancelID.locationStream),
                    // Flush remaining waypoints then end ride
                    .run { send in
                        if let rideId = rideId {
                            // Flush leftover waypoints
                            if !remainingWaypoints.isEmpty {
                                try? await supabase
                                    .from("ride_waypoints")
                                    .insert(remainingWaypoints)
                                    .execute()
                                await send(.waypointsSaved(remainingWaypoints.count))
                            }
                            // Update ride with final stats
                            let iso = ISO8601DateFormatter()
                            struct EndPayload: Encodable {
                                let ended_at: String
                                let distance_miles: Double
                                let max_speed_mph: Double
                                let duration_seconds: Int
                            }
                            let payload = EndPayload(
                                ended_at: iso.string(from: Date()),
                                distance_miles: stats.distanceMiles,
                                max_speed_mph: stats.maxSpeedMPH,
                                duration_seconds: stats.durationSeconds
                            )
                            try? await supabase
                                .from("rides")
                                .update(payload)
                                .eq("id", value: rideId.uuidString)
                                .execute()
                        }
                        await send(.rideEnded)
                    }
                )

            case .cancelStop:
                return .none

            case .rideEnded:
                return .none

            case let .rideEndFailed(error):
                state.saveError = error
                return .none

            // MARK: Dismiss finished screen → reset to idle
            case .rideFinishedDismissed:
                state = State()
                return .none
            }
        }
    }
}
