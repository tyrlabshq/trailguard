// MotionService.swift
// TrailGuard — Services
//
// Wraps CoreMotion for crash detection.
// Samples accelerometer at 100Hz, filters for high-G impacts,
// and yields magnitude values exceeding the configured threshold.

import CoreMotion
import ComposableArchitecture
import Foundation

// MARK: - TCA Dependency Interface

struct MotionServiceClient {
    /// Start crash detection with given G-force threshold.
    /// Returns AsyncStream of impact events (magnitude in G).
    var startCrashDetection: @Sendable (_ threshold: Double) -> AsyncStream<Double>
    /// Stop crash detection (called when ride ends or DMS fires SOS)
    var stopCrashDetection: @Sendable () -> Void
    /// Check if motion hardware is available
    var isAccelerometerAvailable: @Sendable () -> Bool
    /// Current speed from location (set externally for velocity-drop check)
    var setCurrentSpeed: @Sendable (_ speedMPS: Double) -> Void
}

// MARK: - Dependency Key

private enum MotionServiceKey: DependencyKey {
    static let liveValue: MotionServiceClient = .live
    static let testValue: MotionServiceClient = .noop
}

extension DependencyValues {
    var motionService: MotionServiceClient {
        get { self[MotionServiceKey.self] }
        set { self[MotionServiceKey.self] = newValue }
    }
}

// MARK: - Impact Event

struct ImpactEvent {
    let magnitude: Double       // G-force magnitude at peak
    let timestamp: Date
    let accelerationX: Double
    let accelerationY: Double
    let accelerationZ: Double
}

// MARK: - Live Implementation

extension MotionServiceClient {
    static var live: Self {
        let service = MotionServiceLive()
        return Self(
            startCrashDetection: { threshold in
                service.startCrashDetection(threshold: threshold)
            },
            stopCrashDetection: {
                service.stopCrashDetection()
            },
            isAccelerometerAvailable: {
                service.motionManager.isAccelerometerAvailable
            },
            setCurrentSpeed: { speed in
                service.setCurrentSpeed(speed)
            }
        )
    }

    static var noop: Self {
        Self(
            startCrashDetection: { _ in AsyncStream { $0.finish() } },
            stopCrashDetection: {},
            isAccelerometerAvailable: { false },
            setCurrentSpeed: { _ in }
        )
    }
}

// MARK: - Live Service (Actor-isolated for thread safety)

private final class MotionServiceLive: @unchecked Sendable {
    let motionManager = CMMotionManager()
    private let activityManager = CMMotionActivityManager()
    private let operationQueue: OperationQueue = {
        let q = OperationQueue()
        q.name = "com.trailguard.motion"
        q.maxConcurrentOperationCount = 1
        return q
    }()

    private var impactContinuation: AsyncStream<Double>.Continuation?
    private var preImpactSpeed: Double = 0
    private var currentSpeed: Double = 0 // m/s from GPS
    private var lastImpactTime: Date?

    // Debounce: ignore impacts within 5 seconds of a previous one
    private let impactDebounceInterval: TimeInterval = 5.0

    func setCurrentSpeed(_ speedMPS: Double) {
        currentSpeed = max(0, speedMPS)
    }

    // MARK: - Crash Detection Core

    func startCrashDetection(threshold: Double) -> AsyncStream<Double> {
        AsyncStream { [weak self] continuation in
            guard let self else {
                continuation.finish()
                return
            }
            self.impactContinuation = continuation
            continuation.onTermination = { [weak self] _ in
                self?.stopCrashDetection()
            }
            self.startAccelerometer(threshold: threshold)
        }
    }

    private func startAccelerometer(threshold: Double) {
        guard motionManager.isAccelerometerAvailable else { return }

        // 100Hz sampling rate
        motionManager.accelerometerUpdateInterval = 0.01

        motionManager.startAccelerometerUpdates(to: operationQueue) { [weak self] data, error in
            guard let self, let acc = data?.acceleration else { return }

            // Compute total G-force magnitude (1G = ~9.81 m/s^2)
            // CMAcceleration reports in G already (1.0 = 1G at rest)
            let magnitude = sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z)

            if magnitude >= threshold {
                self.evaluateImpact(magnitude: magnitude)
            }

            // Track pre-impact speed: store speed before any spike
            if magnitude < 2.0 {
                self.preImpactSpeed = self.currentSpeed
            }
        }
    }

    private func evaluateImpact(magnitude: Double) {
        let now = Date()

        // Debounce rapid impacts
        if let last = lastImpactTime, now.timeIntervalSince(last) < impactDebounceInterval {
            return
        }

        // Velocity drop check: pre-impact speed should have been > 5 mph (2.24 m/s)
        // and current speed should be significantly lower (stopped or near-stopped)
        let preImpactMPH = preImpactSpeed * 2.23694
        let currentMPH = currentSpeed * 2.23694
        let hasVelocityDrop = preImpactMPH > 5.0 && currentMPH < preImpactMPH * 0.5

        // If moving fast enough and speed dropped, this looks like a real crash
        // Also fire if magnitude is extreme (>8G) regardless of velocity
        if hasVelocityDrop || magnitude >= 8.0 {
            lastImpactTime = now
            impactContinuation?.yield(magnitude)
        }
    }

    func stopCrashDetection() {
        motionManager.stopAccelerometerUpdates()
        impactContinuation?.finish()
        impactContinuation = nil
    }
}
