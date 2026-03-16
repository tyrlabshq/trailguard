// CrashDetectionReducer.swift
// TrailGuard — Features/CrashDetection
//
// TCA reducer for crash detection feature.
// Manages impact threshold evaluation, alert countdown, and SOS escalation.

import ComposableArchitecture
import CoreMotion

@Reducer
struct CrashDetectionReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        // TODO: Detection active flag (only true during .riding phase)
        var isActive: Bool = false

        // TODO: Current detection phase
        var phase: Phase = .monitoring

        // TODO: Countdown seconds remaining when impact detected
        var countdownSeconds: Int = 60

        // Sensitivity setting (configurable in Safety Settings)
        var sensitivity: Sensitivity = .medium

        enum Phase: Equatable {
            case monitoring          // Actively watching for impact
            case impactDetected      // "Are you OK?" modal showing
            case countdown(Int)     // Counting down to auto-SOS
            case sosFired            // SOS has been dispatched
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
    }

    // MARK: - Action

    enum Action {
        // Lifecycle
        case startMonitoring
        case stopMonitoring

        // Sensor events
        case impactDetected(magnitude: Double)
        case velocityDropConfirmed

        // User responses
        case userConfirmedOK       // "I'm fine" tapped
        case userCancelledSOS      // Cancel tapped during countdown

        // Internal timer
        case countdownTick
        case countdownExpired

        // SOS escalation
        case fireSOS
        case sosConfirmed          // Supabase alert created
        case sosFailed(Error)      // Alert creation failed

        // False positive tracking
        case markFalsePositive
        case sensitivityAdjusted(State.Sensitivity)
    }

    // MARK: - Dependencies
    // TODO: @Dependency(\.motionService) var motionService
    // TODO: @Dependency(\.notificationService) var notificationService
    // TODO: @Dependency(\.supabaseClient) var supabaseClient
    // TODO: @Dependency(\.continuousClock) var clock

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .startMonitoring:
                // TODO: Activate CoreMotion accelerometer at 100Hz
                // TODO: Gate on CMMotionActivityManager (only run when "automotive" motion detected)
                state.isActive = true
                state.phase = .monitoring
                return .none

            case .stopMonitoring:
                state.isActive = false
                return .none

            case let .impactDetected(magnitude):
                // TODO: Validate magnitude exceeds threshold for current sensitivity
                // TODO: Require velocity drop confirmation before triggering
                guard state.isActive else { return .none }
                state.phase = .impactDetected
                // TODO: Show "Are you OK?" notification
                return .none

            case .velocityDropConfirmed:
                // TODO: Both conditions met — transition to countdown
                state.phase = .countdown(state.countdownSeconds)
                // TODO: Start 60s countdown timer
                return .none

            case .userConfirmedOK:
                // TODO: Log false positive candidate
                state.phase = .monitoring
                return .none

            case .userCancelledSOS:
                state.phase = .monitoring
                return .none

            case .countdownTick:
                // TODO: Decrement countdown, update state
                return .none

            case .countdownExpired:
                return .send(.fireSOS)

            case .fireSOS:
                state.phase = .sosFired
                // TODO: Call supabaseClient.createAlert(type: .crash)
                // TODO: Trigger NotificationService to push to emergency contacts
                return .none

            case .sosConfirmed:
                return .none

            case let .sosFailed(error):
                // TODO: Log error, retry once, then surface to user
                _ = error
                return .none

            case .markFalsePositive:
                // TODO: Track false positive count, surface sensitivity adjustment prompt after 3
                state.phase = .monitoring
                return .none

            case let .sensitivityAdjusted(newSensitivity):
                state.sensitivity = newSensitivity
                return .none
            }
        }
    }
}
