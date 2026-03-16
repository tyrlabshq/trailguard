// SOSReducer.swift
// TrailGuard — Features/SOS
//
// TCA reducer for manual SOS flow.
// Manages hold-to-confirm UX, SOS active screen, and cancellation.

import ComposableArchitecture
import Foundation

@Reducer
struct SOSReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var phase: Phase = .idle
        var elapsedSecondsSinceSOSSent: Int = 0
        var lastKnownLat: Double?
        var lastKnownLng: Double?

        // Hold-to-confirm progress (0.0 - 1.0 over 3 seconds)
        var holdProgress: Double = 0.0

        enum Phase: Equatable {
            case idle
            case confirmationVisible  // Overlay shown, waiting for hold
            case holding              // User holding SOS button
            case sosSent              // Active SOS screen
            case cancelled            // User cancelled, back to idle
        }
    }

    // MARK: - Action

    enum Action {
        // Button interactions
        case sosButtonTapped       // Red FAB tapped — show overlay
        case holdBegan             // User started holding SEND SOS
        case holdProgress(Double) // Progress update from timer
        case holdCompleted         // 3s hold completed → fire SOS
        case holdCancelled         // User released before 3s
        case cancelButtonTapped    // Cancel overlay

        // SOS active
        case sosTimerTick
        case locationUpdated(lat: Double, lng: Double)

        // Cancel SOS (requires 2-step confirm)
        case cancelSOSStep1Tapped
        case cancelSOSConfirmed
        case cancelSOSAborted

        // Dispatch result
        case sosDispatched         // Alert record created
        case sosDispatchFailed(String)
    }

    // MARK: - Dependencies
    // TODO: @Dependency(\.continuousClock) var clock
    // TODO: @Dependency(\.supabaseClient) var supabaseClient
    // TODO: @Dependency(\.notificationService) var notificationService
    // TODO: @Dependency(\.locationService) var locationService

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .sosButtonTapped:
                state.phase = .confirmationVisible
                state.holdProgress = 0.0
                return .none

            case .holdBegan:
                state.phase = .holding
                // TODO: Start hold-progress timer (3s, tick ~30fps)
                return .none

            case let .holdProgress(progress):
                state.holdProgress = progress
                return .none

            case .holdCompleted:
                state.holdProgress = 1.0
                return .send(.sosDispatched)

            case .holdCancelled:
                state.phase = .confirmationVisible
                state.holdProgress = 0.0
                return .none

            case .cancelButtonTapped:
                state.phase = .idle
                state.holdProgress = 0.0
                return .none

            case .sosTimerTick:
                state.elapsedSecondsSinceSOSSent += 1
                return .none

            case let .locationUpdated(lat, lng):
                state.lastKnownLat = lat
                state.lastKnownLng = lng
                return .none

            case .cancelSOSStep1Tapped:
                // TODO: Show "Are you sure?" confirmation
                return .none

            case .cancelSOSConfirmed:
                // TODO: Log cancellation timestamp
                state.phase = .cancelled
                return .none

            case .cancelSOSAborted:
                // Stay on SOS active screen
                return .none

            case .sosDispatched:
                state.phase = .sosSent
                state.elapsedSecondsSinceSOSSent = 0
                // TODO: supabaseClient.createAlert(type: .sos, lat: state.lastKnownLat, lng: state.lastKnownLng)
                // TODO: notificationService.pushToEmergencyContacts()
                // TODO: Start elapsed timer
                return .none

            case let .sosDispatchFailed(error):
                // TODO: Retry once, then surface error
                _ = error
                return .none
            }
        }
    }
}
