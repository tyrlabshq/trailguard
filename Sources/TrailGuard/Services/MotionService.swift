// MotionService.swift
// TrailGuard — Services
//
// Wraps CoreMotion for crash detection.
// Gates accelerometer on CMMotionActivityManager to reduce battery drain —
// only active when device detects "automotive" motion.

import CoreMotion
import ComposableArchitecture
import Foundation

// MARK: - TCA Dependency Key

struct MotionServiceClient {
    /// Start crash detection with given G-force threshold.
    /// Returns AsyncStream of impact events (magnitude in G).
    var startCrashDetection: (_ threshold: Double) -> AsyncStream<Double>
    /// Stop crash detection (called when ride ends or DMS fires SOS)
    var stopCrashDetection: () -> Void
    /// Check if motion hardware is available
    var isAccelerometerAvailable: () -> Bool
}

// MARK: - Impact Event

struct ImpactEvent {
    let magnitude: Double       // G-force magnitude at peak
    let timestamp: Date
    let accelerationX: Double
    let accelerationY: Double
    let accelerationZ: Double
}

// MARK: - Live Implementation Shell

final class MotionService {

    static let shared = MotionService()

    private let motionManager = CMMotionManager()
    private let activityManager = CMMotionActivityManager()

    private var impactContinuation: AsyncStream<Double>.Continuation?
    private var isMonitoringActivity = false

    private init() {}

    // MARK: - Crash Detection Core

    /// Begin watching for high-G impacts.
    /// Only activates accelerometer when CMMotionActivityManager reports automotive activity.
    func startCrashDetection(threshold: Double) -> AsyncStream<Double> {
        AsyncStream { continuation in
            self.impactContinuation = continuation

            // TODO: Start activity monitoring to gate sensor
            // activityManager.startActivityUpdates(to: .main) { activity in
            //     let isAutomotive = activity?.automotive == true || activity?.unknown == true
            //     if isAutomotive && !self.motionManager.isAccelerometerActive {
            //         self.startAccelerometer(threshold: threshold)
            //     } else if !isAutomotive && self.motionManager.isAccelerometerActive {
            //         self.stopAccelerometer()
            //     }
            // }
        }
    }

    private func startAccelerometer(threshold: Double) {
        guard motionManager.isAccelerometerAvailable else { return }

        // TODO: Configure 100Hz update rate
        // motionManager.accelerometerUpdateInterval = 0.01

        // TODO: Start updates
        // motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, error in
        //     guard let acc = data?.acceleration else { return }
        //     let magnitude = sqrt(acc.x*acc.x + acc.y*acc.y + acc.z*acc.z)
        //     if magnitude > threshold {
        //         self?.evaluateImpact(magnitude: magnitude, data: acc)
        //     }
        // }
    }

    private func stopAccelerometer() {
        motionManager.stopAccelerometerUpdates()
    }

    /// Called when magnitude exceeds threshold.
    /// Requires velocity drop confirmation before flagging as crash.
    private func evaluateImpact(magnitude: Double, data: CMAcceleration) {
        // TODO: Check velocity drop via location speed
        // TODO: If both conditions met → yield to continuation
        // TODO: Start 500ms window to confirm velocity drop
    }

    func stopCrashDetection() {
        stopAccelerometer()
        activityManager.stopActivityUpdates()
        impactContinuation?.finish()
        impactContinuation = nil
    }
}
