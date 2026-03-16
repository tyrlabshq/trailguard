// CrashDetectionReducer.swift
// TrailGuard — Features/CrashDetection
//
// TCA reducer for crash detection feature.
// Manages impact threshold evaluation, alert countdown, and SOS escalation.
//
// Flow: monitoring → impactDetected → countingDown → (dismissed | sosFired)
// Activity-gated: only active when ride is .recording

import ComposableArchitecture
import CoreMotion
import Foundation

@Reducer
struct CrashDetectionReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var isActive: Bool = false
        var phase: Phase = .idle
        var countdownRemaining: Int = 60
        var impactMagnitude: Double = 0
        var sensitivity: Sensitivity = .medium
        var falsePositiveCount: Int = 0

        enum Phase: Equatable {
            case idle               // Not monitoring (ride not active)
            case monitoring         // Actively watching for impact
            case impactDetected     // High-G event confirmed, showing alert
            case countingDown       // 60s countdown to auto-SOS
            case dismissed          // User tapped "I'm OK"
            case sosFired           // SOS dispatched
        }

        enum Sensitivity: String, Equatable, CaseIterable {
            case low    = "low"    // 6G threshold
            case medium = "medium" // 4G threshold (default)
            case high   = "high"   // 2.5G threshold

            var gForceThreshold: Double {
                switch self {
                case .low:    return 6.0
                case .medium: return 4.0
                case .high:   return 2.5
                }
            }
        }

        var isAlertVisible: Bool {
            switch phase {
            case .impactDetected, .countingDown, .sosFired:
                return true
            default:
                return false
            }
        }
    }

    // MARK: - Action

    enum Action {
        // Lifecycle (called by RideRecordingReducer)
        case activate
        case deactivate

        // Sensor events
        case impactDetected(magnitude: Double)

        // User responses
        case userConfirmedOK       // "I'm OK" tapped
        case userCancelledSOS      // Cancel tapped during countdown

        // Internal timer
        case countdownTick
        case countdownExpired

        // SOS escalation
        case dispatchSOS
        case sosConfirmed
        case sosFailed(String)

        // Speed updates (forwarded from ride recording for velocity-drop check)
        case speedUpdated(metersPerSecond: Double)

        // Sensitivity
        case sensitivityChanged(State.Sensitivity)

        // Critical alert notification
        case criticalAlertFired
    }

    // MARK: - Dependencies

    @Dependency(\.motionService) var motionService
    @Dependency(\.continuousClock) var clock

    // MARK: - Cancel IDs

    private enum CancelID {
        case motionStream
        case countdown
    }

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            // MARK: Activate (ride started recording)
            case .activate:
                state.isActive = true
                state.phase = .monitoring
                state.countdownRemaining = 60
                state.impactMagnitude = 0
                let threshold = state.sensitivity.gForceThreshold
                return .run { send in
                    let stream = motionService.startCrashDetection(threshold)
                    for await magnitude in stream {
                        await send(.impactDetected(magnitude: magnitude))
                    }
                }
                .cancellable(id: CancelID.motionStream, cancelInFlight: true)

            // MARK: Deactivate (ride stopped/paused)
            case .deactivate:
                state.isActive = false
                state.phase = .idle
                motionService.stopCrashDetection()
                return .merge(
                    .cancel(id: CancelID.motionStream),
                    .cancel(id: CancelID.countdown)
                )

            // MARK: Impact Detected
            case let .impactDetected(magnitude):
                guard state.isActive, state.phase == .monitoring else { return .none }
                state.phase = .impactDetected
                state.impactMagnitude = magnitude
                state.countdownRemaining = 60

                // Immediately transition to countdown
                state.phase = .countingDown
                return .run { send in
                    // Fire critical alert notification
                    await send(.criticalAlertFired)
                    // Start 60-second countdown
                    for await _ in clock.timer(interval: .seconds(1)) {
                        await send(.countdownTick)
                    }
                }
                .cancellable(id: CancelID.countdown, cancelInFlight: true)

            // MARK: Countdown Tick
            case .countdownTick:
                guard state.phase == .countingDown else { return .none }
                state.countdownRemaining -= 1

                if state.countdownRemaining <= 0 {
                    return .concatenate(
                        .cancel(id: CancelID.countdown),
                        .send(.countdownExpired)
                    )
                }
                return .none

            case .countdownExpired:
                return .send(.dispatchSOS)

            // MARK: User Confirmed OK
            case .userConfirmedOK:
                state.phase = .dismissed
                state.falsePositiveCount += 1
                return .merge(
                    .cancel(id: CancelID.countdown),
                    // Return to monitoring after brief dismiss
                    .run { send in
                        try await clock.sleep(for: .seconds(1))
                        // Re-enter monitoring state
                        await send(.activate)
                    }
                )

            case .userCancelledSOS:
                state.phase = .dismissed
                return .merge(
                    .cancel(id: CancelID.countdown),
                    .run { send in
                        try await clock.sleep(for: .seconds(1))
                        await send(.activate)
                    }
                )

            // MARK: Dispatch SOS
            case .dispatchSOS:
                state.phase = .sosFired
                motionService.stopCrashDetection()
                return .cancel(id: CancelID.motionStream)

            case .sosConfirmed:
                return .none

            case .sosFailed:
                return .none

            // MARK: Speed Updates (forwarded to motion service for velocity-drop check)
            case let .speedUpdated(metersPerSecond):
                motionService.setCurrentSpeed(metersPerSecond)
                return .none

            // MARK: Sensitivity
            case let .sensitivityChanged(newSensitivity):
                state.sensitivity = newSensitivity
                // If currently monitoring, restart with new threshold
                guard state.isActive, state.phase == .monitoring else { return .none }
                motionService.stopCrashDetection()
                let threshold = newSensitivity.gForceThreshold
                return .run { send in
                    let stream = motionService.startCrashDetection(threshold)
                    for await magnitude in stream {
                        await send(.impactDetected(magnitude: magnitude))
                    }
                }
                .cancellable(id: CancelID.motionStream, cancelInFlight: true)

            case .criticalAlertFired:
                return .none
            }
        }
    }
}
