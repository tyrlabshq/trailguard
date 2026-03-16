// SOSReducer.swift
// TrailGuard — Features/SOS
//
// TCA reducer for manual SOS flow.
// Manages hold-to-confirm UX, SOS active screen, and cancellation.

import ComposableArchitecture
import CoreLocation
import Foundation

@Reducer
struct SOSReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var phase: Phase = .idle
        var holdProgress: Double = 0.0
        var elapsedSecondsSinceSOSSent: Int = 0
        var lastKnownLat: Double?
        var lastKnownLng: Double?
        var startedAt: Date?
        var sosEventId: UUID?
        var showCancelConfirm: Bool = false
        var dispatchError: String?
        var contactsNotified: Bool = false

        enum Phase: Equatable {
            case idle
            case confirmationVisible
            case holding
            case sosSent
            case cancelled
        }

        var isOverlayVisible: Bool {
            switch phase {
            case .confirmationVisible, .holding, .sosSent:
                return true
            case .idle, .cancelled:
                return false
            }
        }

        var elapsedFormatted: String {
            let m = elapsedSecondsSinceSOSSent / 60
            let s = elapsedSecondsSinceSOSSent % 60
            return String(format: "%02d:%02d", m, s)
        }

        var coordinateString: String? {
            guard let lat = lastKnownLat, let lng = lastKnownLng else { return nil }
            return String(format: "%.6f, %.6f", lat, lng)
        }
    }

    // MARK: - Action

    enum Action {
        // Button interactions
        case sosButtonTapped
        case holdBegan
        case holdProgress(Double)
        case holdCompleted
        case holdCancelled
        case cancelButtonTapped

        // SOS active
        case sosTimerTick
        case locationUpdated(lat: Double, lng: Double)

        // Cancel SOS (2-step confirm)
        case cancelSOSStep1Tapped
        case cancelSOSConfirmed
        case cancelSOSAborted

        // Dispatch results
        case sosDispatched(id: UUID)
        case sosDispatchFailed(String)
        case contactsNotifiedResult(Bool)

        // Triggered externally (crash detection / DMS)
        case triggerFromExternal
    }

    // MARK: - Cancel IDs

    private enum CancelID {
        case holdTimer
        case elapsedTimer
        case locationStream
    }

    // MARK: - Dependencies

    @Dependency(\.continuousClock) var clock
    @Dependency(\.supabase) var supabase
    @Dependency(\.locationService) var locationService
    @Dependency(\.uuid) var uuid
    @Dependency(\.date) var date

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            // MARK: - Show Confirmation Overlay
            case .sosButtonTapped:
                state.phase = .confirmationVisible
                state.holdProgress = 0.0
                state.dispatchError = nil
                return fetchCurrentLocation()

            // MARK: - Hold Began — start 3s progress timer
            case .holdBegan:
                state.phase = .holding
                state.holdProgress = 0.0
                let startTime = date.now
                return .run { send in
                    for await _ in clock.timer(interval: .milliseconds(33)) {
                        let elapsed = Date().timeIntervalSince(startTime)
                        let progress = min(elapsed / 3.0, 1.0)
                        await send(.holdProgress(progress))
                        if progress >= 1.0 {
                            await send(.holdCompleted)
                            return
                        }
                    }
                }
                .cancellable(id: CancelID.holdTimer, cancelInFlight: true)

            case let .holdProgress(progress):
                state.holdProgress = progress
                return .none

            // MARK: - Hold Completed — fire SOS
            case .holdCompleted:
                state.holdProgress = 1.0
                state.phase = .sosSent
                state.startedAt = date.now
                state.elapsedSecondsSinceSOSSent = 0
                state.contactsNotified = false

                let lat = state.lastKnownLat
                let lng = state.lastKnownLng
                let startedAt = state.startedAt!
                let eventId = uuid()

                return .merge(
                    .cancel(id: CancelID.holdTimer),
                    // Insert SOS event into Supabase
                    .run { send in
                        do {
                            let session = try await supabase.auth.session
                            let riderId = session.user.id.uuidString
                            let iso = ISO8601DateFormatter()

                            try await supabase
                                .from("sos_events")
                                .insert([
                                    "id": eventId.uuidString,
                                    "rider_id": riderId,
                                    "latitude": lat.map { String($0) } ?? "0",
                                    "longitude": lng.map { String($0) } ?? "0",
                                    "status": "active",
                                    "started_at": iso.string(from: startedAt),
                                ])
                                .execute()

                            await send(.sosDispatched(id: eventId))
                        } catch {
                            await send(.sosDispatchFailed(error.localizedDescription))
                        }
                    },
                    // Start elapsed timer
                    .run { send in
                        for await _ in clock.timer(interval: .seconds(1)) {
                            await send(.sosTimerTick)
                        }
                    }
                    .cancellable(id: CancelID.elapsedTimer, cancelInFlight: true),
                    // Start location stream
                    .run { send in
                        let stream = locationService.startUpdating()
                        for await location in stream {
                            await send(.locationUpdated(
                                lat: location.coordinate.latitude,
                                lng: location.coordinate.longitude
                            ))
                        }
                    }
                    .cancellable(id: CancelID.locationStream, cancelInFlight: true)
                )

            case .holdCancelled:
                state.phase = .confirmationVisible
                state.holdProgress = 0.0
                return .cancel(id: CancelID.holdTimer)

            case .cancelButtonTapped:
                state.phase = .idle
                state.holdProgress = 0.0
                return .cancel(id: CancelID.holdTimer)

            // MARK: - SOS Active
            case .sosTimerTick:
                state.elapsedSecondsSinceSOSSent += 1
                return .none

            case let .locationUpdated(lat, lng):
                state.lastKnownLat = lat
                state.lastKnownLng = lng
                return .none

            // MARK: - Cancel SOS (2-step)
            case .cancelSOSStep1Tapped:
                state.showCancelConfirm = true
                return .none

            case .cancelSOSConfirmed:
                state.showCancelConfirm = false
                state.phase = .cancelled
                let eventId = state.sosEventId

                return .merge(
                    .cancel(id: CancelID.elapsedTimer),
                    .cancel(id: CancelID.locationStream),
                    .run { _ in
                        guard let eventId else { return }
                        let iso = ISO8601DateFormatter()
                        try? await supabase
                            .from("sos_events")
                            .update([
                                "status": "cancelled",
                                "cancelled_at": iso.string(from: Date()),
                            ])
                            .eq("id", value: eventId.uuidString)
                            .execute()
                    }
                )

            case .cancelSOSAborted:
                state.showCancelConfirm = false
                return .none

            // MARK: - Dispatch Results
            case let .sosDispatched(id):
                state.sosEventId = id
                state.dispatchError = nil
                // Notify emergency contacts via Edge Function
                let lat = state.lastKnownLat ?? 0
                let lng = state.lastKnownLng ?? 0
                return .run { send in
                    do {
                        let payload = SOSNotifyPayload(
                            alert_id: id.uuidString,
                            lat: lat,
                            lng: lng
                        )
                        try await supabase.functions.invoke(
                            "notify-sos-contacts",
                            options: .init(body: payload)
                        )
                        await send(.contactsNotifiedResult(true))
                    } catch {
                        await send(.contactsNotifiedResult(false))
                    }
                }

            case let .sosDispatchFailed(error):
                state.dispatchError = error
                return .none

            case let .contactsNotifiedResult(success):
                state.contactsNotified = success
                if let eventId = state.sosEventId, success {
                    return .run { _ in
                        try? await supabase
                            .from("sos_events")
                            .update(["contacts_notified": "true"])
                            .eq("id", value: eventId.uuidString)
                            .execute()
                    }
                }
                return .none

            // MARK: - External Trigger (crash / DMS)
            case .triggerFromExternal:
                state.phase = .sosSent
                state.holdProgress = 1.0
                state.startedAt = date.now
                state.elapsedSecondsSinceSOSSent = 0
                state.contactsNotified = false

                let lat = state.lastKnownLat
                let lng = state.lastKnownLng
                let startedAt = state.startedAt!
                let eventId = uuid()

                return .merge(
                    .run { send in
                        do {
                            let session = try await supabase.auth.session
                            let riderId = session.user.id.uuidString
                            let iso = ISO8601DateFormatter()

                            try await supabase
                                .from("sos_events")
                                .insert([
                                    "id": eventId.uuidString,
                                    "rider_id": riderId,
                                    "latitude": lat.map { String($0) } ?? "0",
                                    "longitude": lng.map { String($0) } ?? "0",
                                    "status": "active",
                                    "started_at": iso.string(from: startedAt),
                                ])
                                .execute()

                            await send(.sosDispatched(id: eventId))
                        } catch {
                            await send(.sosDispatchFailed(error.localizedDescription))
                        }
                    },
                    .run { send in
                        for await _ in clock.timer(interval: .seconds(1)) {
                            await send(.sosTimerTick)
                        }
                    }
                    .cancellable(id: CancelID.elapsedTimer, cancelInFlight: true),
                    fetchCurrentLocation()
                )
            }
        }
    }

    // MARK: - Codable Payloads

    private struct SOSNotifyPayload: Encodable {
        let alert_id: String
        let lat: Double
        let lng: Double
    }

    // MARK: - Helpers

    private func fetchCurrentLocation() -> Effect<Action> {
        .run { send in
            do {
                let location = try await locationService.currentLocation()
                await send(.locationUpdated(
                    lat: location.coordinate.latitude,
                    lng: location.coordinate.longitude
                ))
            } catch {
                // Location unavailable — SOS still works without coords
            }
        }
    }
}
