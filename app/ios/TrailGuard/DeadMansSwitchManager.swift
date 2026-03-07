//
//  DeadMansSwitchManager.swift
//  TrailGuard — TG-02
//
//  Native iOS Dead Man's Switch service.
//
//  Responsibilities:
//    • Register + schedule BGAppRefreshTask to keep the DMS timer alive in background.
//    • Use CLLocationManager significant-change updates to wake the app for GPS checks.
//    • Fire a local UNUserNotificationCenter notification when the alert is due.
//    • Trigger UIImpactFeedbackGenerator (heavy) + AudioServicesPlaySystemSound haptic.
//    • Auto-escalate (post a "no response" notification) if checkIn() is not called
//      within ESCALATION_TIMEOUT_SECONDS after the alert fires.
//    • Expose @objc public API so MeshNetworkBridge-style ObjC modules can call it.
//
//  React Native integration:
//    • DeadMansSwitchBridge.m wraps this class as an RCTEventEmitter.
//    • JS calls: start / stop / checkIn / snooze / getStatus
//    • JS receives events: onDMSAlert / onDMSEscalated / onDMSStateChange
//
//  Background execution strategy:
//    1. BGAppRefreshTask (identifier: com.trailguard.dms.check)
//       – System wakes the app every ~intervalMinutes to run the check.
//       – We schedule the NEXT task immediately inside the handler.
//    2. CLLocationManager startMonitoringSignificantLocationChanges
//       – Wakes app on significant GPS change; we reset the DMS timer on movement.
//

import Foundation
import BackgroundTasks
import CoreLocation
import UIKit
import AudioToolbox
import UserNotifications

// MARK: - Constants

private enum DMSConstants {
    static let bgTaskIdentifier       = "com.trailguard.dms.check"
    static let alertNotificationId    = "dms_alert"
    static let escalationNotificationId = "dms_escalation"

    /// Minimum displacement (metres) counted as movement.
    static let movementThresholdMeters: Double = 15.0

    /// Seconds from alert fire until auto-escalation if no checkIn().
    static let escalationTimeoutSeconds: TimeInterval = 120

    /// UserDefaults key for persisted interval.
    static let intervalDefaultsKey = "trailguard_dms_interval_minutes"

    /// Supported intervals (minutes).
    static let validIntervals: Set<Int> = [15, 30, 60]

    /// Default interval (minutes).
    static let defaultInterval: Int = 15
}

// MARK: - DeadMansSwitchManagerDelegate

@objc public protocol DeadMansSwitchManagerDelegate: AnyObject {
    /// Called when the alert fires (check-in due).
    func dmsManagerDidFireAlert(_ manager: DeadMansSwitchManager)

    /// Called when escalation auto-triggers (2 min with no checkIn).
    func dmsManagerDidEscalate(_ manager: DeadMansSwitchManager,
                                lat: Double, lng: Double, hasLocation: Bool)

    /// Called when enabled/disabled state changes.
    func dmsManager(_ manager: DeadMansSwitchManager, didChangeState info: [String: Any])
}

// MARK: - DeadMansSwitchManager

@objc public final class DeadMansSwitchManager: NSObject {

    // ── Singleton ─────────────────────────────────────────────────────────
    @objc public static let shared = DeadMansSwitchManager()

    // ── Delegate ──────────────────────────────────────────────────────────
    @objc public weak var delegate: DeadMansSwitchManagerDelegate?

    // ── State ─────────────────────────────────────────────────────────────
    @objc public private(set) var isRunning = false

    /// Interval in minutes (15 / 30 / 60). Persisted in UserDefaults.
    @objc public private(set) var intervalMinutes: Int = DMSConstants.defaultInterval

    private var lastMovedAt: Date = Date()
    private var lastLocation: CLLocation?
    private var alertFired  = false

    // ── Background task ───────────────────────────────────────────────────
    private var bgTaskRegistered = false

    // ── Timers ────────────────────────────────────────────────────────────
    /// Foreground check timer (fires every 30s when app is active).
    private var foregroundTimer: Timer?
    /// Escalation countdown timer (2 min after alert fires).
    private var escalationTimer: Timer?

    // ── Location ──────────────────────────────────────────────────────────
    private let locationManager = CLLocationManager()

    // ── Init ──────────────────────────────────────────────────────────────
    private override init() {
        super.init()
        locationManager.delegate       = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        loadPersistedInterval()
    }

    // MARK: - Public API

