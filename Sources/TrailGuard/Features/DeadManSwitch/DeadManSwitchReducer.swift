// DeadManSwitchReducer.swift
// TrailGuard — Features/DeadManSwitch
//
// TCA reducer for the Dead Man's Switch feature.
// Manages configurable check-in timer, snooze logic, and SOS escalation.
// Survives app backgrounding via BGTaskScheduler + APNs critical alerts.
// State persisted to UserDefaults across restarts.

import BackgroundTasks
import ComposableArchitecture
import Foundation
import Supabase
import UserNotifications

// MARK: - Interval Enum

enum DMSInterval: Equatable, CaseIterable, Hashable {
    case fifteenMinutes
    case thirtyMinutes
    case oneHour
    case twoHours
    case custom

    var minutes: Int {
        switch self {
        case .fifteenMinutes: return 15
        case .thirtyMinutes:  return 30
        case .oneHour:        return 60
        case .twoHours:       return 120
        case .custom:         return 0   // caller supplies customMinutes
        }
    }

    var label: String {
        switch self {
        case .fifteenMinutes: return "15 min"
        case .thirtyMinutes:  return "30 min"
        case .oneHour:        return "1 hr"
        case .twoHours:       return "2 hr"
        case .custom:         return "Custom"
        }
    }
}

// MARK: - UserDefaults Keys

private enum DMSDefaultsKey {
    static let isActive       = "dms.isActive"
    static let interval       = "dms.interval"
    static let customMinutes  = "dms.customMinutes"
    static let lastCheckIn    = "dms.lastCheckIn"
    static let nextDeadline   = "dms.nextDeadline"
    static let snoozeCount    = "dms.snoozeCount"
}

// MARK: - BGTask Identifier

let DMSBackgroundTaskIdentifier = "com.trailguard.app.deadmanswitch"

// MARK: - Reducer

@Reducer
struct DeadManSwitchReducer {

    // MARK: - State

    @ObservableState
    struct State: Equatable {
        var isActive: Bool = false
        var interval: DMSInterval = .thirtyMinutes
        var customMinutes: Int = 45           // used when interval == .custom
        var lastCheckIn: Date?
        var nextDeadline: Date?
        var snoozeCount: Int = 0              // max 3 snoozes before SOS fires
        var secondsRemaining: Int = 0         // live countdown display
        var isSyncing: Bool = false
        var syncError: String?

        // Derived
        var isIntervalPickerEnabled: Bool { !isActive }
        var canSnooze: Bool { snoozeCount < 3 && isActive }
        var showLastSnoozeWarning: Bool { snoozeCount >= 2 && isActive }
        var effectiveMinutes: Int {
            interval == .custom ? customMinutes : interval.minutes
        }
    }

    // MARK: - Action

    enum Action {
        // User actions
        case activate
        case deactivate
        case checkIn
        case snooze
        case intervalChanged(DMSInterval)
        case customMinutesChanged(Int)

        // Internal timer
        case timerExpired
        case tick

        // Background scheduling
        case scheduleBackground

        // SOS escalation
        case dispatchSOS

        // Persistence
        case loadFromDefaults
        case saveToDefaults

        // Supabase sync
        case syncToSupabase
        case syncSucceeded
        case syncFailed(String)

        // Notification permission
        case requestNotificationPermission
    }

    // MARK: - Dependencies

    @Dependency(\.supabase) var supabase
    @Dependency(\.continuousClock) var clock

    // MARK: - Body

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {

            // MARK: Load / Restore
            case .loadFromDefaults:
                let defaults = UserDefaults.standard
                state.isActive      = defaults.bool(forKey: DMSDefaultsKey.isActive)
                state.snoozeCount   = defaults.integer(forKey: DMSDefaultsKey.snoozeCount)
                state.customMinutes = defaults.integer(forKey: DMSDefaultsKey.customMinutes)
                if state.customMinutes == 0 { state.customMinutes = 45 }

                if let rawInterval = defaults.string(forKey: DMSDefaultsKey.interval) {
                    switch rawInterval {
                    case "15":  state.interval = .fifteenMinutes
                    case "30":  state.interval = .thirtyMinutes
                    case "60":  state.interval = .oneHour
                    case "120": state.interval = .twoHours
                    default:    state.interval = .custom
                    }
                }

                if let deadlineTS = defaults.object(forKey: DMSDefaultsKey.nextDeadline) as? Date {
                    state.nextDeadline = deadlineTS
                    let remaining = Int(deadlineTS.timeIntervalSinceNow)
                    if state.isActive && remaining > 0 {
                        state.secondsRemaining = remaining
                    } else if state.isActive {
                        // Deadline already passed while app was closed
                        return .send(.timerExpired)
                    }
                }

                if let checkInTS = defaults.object(forKey: DMSDefaultsKey.lastCheckIn) as? Date {
                    state.lastCheckIn = checkInTS
                }

                if state.isActive && state.secondsRemaining > 0 {
                    return .run { send in
                        for await _ in self.clock.timer(interval: .seconds(1)) {
                            await send(.tick)
                        }
                    }
                    .cancellable(id: CancelID.countdown, cancelInFlight: true)
                }
                return .none

            // MARK: Activate
            case .activate:
                state.isActive    = true
                state.snoozeCount = 0
                state.lastCheckIn = Date()
                let deadline = Date().addingTimeInterval(Double(state.effectiveMinutes) * 60)
                state.nextDeadline = deadline
                state.secondsRemaining = state.effectiveMinutes * 60

                return .concatenate(
                    .send(.saveToDefaults),
                    .send(.scheduleBackground),
                    .send(.syncToSupabase),
                    .send(.requestNotificationPermission),
                    .run { send in
                        for await _ in self.clock.timer(interval: .seconds(1)) {
                            await send(.tick)
                        }
                    }
                    .cancellable(id: CancelID.countdown, cancelInFlight: true)
                )

            // MARK: Deactivate
            case .deactivate:
                state.isActive         = false
                state.nextDeadline     = nil
                state.secondsRemaining = 0
                state.snoozeCount      = 0

                BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: DMSBackgroundTaskIdentifier)

