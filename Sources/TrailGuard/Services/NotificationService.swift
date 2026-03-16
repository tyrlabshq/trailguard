// NotificationService.swift
// TrailGuard — Services
//
// Handles APNs registration, local notifications, and critical alerts.
// Critical alerts (DMS escalation) require Apple entitlement.

import UserNotifications
import Foundation
import ComposableArchitecture

// MARK: - TCA Dependency Key

struct NotificationServiceClient {
    /// Request notification authorization (with critical alerts if available)
    var requestAuthorization: () async throws -> Bool
    /// Register device token with Supabase for push targeting
    var registerDeviceToken: (_ token: Data) async -> Void
    /// Schedule a local notification
    var scheduleLocal: (_ request: UNNotificationRequest) async throws -> Void
    /// Send SOS push to emergency contacts (via Supabase Edge Function)
    var dispatchSOSPush: (_ alertId: UUID, _ lat: Double, _ lng: Double) async throws -> Void
    /// Send DMS warning notification (T-5 min)
    var dispatchDMSWarning: (_ minutesRemaining: Int) async throws -> Void
}

// MARK: - Notification Identifiers

enum NotificationIdentifier {
    static let crashDetectionAlert = "com.trailguard.crash.alert"
    static let dmsWarning          = "com.trailguard.dms.warning"
    static let dmsGrace            = "com.trailguard.dms.grace"
    static let sosConfirmation     = "com.trailguard.sos.confirmation"
    static let groupAlert          = "com.trailguard.group.alert"
}

// MARK: - Live Implementation Shell

final class NotificationService: NSObject, UNUserNotificationCenterDelegate {

    static let shared = NotificationService()

    private let center = UNUserNotificationCenter.current()

    private override init() {
        super.init()
        center.delegate = self
    }

    // MARK: - Authorization

    func requestAuthorization() async throws -> Bool {
        // TODO: Request .alert, .sound, .badge, .criticalAlert
        // Note: .criticalAlert requires Apple entitlement approval
        // Apply for entitlement early — required for DMS safety guarantees
        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        let granted = try await center.requestAuthorization(options: options)
        return granted
    }

    // MARK: - Critical Alert: DMS Escalation

    func scheduleDMSWarning(minutesRemaining: Int) throws {
        let content = UNMutableNotificationContent()
        content.title = "Check-In Required"
        content.body = "Your Dead Man's Switch expires in \(minutesRemaining) minutes. Tap to check in."
        content.sound = .defaultCritical    // TODO: Requires .criticalAlert entitlement
        content.interruptionLevel = .critical

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: NotificationIdentifier.dmsWarning,
            content: content,
            trigger: trigger
        )

        // TODO: center.add(request)
    }

    // MARK: - Crash Detection Alert

    func scheduleCrashAlert() throws {
        let content = UNMutableNotificationContent()
        content.title = "Are you OK?"
        content.body = "TrailGuard detected a possible crash. Tap to confirm you're safe."
        content.sound = .defaultCritical
        content.interruptionLevel = .critical
        // TODO: Add action buttons: "I'm OK" / (no action = start countdown)

        // TODO: Schedule immediately
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // TODO: Route notification responses to appropriate reducer actions
        // "I'm OK" → CrashDetectionReducer.Action.userConfirmedOK
        // DMS check-in → DeadManSwitchReducer.Action.checkInTapped
        completionHandler()
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}