    /// Register background task identifier. Call from AppDelegate before app finishes launching.
    @objc public func registerBackgroundTasks() {
        guard !bgTaskRegistered else { return }
        bgTaskRegistered = true

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: DMSConstants.bgTaskIdentifier,
            using: nil
        ) { [weak self] task in
            self?.handleBackgroundTask(task as! BGAppRefreshTask)
        }
    }

    /// Start DMS monitoring with the given interval (minutes: 15, 30, or 60).
    @objc public func start(intervalMinutes minutes: Int) {
        let validMinutes = DMSConstants.validIntervals.contains(minutes) ? minutes : DMSConstants.defaultInterval
        intervalMinutes = validMinutes
        UserDefaults.standard.set(validMinutes, forKey: DMSConstants.intervalDefaultsKey)

        stop() // Clean up any prior state

        isRunning  = true
        alertFired = false
        lastMovedAt = Date()

        requestNotificationPermissions()
        startLocationMonitoring()
        startForegroundTimer()
        scheduleBGTask()

        notifyStateChange()
    }

    /// Stop DMS monitoring cleanly.
    @objc public func stop() {
        isRunning  = false
        alertFired = false

        foregroundTimer?.invalidate()
        foregroundTimer = nil

        escalationTimer?.invalidate()
        escalationTimer = nil

        stopLocationMonitoring()
        cancelScheduledNotifications()
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: DMSConstants.bgTaskIdentifier)

        notifyStateChange()
    }

    /// User confirmed they are OK. Resets the DMS timer from now.
    @objc public func checkIn() {
        guard isRunning else { return }
        lastMovedAt = Date()
        alertFired  = false

        escalationTimer?.invalidate()
        escalationTimer = nil

        cancelScheduledNotifications()
        scheduleBGTask()
        notifyStateChange()
    }

    /// Snooze the alert for `minutes` minutes.
    @objc public func snooze(minutes: Int) {
        guard isRunning else { return }
        let snoozeMs     = Double(minutes) * 60.0
        let backfillMs   = max(0, Double(intervalMinutes) * 60.0 - snoozeMs)
        lastMovedAt      = Date(timeIntervalSinceNow: -backfillMs)
        alertFired       = false

        escalationTimer?.invalidate()
        escalationTimer = nil

        cancelScheduledNotifications()
        scheduleBGTask()
        notifyStateChange()
    }

    /// Update the interval while DMS is running. Restarts the timer from now.
    @objc public func updateInterval(minutes: Int) {
        let valid = DMSConstants.validIntervals.contains(minutes) ? minutes : intervalMinutes
        intervalMinutes = valid
        UserDefaults.standard.set(valid, forKey: DMSConstants.intervalDefaultsKey)

        if isRunning {
            lastMovedAt = Date()
            alertFired  = false
            scheduleBGTask()
            notifyStateChange()
        }
    }

    /// Trigger the alert immediately (e.g. from JS crash detection).
    @objc public func triggerImmediately() {
        guard isRunning else { return }
        alertFired = false
        fireAlert()
    }

    /// Inject a GPS location from JS (called by LocationService).
    @objc public func updateLocation(lat: Double, lng: Double) {
        let incoming = CLLocation(latitude: lat, longitude: lng)
        guard let last = lastLocation else {
            lastLocation = incoming
            return
        }
        let distanceMeters = incoming.distance(from: last)
        if distanceMeters > DMSConstants.movementThresholdMeters {
            lastMovedAt  = Date()
            lastLocation = incoming
            alertFired   = false
            cancelScheduledNotifications()
        }
    }

    /// Return current status dict for JS.
    @objc public func statusDict() -> [String: Any] {
        var dict: [String: Any] = [
            "isRunning":        isRunning,
            "intervalMinutes":  intervalMinutes,
            "alertFired":       alertFired,
        ]
        if isRunning {
            let elapsed = Date().timeIntervalSince(lastMovedAt)
            dict["elapsedSeconds"]   = Int(elapsed)
            dict["remainingSeconds"] = max(0, Int(Double(intervalMinutes) * 60.0 - elapsed))
        }
        if let loc = lastLocation {
            dict["lastLat"] = loc.coordinate.latitude
            dict["lastLng"] = loc.coordinate.longitude
        }
        return dict
    }

    // MARK: - Private: Alert flow

    private func fireAlert() {
        guard !alertFired else { return }
        alertFired = true

        // Haptic: UIImpactFeedbackGenerator (heavy)
        DispatchQueue.main.async {
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.prepare()
            // Fire 3 pulses with short delays
            generator.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                generator.impactOccurred()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    generator.impactOccurred()
                }
            }
        }

        // System sound (kSystemSoundID_Vibrate = 4095)
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)

        // Local notification (visible even when app is backgrounded)
        scheduleAlertNotification()

        // Notify JS layer
        delegate?.dmsManagerDidFireAlert(self)
        notifyStateChange()

        // Start 2-min escalation countdown
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.escalationTimer = Timer.scheduledTimer(
                withTimeInterval: DMSConstants.escalationTimeoutSeconds,
                repeats: false
            ) { [weak self] _ in
                self?.escalate()
            }
        }
    }

    private func escalate() {
        let hasLoc = lastLocation != nil
        let lat    = lastLocation?.coordinate.latitude  ?? 0
        let lng    = lastLocation?.coordinate.longitude ?? 0

        scheduleEscalationNotification(lat: lat, lng: lng, hasLocation: hasLoc)
        delegate?.dmsManagerDidEscalate(self, lat: lat, lng: lng, hasLocation: hasLoc)

        // Auto-stop DMS after escalation to prevent repeat alerts
        stop()
    }

    // MARK: - Private: Foreground timer

    private func startForegroundTimer() {
        foregroundTimer?.invalidate()
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.foregroundTimer = Timer.scheduledTimer(
                withTimeInterval: 30.0,
                repeats: true
            ) { [weak self] _ in
                self?.periodicCheck()
            }
        }
    }

    private func periodicCheck() {
        guard isRunning, !alertFired else { return }
        let elapsed   = Date().timeIntervalSince(lastMovedAt)
        let threshold = Double(intervalMinutes) * 60.0
        if elapsed >= threshold {
            fireAlert()
        }
    }

    // MARK: - Private: Location monitoring

    private func startLocationMonitoring() {
        let status = locationManager.authorizationStatus
        if status == .authorizedAlways {
            locationManager.startMonitoringSignificantLocationChanges()
        }
        // Also start standard updates for foreground accuracy
        locationManager.startUpdatingLocation()
    }

    private func stopLocationMonitoring() {
        locationManager.stopMonitoringSignificantLocationChanges()
        locationManager.stopUpdatingLocation()
    }

    // MARK: - Private: Background tasks

    private func scheduleBGTask() {
        let request = BGAppRefreshTaskRequest(identifier: DMSConstants.bgTaskIdentifier)
        let delay   = Double(intervalMinutes) * 60.0
        request.earliestBeginDate = Date(timeIntervalSinceNow: delay)
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            // Non-fatal: foreground timer and significant-location remain active
        }
    }

    private func handleBackgroundTask(_ task: BGAppRefreshTask) {
        // Re-schedule immediately so the next cycle is queued
        scheduleBGTask()

        task.expirationHandler = { [weak self] in
            // System is reclaiming time; mark complete
            task.setTaskCompleted(success: false)
            self?.notifyStateChange()
        }

        guard isRunning else {
            task.setTaskCompleted(success: true)
            return
        }

        let elapsed   = Date().timeIntervalSince(lastMovedAt)
        let threshold = Double(intervalMinutes) * 60.0

        if elapsed >= threshold, !alertFired {
            fireAlert()
        }

        task.setTaskCompleted(success: true)
    }

    // MARK: - Private: Notifications

    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { _, _ in }
    }

    private func scheduleAlertNotification() {
        let content        = UNMutableNotificationContent()
        content.title      = "⚠️ Are you OK?"
        content.body       = "TrailGuard hasn't detected movement. Tap to check in — escalation in 2 minutes."
        content.sound      = .defaultCritical
        content.categoryIdentifier = "DMS_ALERT"

        let trigger  = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request  = UNNotificationRequest(
            identifier: DMSConstants.alertNotificationId,
            content:    content,
            trigger:    trigger
        )
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }

    private func scheduleEscalationNotification(lat: Double, lng: Double, hasLocation: Bool) {
        let content   = UNMutableNotificationContent()
        content.title = "🆘 Emergency Alert Sent"
        let locStr    = hasLocation
            ? "Last GPS: \(String(format: "%.5f", lat)), \(String(format: "%.5f", lng))"
            : "Location unavailable"
        content.body  = "No response detected. Emergency contacts have been notified. \(locStr)"
        content.sound = .defaultCritical

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: DMSConstants.escalationNotificationId,
            content:    content,
            trigger:    trigger
        )
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }

    private func cancelScheduledNotifications() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: [DMSConstants.alertNotificationId,
                              DMSConstants.escalationNotificationId]
        )
    }

    // MARK: - Private: State

    private func notifyStateChange() {
        let info = statusDict()
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.delegate?.dmsManager(self, didChangeState: info)
        }
    }

    private func loadPersistedInterval() {
        let stored = UserDefaults.standard.integer(forKey: DMSConstants.intervalDefaultsKey)
        if DMSConstants.validIntervals.contains(stored) {
            intervalMinutes = stored
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension DeadMansSwitchManager: CLLocationManagerDelegate {

    public func locationManager(_ manager: CLLocationManager,
                                 didUpdateLocations locations: [CLLocation]) {
        guard let latest = locations.last, isRunning else { return }

        if let prev = lastLocation {
            let dist = latest.distance(from: prev)
            if dist > DMSConstants.movementThresholdMeters {
                lastMovedAt = Date()
                alertFired  = false
                cancelScheduledNotifications()
            }
        }
        lastLocation = latest
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedAlways, isRunning {
            manager.startMonitoringSignificantLocationChanges()
        }
    }

    public func locationManager(_ manager: CLLocationManager,
                                 didFailWithError error: Error) {
        // Non-fatal — timer-based DMS still works without GPS
    }
}