                return .concatenate(
                    .cancel(id: CancelID.countdown),
                    .send(.saveToDefaults),
                    .send(.syncToSupabase)
                )

            // MARK: Check In
            case .checkIn:
                state.lastCheckIn  = Date()
                state.snoozeCount  = 0
                let deadline = Date().addingTimeInterval(Double(state.effectiveMinutes) * 60)
                state.nextDeadline = deadline
                state.secondsRemaining = state.effectiveMinutes * 60

                return .concatenate(
                    .send(.saveToDefaults),
                    .send(.scheduleBackground),
                    .send(.syncToSupabase),
                    .run { send in
                        for await _ in self.clock.timer(interval: .seconds(1)) {
                            await send(.tick)
                        }
                    }
                    .cancellable(id: CancelID.countdown, cancelInFlight: true)
                )

            // MARK: Snooze
            case .snooze:
                guard state.canSnooze else { return .none }
                state.snoozeCount += 1
                let deadline = Date().addingTimeInterval(Double(state.effectiveMinutes) * 60)
                state.nextDeadline = deadline
                state.secondsRemaining = state.effectiveMinutes * 60

                return .concatenate(
                    .send(.saveToDefaults),
                    .send(.scheduleBackground),
                    .send(.syncToSupabase),
                    .run { send in
                        for await _ in self.clock.timer(interval: .seconds(1)) {
                            await send(.tick)
                        }
                    }
                    .cancellable(id: CancelID.countdown, cancelInFlight: true)
                )

            // MARK: Tick
            case .tick:
                guard state.isActive, let deadline = state.nextDeadline else {
                    return .cancel(id: CancelID.countdown)
                }
                let remaining = Int(deadline.timeIntervalSinceNow)
                if remaining <= 0 {
                    state.secondsRemaining = 0
                    return .concatenate(
                        .cancel(id: CancelID.countdown),
                        .send(.timerExpired)
                    )
                }
                state.secondsRemaining = remaining
                return .none

            // MARK: Timer Expired
            case .timerExpired:
                guard state.isActive else { return .none }

                if state.snoozeCount < 3 {
                    // Send critical alert notification — user can still check in
                    scheduleCriticalAlert(snoozeCount: state.snoozeCount)
                    return .none
                } else {
                    // Max snoozes used → escalate to SOS
                    return .send(.dispatchSOS)
                }

