// DeadManSwitchReducer.swift
// TrailGuard — Features/DeadManSwitch
//
// TCA reducer for the Dead Man's Switch feature.
// Manages configurable check-in timer, snooze logic, and SOS escalation.
// Must survive app backgrounding via BGTaskScheduler + APNs critical alerts.

import ComposableArchitecture
import Foundation

@Reducer
struct DeadManSwitchReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var isEnabled: Bool = false
        var intervalMinutes: Int = 30   // configurable: 15, 30, 60, 120, custom
        var phase: Phase = .idle
        var snoozeCount: Int = 0        // max 3 snoozes per ride
        var nextDueAt: Date?

        enum Phase: Equatable {
            case idle
            case active                  // Timer running
            case warningSent             // T-5 min notification sent
            case graceCountdown(Int)    // Final 5-min grace period
            case sosFired
        }

        var canSnooze: Bool { snoozeCount < 3 }
    }

    // MARK: - Action

    enum Action {
        case configure(intervalMinutes: Int)
        case enable
        case disable

        // Timer flow
        case timerStarted
        case warningFired          // T-5 min notification
        case checkInTapped         // User checked in — reset timer
        case graceCountdownTick
        case graceExpired

        // Snooze
        case snoozeTapped          // +10 min extension

        // Escalation
        case fireSOS
        case sosDispatched

        // BGTask integration
        case backgroundTaskScheduled
        case backgroundTaskExecuted
    }

    // MARK: - Dependencies
    // TODO: @Dependency(\.continuousClock) var clock
    // TODO: @Dependency(\.notificationService) var notificationService
    // TODO: @Dependency(\.supabaseClient) var supabaseClient

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case let .configure(intervalMinutes):
                state.intervalMinutes = intervalMinutes
                return .none

            case .enable:
                state.isEnabled = true
                state.snoozeCount = 0
                return .send(.timerStarted)

            case .disable:
                state.isEnabled = false
                state.phase = .idle
                state.nextDueAt = nil
                // TODO: Cancel any scheduled BGTasks
                return .none

            case .timerStarted:
                state.phase = .active
                state.nextDueAt = Date().addingTimeInterval(Double(state.intervalMinutes) * 60)
                // TODO: Schedule BGTask for nextDueAt - 5 min (warning)
                // TODO: Schedule BGTask for nextDueAt (expiry)
                return .none

            case .warningFired:
                state.phase = .warningSent
                // TODO: Send APNs critical alert: "Check in — DMS expires in 5 min"
                return .none

            case .checkInTapped:
                state.snoozeCount = 0
                return .send(.timerStarted)

            case .snoozeTapped:
                guard state.canSnooze else { return .none }
                state.snoozeCount += 1
                state.nextDueAt = Date().addingTimeInterval(10 * 60)
                state.phase = .active
                // TODO: Reschedule BGTasks for new nextDueAt
                return .none

            case .graceCountdownTick:
                // TODO: Decrement grace countdown
                return .none

            case .graceExpired:
                return .send(.fireSOS)

            case .fireSOS:
                state.phase = .sosFired
                // TODO: supabaseClient.createAlert(type: .dmsExpired)
                return .none

            case .sosDispatched:
                return .none

            case .backgroundTaskScheduled, .backgroundTaskExecuted:
                // TODO: Handle BGTask lifecycle
                return .none
            }
        }
    }
}