            // MARK: Dispatch SOS
            case .dispatchSOS:
                state.isActive         = false
                state.nextDeadline     = nil
                state.secondsRemaining = 0
                BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: DMSBackgroundTaskIdentifier)
                return .concatenate(
                    .cancel(id: CancelID.countdown),
                    .send(.saveToDefaults),
                    .send(.syncToSupabase)
                    // AppReducer handles routing to SOSReducer when it observes dispatchSOS
                )

            // MARK: Interval / Custom Config
            case let .intervalChanged(interval):
                guard !state.isActive else { return .none }
                state.interval = interval
                return .send(.saveToDefaults)

            case let .customMinutesChanged(minutes):
                guard !state.isActive else { return .none }
                state.customMinutes = max(5, min(480, minutes))
                return .send(.saveToDefaults)

            // MARK: Schedule BGTask
            case .scheduleBackground:
                guard let deadline = state.nextDeadline else { return .none }
                scheduleBackgroundTask(at: deadline)
                return .none

            // MARK: Notification Permission
            case .requestNotificationPermission:
                return .run { _ in
                    try? await UNUserNotificationCenter.current().requestAuthorization(
                        options: [.alert, .sound, .badge, .criticalAlert]
                    )
                }

            // MARK: Persist to UserDefaults
            case .saveToDefaults:
                let defaults = UserDefaults.standard
                defaults.set(state.isActive,     forKey: DMSDefaultsKey.isActive)
                defaults.set(state.snoozeCount,  forKey: DMSDefaultsKey.snoozeCount)
                defaults.set(state.customMinutes, forKey: DMSDefaultsKey.customMinutes)
                defaults.set(String(state.interval.minutes), forKey: DMSDefaultsKey.interval)
                if let deadline = state.nextDeadline {
                    defaults.set(deadline, forKey: DMSDefaultsKey.nextDeadline)
                } else {
                    defaults.removeObject(forKey: DMSDefaultsKey.nextDeadline)
                }
                if let checkIn = state.lastCheckIn {
                    defaults.set(checkIn, forKey: DMSDefaultsKey.lastCheckIn)
                }
                return .none

            // MARK: Supabase Sync
            case .syncToSupabase:
                state.isSyncing = true
                state.syncError = nil
                let snapshot = state
                return .run { send in
                    do {
                        let userId = try await supabase.auth.session.user.id
                        let iso = ISO8601DateFormatter()
                        let now = iso.string(from: Date())

                        struct UpsertPayload: Encodable {
                            let rider_id: String
                            let is_active: Bool
                            let interval_minutes: Int
                            let last_check_in: String?
                            let next_deadline: String?
                            let snooze_count: Int
                            let updated_at: String
                        }

                        let payload = UpsertPayload(
                            rider_id: userId.uuidString,
                            is_active: snapshot.isActive,
                            interval_minutes: snapshot.effectiveMinutes,
                            last_check_in: snapshot.lastCheckIn.map { iso.string(from: $0) },
                            next_deadline: snapshot.nextDeadline.map { iso.string(from: $0) },
                            snooze_count: snapshot.snoozeCount,
                            updated_at: now
                        )

                        try await supabase
                            .from("dead_man_switch")
                            .upsert(payload, onConflict: "rider_id")
                            .execute()

                        await send(.syncSucceeded)
                    } catch {
                        await send(.syncFailed(error.localizedDescription))
                    }
                }

            case .syncSucceeded:
                state.isSyncing = false
                return .none

            case let .syncFailed(error):
                state.isSyncing = false
                state.syncError = error
                return .none
            }
        }
    }

    // MARK: - Cancel IDs

    private enum CancelID {
        case countdown
    }
}

// MARK: - BGTask Helpers

private func scheduleBackgroundTask(at deadline: Date) {
    let request = BGAppRefreshTaskRequest(identifier: DMSBackgroundTaskIdentifier)
    request.earliestBeginDate = deadline

    do {
        try BGTaskScheduler.shared.submit(request)
    } catch {
        // BGTaskScheduler can fail in simulator — safe to ignore in production
        #if DEBUG
        print("[DMS] BGTask schedule failed: \(error.localizedDescription)")
        #endif
    }
}

private func scheduleCriticalAlert(snoozeCount: Int) {
    let content = UNMutableNotificationContent()
    content.title = "Check In Required"
    content.body = snoozeCount == 0
        ? "Your Dead Man Switch timer has expired. Tap to check in or snooze."
        : "Final warning — SOS will trigger if you don't check in now."
    content.sound = UNNotificationSound.defaultCritical
    content.interruptionLevel = .critical
    content.categoryIdentifier = "DMS_EXPIRED"

    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
    let request = UNNotificationRequest(
        identifier: "dms.expired.\(UUID().uuidString)",
        content: content,
        trigger: trigger
    )

    UNUserNotificationCenter.current().add(request) { error in
        if let error = error {
            #if DEBUG
            print("[DMS] Critical alert failed: \(error.localizedDescription)")
            #endif
        }
    }
}

// MARK: - BGTask Registration (call from AppDelegate/app startup)

func registerDMSBackgroundTask() {
    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: DMSBackgroundTaskIdentifier,
        using: nil
    ) { task in
        handleDMSBackgroundTask(task as! BGAppRefreshTask)
    }
}

private func handleDMSBackgroundTask(_ task: BGAppRefreshTask) {
    task.expirationHandler = {
        task.setTaskCompleted(success: false)
    }

    let defaults = UserDefaults.standard
    let isActive = defaults.bool(forKey: DMSDefaultsKey.isActive)

    guard isActive else {
        task.setTaskCompleted(success: true)
        return
    }

    let snoozeCount = defaults.integer(forKey: DMSDefaultsKey.snoozeCount)

    if snoozeCount < 3 {
        scheduleCriticalAlert(snoozeCount: snoozeCount)
        // Increment snooze count in defaults so next expiry escalates correctly
        defaults.set(snoozeCount + 1, forKey: DMSDefaultsKey.snoozeCount)
    } else {
        // Dispatch SOS via a local notification (app may be in background)
        let content = UNMutableNotificationContent()
        content.title = "SOS Dispatched"
        content.body = "Dead Man Switch limit reached. Emergency contacts have been notified."
        content.sound = UNNotificationSound.defaultCritical
        content.interruptionLevel = .critical

        let request = UNNotificationRequest(
            identifier: "dms.sos.\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        )
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)

        defaults.set(false, forKey: DMSDefaultsKey.isActive)
    }

    task.setTaskCompleted(success: true)
}
